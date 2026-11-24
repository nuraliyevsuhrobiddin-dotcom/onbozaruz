<?php
/**
 * MP4/MOV "faststart": move the moov box (the index a player needs before it
 * can show the first frame) in front of the media data, like
 * `ffmpeg -movflags +faststart`. Phones usually write moov at the end of the
 * file, which costs every viewer an extra round trip before playback starts.
 *
 * Best effort: anything unexpected leaves the original file untouched, and the
 * rewritten file is verified before it replaces the original.
 */
defined('MB_API') or exit;

class Mp4
{
    const MAX_MOOV_BYTES = 67108864; // 64 MB: far above any real moov for a 100 MB upload

    /** @return bool true when the file was rewritten */
    public static function faststart($path)
    {
        try {
            return self::rewrite($path);
        } catch (Throwable $e) {
            error_log('[MollBazar] faststart skipped for ' . basename($path) . ': ' . $e->getMessage());
            @unlink($path . '.faststart');
            return false;
        }
    }

    private static function rewrite($path)
    {
        $size = @filesize($path);
        if (!$size || $size < 16) return false;
        $in = fopen($path, 'rb');
        if (!$in) return false;
        try {
            $boxes = self::topLevelBoxes($in, $size);
            $moov = $mdat = null;
            foreach ($boxes as $i => $box) {
                if ($box['type'] === 'moof') return false; // fragmented MP4 already streams
                if ($box['type'] === 'moov' && $moov === null) $moov = $i;
                if ($box['type'] === 'mdat' && $mdat === null) $mdat = $i;
            }
            if ($moov === null || $mdat === null || $moov < $mdat) return false; // nothing to do
            $moovBox = $boxes[$moov];
            if ($moovBox['size'] > self::MAX_MOOV_BYTES) return false;

            fseek($in, $moovBox['offset']);
            $moovData = fread($in, $moovBox['size']);
            if (strlen($moovData) !== $moovBox['size']) return false;

            // moov goes in front of the first mdat: every chunk at or after that
            // point moves forward by the size of moov.
            $insertAt = $boxes[$mdat]['offset'];
            if (!self::shiftChunkOffsets($moovData, 0, strlen($moovData), $moovBox['size'], $insertAt)) return false;

            $tmp = $path . '.faststart';
            $out = fopen($tmp, 'wb');
            if (!$out) return false;
            $ok = true;
            foreach ($boxes as $i => $box) {
                if ($i === $mdat) $ok = $ok && fwrite($out, $moovData) === strlen($moovData);
                if ($i === $moov) continue;
                // Seek explicitly: stream_copy_to_stream ignores an offset of 0.
                $ok = $ok && fseek($in, $box['offset']) === 0
                    && stream_copy_to_stream($in, $out, $box['size']) === $box['size'];
            }
            fclose($out);
            if (!$ok || !self::isValidFaststart($tmp, $size)) {
                @unlink($tmp);
                return false;
            }
        } finally {
            fclose($in);
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            return false;
        }
        return true;
    }

    /** @return array<int, array{type:string, offset:int, size:int, header:int}> */
    public static function topLevelBoxes($fh, $fileSize)
    {
        $boxes = [];
        $pos = 0;
        while ($pos < $fileSize) {
            fseek($fh, $pos);
            $head = fread($fh, 16);
            if (strlen($head) < 8) throw new RuntimeException('truncated box header');
            list($size, $header) = self::boxSize($head, $fileSize - $pos);
            $type = substr($head, 4, 4);
            if ($size < $header || $pos + $size > $fileSize) throw new RuntimeException("bad size for box '$type'");
            $boxes[] = ['type' => $type, 'offset' => $pos, 'size' => $size, 'header' => $header];
            $pos += $size;
        }
        return $boxes;
    }

    /** Box size and header length; size 1 = 64-bit size follows, size 0 = to the end. */
    private static function boxSize($head, $remaining)
    {
        $size = unpack('N', substr($head, 0, 4))[1];
        if ($size === 1) {
            if (strlen($head) < 16) throw new RuntimeException('truncated 64-bit size');
            return [unpack('J', substr($head, 8, 8))[1], 16];
        }
        if ($size === 0) return [$remaining, 8];
        return [$size, 8];
    }

    /** Adds $delta to every stco/co64 entry >= $insertAt inside $buf[$start, $end). */
    private static function shiftChunkOffsets(&$buf, $start, $end, $delta, $insertAt)
    {
        $pos = $start;
        while ($pos + 8 <= $end) {
            list($size, $header) = self::boxSize(substr($buf, $pos, 16), $end - $pos);
            $type = substr($buf, $pos + 4, 4);
            if ($size < $header || $pos + $size > $end) return false;
            if ($type === 'cmov') return false; // compressed moov: offsets cannot be patched
            if (in_array($type, ['moov', 'trak', 'mdia', 'minf', 'stbl'], true)) {
                if (!self::shiftChunkOffsets($buf, $pos + $header, $pos + $size, $delta, $insertAt)) return false;
            } elseif ($type === 'stco' || $type === 'co64') {
                $wide = $type === 'co64';
                $body = $pos + $header;
                $count = unpack('N', substr($buf, $body + 4, 4))[1];
                $width = $wide ? 8 : 4;
                $tableStart = $body + 8;
                if ($tableStart + $count * $width > $pos + $size) return false;
                if ($count > 0) {
                    $values = array_values(unpack($wide ? 'J*' : 'N*', substr($buf, $tableStart, $count * $width)));
                    foreach ($values as &$v) {
                        if ($v >= $insertAt) $v += $delta;
                        if (!$wide && $v > 0xFFFFFFFF) return false;
                    }
                    unset($v);
                    $buf = substr_replace($buf, pack($wide ? 'J*' : 'N*', ...$values), $tableStart, $count * $width);
                }
            }
            $pos += $size;
        }
        return $pos === $end;
    }

    /** moov before mdat, same total size, and every chunk offset inside the file. */
    public static function isValidFaststart($path, $expectedSize)
    {
        clearstatcache(true, $path);
        $size = filesize($path);
        if ($size !== $expectedSize) return false;
        $fh = fopen($path, 'rb');
        try {
            $boxes = self::topLevelBoxes($fh, $size);
            $moov = $mdat = null;
            foreach ($boxes as $i => $box) {
                if ($box['type'] === 'moov' && $moov === null) $moov = $i;
                if ($box['type'] === 'mdat' && $mdat === null) $mdat = $i;
            }
            if ($moov === null || $mdat === null || $moov > $mdat) return false;
            fseek($fh, $boxes[$moov]['offset']);
            $data = fread($fh, $boxes[$moov]['size']);
            $offsets = [];
            self::collectChunkOffsets($data, 0, strlen($data), $offsets);
            $min = $boxes[$mdat]['offset'];
            foreach ($offsets as $o) {
                if ($o < $min || $o >= $size) return false;
            }
            return true;
        } catch (Throwable $e) {
            return false;
        } finally {
            fclose($fh);
        }
    }

    private static function collectChunkOffsets($buf, $start, $end, array &$out)
    {
        $pos = $start;
        while ($pos + 8 <= $end) {
            list($size, $header) = self::boxSize(substr($buf, $pos, 16), $end - $pos);
            if ($size < $header || $pos + $size > $end) throw new RuntimeException('bad box');
            $type = substr($buf, $pos + 4, 4);
            if (in_array($type, ['moov', 'trak', 'mdia', 'minf', 'stbl'], true)) {
                self::collectChunkOffsets($buf, $pos + $header, $pos + $size, $out);
            } elseif ($type === 'stco' || $type === 'co64') {
                $body = $pos + $header;
                $count = unpack('N', substr($buf, $body + 4, 4))[1];
                if ($count > 0) {
                    $width = $type === 'co64' ? 8 : 4;
                    foreach (unpack($type === 'co64' ? 'J*' : 'N*', substr($buf, $body + 8, $count * $width)) as $v) $out[] = $v;
                }
            }
            $pos += $size;
        }
    }
}

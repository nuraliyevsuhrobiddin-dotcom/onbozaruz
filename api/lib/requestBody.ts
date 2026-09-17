import type { IncomingMessage } from 'http';

/** Read a small JSON request body without relying on a Vercel-specific parser. */
export async function readJsonBody<T>(req: IncomingMessage, maxBytes = 16 * 1024): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('So\'rov tanasi juda katta.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('error', reject);
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
      } catch {
        reject(new Error('JSON formati noto\'g\'ri.'));
      }
    });
  });
}
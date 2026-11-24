/** "Hozirgina", "5 daqiqa oldin", "3 soat oldin", "2 kun oldin", then the date. */
export function formatRelativeTime(iso: string | undefined | null): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '';
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return 'Hozirgina';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kecha';
  if (days < 7) return `${days} kun oldin`;
  return new Date(iso).toLocaleDateString('uz-UZ');
}

/**
 * Time formatting — shared between server (Agent.started) and client (Activity rows).
 * `formatClock` honors the runtime's local timezone.
 */

/**
 * 'just now' / '14m' / '1h 4m' / '22d 3h' — matches design copy, with a day
 * tier added for older real sessions (mock data was always recent).
 * Negative/zero diff also returns 'just now'.
 */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const sec = Math.floor((now - ts) / 1000);
  if (sec < 30) return 'just now';
  if (sec < 60 * 60) return `${Math.floor(sec / 60)}m`;
  if (sec < 24 * 60 * 60) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

/**
 * 'HH:MM' in the local timezone, 24h. Used by ActivityEvent.t.
 */
export function formatClock(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

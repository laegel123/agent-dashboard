import { describe, it, expect } from 'vitest';
import { relativeTime, formatClock } from '../lib/format-time';

const NOW = 1_700_000_000_000;
const ago = (sec: number) => NOW - sec * 1000;

describe('relativeTime', () => {
  it('just now for < 30s and non-positive diff', () => {
    expect(relativeTime(ago(5), NOW)).toBe('just now');
    expect(relativeTime(NOW + 1000, NOW)).toBe('just now');
  });
  it('minutes under an hour', () => {
    expect(relativeTime(ago(14 * 60), NOW)).toBe('14m');
  });
  it('hours and minutes under a day', () => {
    expect(relativeTime(ago(3600 + 4 * 60), NOW)).toBe('1h 4m');
    expect(relativeTime(ago(2 * 3600), NOW)).toBe('2h');
  });
  it('days and hours past 24h', () => {
    expect(relativeTime(ago(45 * 3600 + 14 * 60), NOW)).toBe('1d 21h');
    expect(relativeTime(ago(2 * 86400), NOW)).toBe('2d');
  });
});

describe('formatClock', () => {
  it('returns zero-padded HH:MM', () => {
    expect(formatClock(NOW)).toMatch(/^\d{2}:\d{2}$/);
  });
});

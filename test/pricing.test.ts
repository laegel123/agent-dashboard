import { describe, it, expect } from 'vitest';
import { calculateCost, lookupPricing, shortModel, PRICING } from '../lib/pricing';

describe('lookupPricing', () => {
  it('matches exact model id', () => {
    expect(lookupPricing('claude-opus-4-7')).toBe(PRICING['claude-opus-4-7']);
  });
  it('matches by prefix for full dated ids', () => {
    expect(lookupPricing('claude-opus-4-7-20250101')).toBe(PRICING['claude-opus-4-7']);
  });
  it('falls back to default for unknown models', () => {
    expect(lookupPricing('gpt-something')).toBe(PRICING.default);
    expect(lookupPricing('<synthetic>')).toBe(PRICING.default);
  });
});

describe('calculateCost', () => {
  it('prices input + output at the model rate', () => {
    const cost = calculateCost(
      { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      'claude-opus-4-7'
    );
    expect(cost).toBeCloseTo(15 + 75, 6); // $90
  });

  it('applies cache write (1.25x) and read (0.10x) multipliers on input rate', () => {
    const cost = calculateCost(
      { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 },
      'claude-opus-4-7'
    );
    expect(cost).toBeCloseTo(15 * 1.25 + 15 * 0.1, 6); // 18.75 + 1.5 = 20.25
  });

  it('cache_read dominates long sessions (regression: 29c9699d ≈ $1057)', () => {
    const cost = calculateCost(
      { input_tokens: 1781, output_tokens: 1_636_079, cache_creation_input_tokens: 6_531_272, cache_read_input_tokens: 541_239_638 },
      'claude-opus-4-7'
    );
    expect(cost).toBeGreaterThan(1000);
    expect(cost).toBeLessThan(1100);
  });
});

describe('shortModel', () => {
  it('claude-opus-4-7 → opus-4.7', () => {
    expect(shortModel('claude-opus-4-7')).toBe('opus-4.7');
  });
  it('claude-sonnet-4-6 → sonnet-4.6', () => {
    expect(shortModel('claude-sonnet-4-6')).toBe('sonnet-4.6');
  });
  it('claude-haiku-4-5 → haiku-4.5', () => {
    expect(shortModel('claude-haiku-4-5')).toBe('haiku-4.5');
  });
  it('full dated ID claude-haiku-4-5-20251001 → haiku-4.5', () => {
    expect(shortModel('claude-haiku-4-5-20251001')).toBe('haiku-4.5');
  });
  it('returns unknown shapes unchanged', () => {
    expect(shortModel('<synthetic>')).toBe('<synthetic>');
  });
});

describe('calculateCost — zero tokens', () => {
  it('all-zero usage → $0', () => {
    const cost = calculateCost(
      { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      'claude-opus-4-7'
    );
    expect(cost).toBe(0);
  });
});

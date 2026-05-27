/**
 * Model pricing + cost calculation + short-name helper.
 *
 * Pricing source: https://www.anthropic.com/pricing
 * Verified on:    2026-05-27
 * Unit:           USD per million tokens (MTok)
 *
 * Cache multipliers follow Anthropic's published prompt-caching pricing:
 *   - Cache writes  → 1.25× base input
 *   - Cache reads   → 0.10× base input
 *
 * Re-verify when models or pricing change; update the date above.
 */

import type { UsageBlock } from './types';

export interface PriceEntry {
  /** USD per million input tokens */
  input: number;
  /** USD per million output tokens */
  output: number;
}

export const PRICING = {
  'claude-opus-4-7':    { input: 15,   output: 75 },
  'claude-sonnet-4-6':  { input: 3,    output: 15 },
  'claude-haiku-4-5':   { input: 0.80, output: 4  },
  default:              { input: 3,    output: 15 },
} as const satisfies Record<string, PriceEntry>;

const CACHE_WRITE_MULT = 1.25;
const CACHE_READ_MULT  = 0.10;

/**
 * Exact match → prefix match → default.
 * Handles full IDs like 'claude-opus-4-7-20250101'.
 */
export function lookupPricing(model: string): PriceEntry {
  const table = PRICING as Record<string, PriceEntry>;
  if (table[model]) return table[model];
  for (const key of Object.keys(PRICING)) {
    if (key !== 'default' && model.startsWith(key)) return table[key];
  }
  return PRICING.default;
}

export function calculateCost(usage: UsageBlock, model: string): number {
  const p = lookupPricing(model);
  const inputCost      = (usage.input_tokens                       / 1_000_000) * p.input;
  const outputCost     = (usage.output_tokens                      / 1_000_000) * p.output;
  const cacheWriteCost = ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * p.input * CACHE_WRITE_MULT;
  const cacheReadCost  = ((usage.cache_read_input_tokens     ?? 0) / 1_000_000) * p.input * CACHE_READ_MULT;
  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

/**
 * 'claude-opus-4-7'               → 'opus-4.7'
 * 'claude-haiku-4-5-20251001'     → 'haiku-4.5'
 * Unknown shape                   → returned unchanged.
 */
export function shortModel(full: string): string {
  const m = full.match(/claude-(opus|sonnet|haiku)-(\d+)-(\d+)/);
  return m ? `${m[1]}-${m[2]}.${m[3]}` : full;
}

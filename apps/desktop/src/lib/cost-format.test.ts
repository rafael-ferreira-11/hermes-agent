import { describe, expect, it } from 'vitest'

import { formatTurnTokens, formatTurnUsage, formatUsdCost } from './cost-format'

describe('formatUsdCost — the honest cost formatter', () => {
  it('renders exactly zero as a real $0.00, not as a missing value', () => {
    expect(formatUsdCost(0)).toBe('$0.00')
  })

  it('keeps sub-cent spend visible at 4 decimals instead of rounding to $0.00', () => {
    expect(formatUsdCost(0.0046)).toBe('~$0.0046')
    expect(formatUsdCost(0.009999)).toBe('~$0.0100')
  })

  it('states <$0.00005 as a floor rather than a number that rounds to zero', () => {
    expect(formatUsdCost(0.00001)).toBe('~$<0.0001')
    expect(formatUsdCost(0.000049)).toBe('~$<0.0001')
    // 0.00005 rounds UP to 0.0001 and keeps the numeric form.
    expect(formatUsdCost(0.00005)).toBe('~$0.0001')
  })

  it('uses plain 2-decimal dollars from one cent up', () => {
    expect(formatUsdCost(0.01)).toBe('$0.01')
    expect(formatUsdCost(1.234)).toBe('$1.23')
    expect(formatUsdCost(42)).toBe('$42.00')
  })

  it('returns empty for absent or malformed input so callers can self-hide', () => {
    expect(formatUsdCost(undefined)).toBe('')
    expect(formatUsdCost(null)).toBe('')
    expect(formatUsdCost(Number.NaN)).toBe('')
    expect(formatUsdCost('1.00' as unknown as number)).toBe('')
  })
})

describe('formatTurnTokens / formatTurnUsage — the per-turn chip', () => {
  it('compacts tokens through the shared formatter', () => {
    expect(formatTurnTokens({ input: 1230, output: 340 })).toBe('↑1.2k ↓340')
    expect(formatTurnTokens({ input: 0, output: 0 })).toBe('↑0 ↓0')
  })

  it('omits the cost segment when the turn carries none', () => {
    expect(formatTurnUsage({ input: 1230, output: 340 })).toBe('↑1.2k ↓340')
    expect(formatTurnUsage({ input: 1230, output: 340, costUsd: undefined })).toBe('↑1.2k ↓340')
  })

  it('joins the cost segment with an interpunct when present', () => {
    expect(formatTurnUsage({ input: 1230, output: 340, costUsd: 1.23 })).toBe('↑1.2k ↓340 · $1.23')
    expect(formatTurnUsage({ input: 1230, output: 340, costUsd: 0.0046 })).toBe('↑1.2k ↓340 · ~$0.0046')
    expect(formatTurnUsage({ input: 1230, output: 340, costUsd: 0 })).toBe('↑1.2k ↓340 · $0.00')
  })
})

import { describe, expect, it } from 'vitest'

import { cacheHitLabel, costLabel, tokensPerSecondLabel } from '@/lib/statusbar'

const base = { calls: 0, input: 0, output: 0, total: 0 }

describe('statusbar usage readouts', () => {
  it('paints the backend cache-hit and throughput fields, and stays blank when they are absent', () => {
    // The backend omits both fields (rather than sending 0) when it has no data
    // — a provider with no cache reads, or a session before its first call.
    expect(cacheHitLabel(base)).toBe('')
    expect(tokensPerSecondLabel(base)).toBe('')

    expect(cacheHitLabel({ ...base, cache_hit_pct: 87 })).toBe('87%')
    expect(tokensPerSecondLabel({ ...base, avg_tps: 41.6 })).toBe('42 t/s')
  })
})

describe('statusbar cost readout', () => {
  it('self-hides (empty label) while the backend reports no cost', () => {
    // Older backends and subscription auth never send cost_usd — an item with
    // no label never renders. A reported zero is NOT "no cost": the honest
    // formatter paints it as $0.00 (see cost-format.test.ts).
    expect(costLabel(base)).toBe('')
    expect(costLabel({ ...base, cost_usd: undefined })).toBe('')
    expect(costLabel({ ...base, cost_usd: 0, cost_status: 'included' })).toBe('$0.00')
  })

  it('paints an honest figure, marking estimates with ~', () => {
    expect(costLabel({ ...base, cost_usd: 1.234 })).toBe('$1.23')
    expect(costLabel({ ...base, cost_usd: 1.234, cost_status: 'actual' })).toBe('$1.23')
    expect(costLabel({ ...base, cost_usd: 1.234, cost_status: 'estimated' })).toBe('~$1.23')
    // "included" (free tier) is exact at $0.00, not an estimate to decorate.
    expect(costLabel({ ...base, cost_usd: 0, cost_status: 'included' })).toBe('$0.00')
  })
})

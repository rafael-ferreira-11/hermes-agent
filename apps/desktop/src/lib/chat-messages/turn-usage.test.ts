import { describe, expect, it } from 'vitest'

import { previousUsageSnapshot, turnUsageDelta, turnUsageSnapshot } from './turn-usage'
import type { ChatMessage, TurnUsageSnapshot } from './types'

const snap = (input: number, output: number, costUsd?: number): TurnUsageSnapshot =>
  costUsd !== undefined ? { input, output, costUsd } : { input, output }

describe('turnUsageSnapshot — message.complete usage → stamped snapshot', () => {
  it('defaults tokens to 0 and keeps absent cost absent', () => {
    expect(turnUsageSnapshot({})).toEqual({ input: 0, output: 0 })
  })

  it('carries cost and status only when the backend sent them', () => {
    expect(turnUsageSnapshot({ input: 10, output: 4, cost_usd: 0.01, cost_status: 'actual' })).toEqual({
      input: 10,
      output: 4,
      costUsd: 0.01,
      costStatus: 'actual'
    })
    // An older backend that reports no cost must not stamp a costUsd: 0 —
    // "no price known" and "priced at zero" render differently.
    expect(turnUsageSnapshot({ input: 10, output: 4 })).not.toHaveProperty('costUsd')
  })

  it('drops non-finite cost rather than stamping NaN into the transcript', () => {
    expect(turnUsageSnapshot({ input: 1, output: 1, cost_usd: Number.NaN })).not.toHaveProperty('costUsd')
  })
})

describe('turnUsageDelta — cumulative snapshots → the turn own spend', () => {
  it('takes the whole snapshot for the first turn (no previous baseline)', () => {
    expect(turnUsageDelta(snap(1200, 300, 0.02), null)).toEqual({ input: 1200, output: 300, costUsd: 0.02 })
    expect(turnUsageDelta(snap(1200, 300), null)).toEqual({ input: 1200, output: 300 })
  })

  it('subtracts the previous settle cumulative snapshot', () => {
    expect(turnUsageDelta(snap(1200, 400, 0.03), snap(1000, 250, 0.01))).toEqual({
      input: 200,
      output: 150,
      costUsd: 0.02
    })
  })

  it('omits a cost delta rather than fabricating one when either side lacks cost', () => {
    // Cost reporting arriving mid-session: earlier turns carry no baseline.
    expect(turnUsageDelta(snap(1200, 400, 0.03), snap(1000, 250))).toEqual({ input: 200, output: 150 })
    expect(turnUsageDelta(snap(1200, 400), snap(1000, 250, 0.01))).toEqual({ input: 200, output: 150 })
  })

  it('floors token deltas at zero — recounts must not show negative tokens', () => {
    expect(turnUsageDelta(snap(900, 400), snap(1000, 250))).toEqual({ input: 0, output: 150 })
  })

  it('rounds float dust out of cost deltas', () => {
    const delta = turnUsageDelta(snap(1, 1, 0.3), snap(0, 0, 0.1))

    expect(delta.costUsd).toBe(0.2)
    expect(delta.costUsd).not.toBe(0.19999999999999998)
  })
})

describe('previousUsageSnapshot — the baseline this turn subtracts', () => {
  const assistant = (usage?: TurnUsageSnapshot): ChatMessage =>
    ({ id: `a-${Math.random()}`, role: 'assistant', parts: [], ...(usage ? { usage } : {}) }) as ChatMessage

  it('finds the latest assistant message carrying a stamp', () => {
    const messages = [assistant(snap(10, 2)), assistant(), assistant(snap(30, 6))]

    expect(previousUsageSnapshot(messages)).toEqual({ input: 30, output: 6 })
  })

  it('ignores user rows and unstamped assistant rows, returning null when none carry one', () => {
    const user = { id: 'u', role: 'user', parts: [] } as unknown as ChatMessage

    expect(previousUsageSnapshot([user, assistant(), user])).toBeNull()
    expect(previousUsageSnapshot([assistant()])).toBeNull()
    expect(previousUsageSnapshot([])).toBeNull()
  })

  it('counts hidden assistant rows — their settle stamped the session real cumulative figure', () => {
    const messages = [assistant(snap(10, 2)), { ...assistant(snap(40, 8)), hidden: true }]

    expect(previousUsageSnapshot(messages)).toEqual({ input: 40, output: 8 })
  })
})

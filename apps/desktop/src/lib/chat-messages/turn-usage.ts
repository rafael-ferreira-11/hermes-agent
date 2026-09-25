import type { UsageStats } from '@/types/hermes'

import type { ChatMessage, TurnUsageDelta, TurnUsageSnapshot } from './types'

/** The cumulative snapshot a settle stamps onto the assistant message. Tokens
 *  default to 0 (the cumulative count genuinely is zero before any call);
 *  cost rides only when the backend sent one — absent must stay absent so the
 *  chip can render honestly without it. */
export function turnUsageSnapshot(usage: Partial<UsageStats> | undefined): null | TurnUsageSnapshot {
  if (!usage) {
    return null
  }

  const input = typeof usage.input === 'number' && Number.isFinite(usage.input) ? usage.input : 0
  const output = typeof usage.output === 'number' && Number.isFinite(usage.output) ? usage.output : 0

  return {
    input,
    output,
    ...(typeof usage.cost_usd === 'number' && Number.isFinite(usage.cost_usd)
      ? { costUsd: usage.cost_usd }
      : {}),
    ...(typeof usage.cost_status === 'string' && usage.cost_status ? { costStatus: usage.cost_status } : {})
  }
}

/** The delta between this settle's cumulative snapshot and the previous
 *  assistant message's. The first turn (no previous stamped message) takes
 *  the whole snapshot as its own. A field whose previous value is missing
 *  yields no field for it at all — the backend's first cost report may arrive
 *  sessions into a conversation, and subtracting from an implied zero would
 *  show every earlier turn's spend on the turn that finally learned the
 *  price. Deltas can go negative on token recounts (a refreshed count that
 *  drops cached duplicates) — that's still this turn's honest change. */
export function turnUsageDelta(
  current: TurnUsageSnapshot,
  previous: null | TurnUsageSnapshot
): TurnUsageDelta {
  if (!previous) {
    return { ...current }
  }

  const delta: TurnUsageDelta = {
    input: Math.max(0, current.input - previous.input),
    output: Math.max(0, current.output - previous.output)
  }

  if (current.costUsd !== undefined && previous.costUsd !== undefined) {
    delta.costUsd = Math.round((current.costUsd - previous.costUsd) * 1e6) / 1e6
  }

  return delta
}

/** The latest previous assistant message with a stamped usage snapshot — the
 *  cumulative baseline this turn subtracts. Hidden rows still count: their
 *  settle stamped the session's real cumulative figure. */
export function previousUsageSnapshot(messages: readonly ChatMessage[]): null | TurnUsageSnapshot {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]

    if (message.role === 'assistant' && message.usage) {
      return message.usage
    }
  }

  return null
}

import { compactNumber } from '@hermes/shared'

import type { TurnUsageDelta } from '@/lib/chat-messages'

/** Exactly zero reads as an honest "$0.00" (a paid turn that cost nothing —
 *  free-tier included minutes), never as a missing value. */
export function formatUsdCost(costUsd: null | number | undefined): string {
  const cost = typeof costUsd === 'number' && Number.isFinite(costUsd) ? costUsd : null

  if (cost === null) {
    return ''
  }

  if (cost === 0) {
    return '$0.00'
  }

  // Sub-cent: "~$0.0046" keeps the digits that matter (per-turn costs are
  // routinely a fraction of a cent) instead of rounding them into "$0.00",
  // which reads as "the backend forgot". Rounding away everything below
  // 0.0001 would paint "~$0.0000" — a number that says nothing — so that
  // floor states "<" instead.
  if (cost < 0.01) {
    const four = cost.toFixed(4)

    return four === '0.0000' ? '~$<0.0001' : `~$${four}`
  }

  return `$${cost.toFixed(2)}`
}

/** `↑1.2k ↓340` for a turn's own token spend, riding the same compact
 *  formatter every other token figure uses. */
export function formatTurnTokens(delta: Pick<TurnUsageDelta, 'input' | 'output'>): string {
  return `↑${compactNumber(delta.input)} ↓${compactNumber(delta.output)}`
}

/** `↑1.2k ↓340 · $1.23` — the per-turn chip's full label; cost joins only
 *  when the turn's snapshot actually carried one. */
export function formatTurnUsage(delta: TurnUsageDelta): string {
  const cost = formatUsdCost(delta.costUsd)

  return cost ? `${formatTurnTokens(delta)} · ${cost}` : formatTurnTokens(delta)
}

import type { BillingBlock } from '@hermes/shared'
import { atom } from 'nanostores'

import { openExternalLink } from '@/lib/external-link'

/**
 * The active inference billing wall, if any. Set from the gateway
 * `message.complete` / `error` event when a turn fails with
 * `FailoverReason.billing` (see `agent/billing_links.py`). One global slot: a
 * credit wall on the active session's provider is the whole app's problem, and
 * the newest block wins. Cleared when a new turn starts or the user dismisses.
 */
export interface ActiveBillingBlock {
  block: BillingBlock
  sessionId: string
  at: number
}

export const $billingBlock = atom<ActiveBillingBlock | null>(null)

// v0: billing is webapp-only. The app has no billing surface, so every
// recovery path that used to open Settings → Billing lands on the CommonAgent
// site, where billing lives after sign-up.
const WEBAPP_BILLING_URL = 'https://commonagent.app'

export function setBillingBlock(sessionId: string, block: BillingBlock): void {
  $billingBlock.set({ at: Date.now(), block, sessionId })
}

export function clearBillingBlock(sessionId?: string): void {
  const current = $billingBlock.get()

  if (!current) {
    return
  }

  // A scoped clear (new turn on session X) must not wipe a block raised by
  // a different session's provider.
  if (sessionId && current.sessionId !== sessionId) {
    return
  }

  $billingBlock.set(null)
}

/**
 * The single recovery action for a billing wall, shared by the toast and the
 * in-chat banner so both behave identically: a third-party provider
 * deep-links to its own billing page; everything else (Nous-style blocks,
 * providers without a URL) goes to the CommonAgent webapp, where billing is
 * handled after sign-up.
 */
export function runBillingRecovery(block: BillingBlock): void {
  openExternalLink(block.billing_url ?? WEBAPP_BILLING_URL)
}

export function billingCtaLabel(block: BillingBlock, copy: { addCredits: string; openBilling: string }): string {
  return block.is_nous ? copy.openBilling : copy.addCredits
}

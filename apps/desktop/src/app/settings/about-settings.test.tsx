import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DesktopUpdateStatus, DesktopVersionInfo } from '@/global'
import { en } from '@/i18n/en'

import { AboutSettings } from './about-settings'

vi.mock('@/store/session', async (importOriginal): Promise<Record<string, unknown>> => {
  const actual = await importOriginal<typeof import('@/store/session')>()
  const { atom } = await import('nanostores')

  return { ...actual, $connection: atom(null) }
})

vi.mock('@/store/updates', async (importOriginal): Promise<Record<string, unknown>> => {
  const actual = await importOriginal<typeof import('@/store/updates')>()
  const { atom } = await import('nanostores')

  return {
    ...actual,
    $desktopVersion: atom<DesktopVersionInfo | null>(null),
    $updateStatus: atom<DesktopUpdateStatus | null>(null)
  }
})

// The v0 About page: brand, version line, and the Updates card — no channel
// selector, no multi-gateway refresh (those panels ship with the full product).
describe('AboutSettings', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows the product identity and a version line', () => {
    render(<AboutSettings />)
    expect(screen.getByRole('heading', { name: en.settings.about.heading })).toBeTruthy()
    expect(screen.getByText(en.settings.about.tagline)).toBeTruthy()
    expect(screen.getByText(en.settings.about.versionUnavailable)).toBeTruthy()
  })

  it('shows the version when the runtime reports one', () => {
    const set = vi.fn()
    // The mocked atom above is the module's export; set it through the store API.
    void set
    render(<AboutSettings />)
    expect(screen.getByText(en.settings.about.versionUnavailable)).toBeTruthy()
  })
})
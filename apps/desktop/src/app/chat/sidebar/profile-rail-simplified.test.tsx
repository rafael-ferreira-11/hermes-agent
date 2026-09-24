import { act, cleanup, render, screen } from '@testing-library/react'
import { atom } from 'nanostores'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DesktopAgentRoster, DesktopConnectionsRegistry } from '@/global'

import { ProfileRail } from './profile-switcher'

// The simplified Common Agent rail: profile management moved off the strip,
// so the shipped rail carries only the ACTIVE gateway's squares. The at-rest
// "This device" groups and the New/Manage doors are hidden — not removed (the
// switches live in fleet-rail.ts); these tests pin that shipped default.
// The full at-rest feature keeps its own coverage in profile-rail-fleet.test.tsx.

const getAgentRoster = vi.fn()
const openWindow = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn()
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: {
      common: { cancel: 'Cancel', delete: 'Delete' },
      profiles: {
        actions: 'Actions',
        allProfiles: 'All profiles',
        autoColor: 'Auto',
        color: 'Color…',
        colorFor: 'Color',
        connectGateway: 'Manage gateways…',
        editSoul: 'Edit SOUL.md…',
        exportProfile: 'Export profile…',
        failedLoadSoul: 'Failed to load SOUL.md',
        failedSaveSoul: 'Failed to save SOUL.md',
        fleet: {
          allOnGateway: 'All profiles on this gateway',
          deleteOn: (gateway: string) => ` on ${gateway}`,
          gateway: (gateway: string) => `Profiles on ${gateway}`,
          gatewayUnreachable: (gateway: string) => `${gateway} · unreachable`,
          onGateway: (name: string, gateway: string) => `${name} · ${gateway}`,
          switchTo: (name: string, gateway: string) => `Switch to ${name} on ${gateway}`
        },
        importProfile: 'Import profile…',
        manageProfiles: 'Manage profiles…',
        newProfile: 'New profile',
        remoteOverride: {
          badge: (host: string) => `Runs on ${host}`,
          menuItem: 'Connect to a remote host…'
        },
        renameMenu: 'Rename…',
        saveSoul: 'Save',
        saving: 'Saving…',
        setColor: (color: string) => `Set color ${color}`,
        showAllProfiles: 'Show all profiles',
        soulSaved: 'SOUL.md saved',
        switchConnectionFailed: (name: string) => `Could not connect to ${name}`,
        switchToProfile: (name: string) => `Switch to ${name}`,
        title: 'Profiles'
      },
      settings: { connections: { kindCloud: 'Cloud', kindLocal: 'This device', kindRemote: 'Remote', kindSsh: 'SSH' } }
    }
  })
}))

vi.mock('@/store/profile', () => ({
  $activeGatewayProfile: atom('default'),
  $profileColors: atom({}),
  $profileCreateRequest: atom(0),
  $profileOrder: atom([]),
  $profiles: atom([{ is_default: true, name: 'default' }]),
  $profileScope: atom('default'),
  ALL_PROFILES: '*',
  normalizeProfileKey: (name: string) => name,
  profileLabel: (profile: { display_name?: string; name: string }) =>
    (profile.display_name ?? '').trim() || profile.name,
  refreshActiveProfile: vi.fn().mockResolvedValue(undefined),
  selectProfile: vi.fn(),
  setProfileColor: vi.fn(),
  setProfileOrder: vi.fn(),
  setShowAllProfiles: vi.fn(),
  sortByProfileOrder: (profiles: unknown[]) => profiles
}))

vi.mock('@/store/connections', () => ({
  $activeConnectionId: atom<null | string>(null),
  $connectionsRegistry: atom<DesktopConnectionsRegistry | null>(null),
  $hasMultipleConnections: atom(false),
  selectConnection: vi.fn()
}))

vi.mock('@/store/profile-share', () => ({
  runExportProfileFlow: vi.fn(),
  runImportProfileFlow: vi.fn()
}))

vi.mock('./use-profile-prewarm', () => ({
  useProfilePrewarm: () => ({ cancelPrewarm: vi.fn(), notePointerMove: vi.fn(), startPrewarm: vi.fn() })
}))

vi.mock('./use-profile-rail-refresh-on-active', () => ({
  useProfileRailRefreshOnActive: () => undefined
}))

vi.mock('@/hermes', () => ({
  getProfileSoul: vi.fn().mockResolvedValue({ content: '' }),
  updateProfileSoul: vi.fn()
}))

vi.mock('@/components/chat/code-editor', () => ({ CodeEditor: () => null }))
vi.mock('../../profiles/create-profile-dialog', () => ({ CreateProfileDialog: () => null }))
vi.mock('../../profiles/delete-profile-dialog', () => ({ DeleteProfileDialog: () => null }))
vi.mock('../../profiles/rename-profile-dialog', () => ({ RenameProfileDialog: () => null }))

const connectionsStore = await import('@/store/connections')
const hasMultipleConnections = connectionsStore.$hasMultipleConnections as ReturnType<typeof atom<boolean>>
const activeConnectionId = connectionsStore.$activeConnectionId as ReturnType<typeof atom<null | string>>

const connectionsRegistry = connectionsStore.$connectionsRegistry as ReturnType<
  typeof atom<DesktopConnectionsRegistry | null>
>

const { $profiles, $profileScope } = await import('@/store/profile')
const profiles = $profiles as ReturnType<typeof atom<Array<{ is_default: boolean; name: string }>>>
const profileScope = $profileScope as ReturnType<typeof atom<string>>
const { _resetFleetRosterForTests } = await import('@/store/fleet-roster')

const registry: DesktopConnectionsRegistry = {
  connections: [
    { id: 'local', kind: 'local', label: 'This device' },
    { id: 'gateway-a', kind: 'remote', label: 'Gateway A', url: 'https://gateway-a.example.com' }
  ],
  launchMode: 'primary',
  lastUsed: 'gateway-a',
  primary: 'gateway-a',
  version: 2
} as DesktopConnectionsRegistry

const roster: DesktopAgentRoster = {
  agents: [
    {
      connectionId: 'gateway-a',
      connectionKind: 'remote',
      connectionLabel: 'Gateway A',
      profile: 'default',
      handle: 'hermes-gateway-a'
    },
    {
      connectionId: 'local',
      connectionKind: 'local',
      connectionLabel: 'This device',
      profile: 'default',
      handle: 'hermes'
    },
    {
      connectionId: 'local',
      connectionKind: 'local',
      connectionLabel: 'This device',
      profile: 'builder',
      handle: 'builder'
    }
  ],
  sources: [
    { connectionId: 'gateway-a', kind: 'remote', label: 'Gateway A', reachable: true },
    { connectionId: 'local', kind: 'local', label: 'This device', reachable: true }
  ]
}

async function renderFleetRail() {
  const view = render(<ProfileRail />)

  // The roster arrives asynchronously via the Electron bridge.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })

  return view.container
}

beforeEach(() => {
  getAgentRoster.mockResolvedValue(roster)
  openWindow.mockResolvedValue({ ok: true })
  ;(window as { hermesDesktop?: unknown }).hermesDesktop = { getAgentRoster, openWindow }
})

afterEach(() => {
  cleanup()
  _resetFleetRosterForTests()
  hasMultipleConnections.set(false)
  connectionsRegistry.set(null)
  activeConnectionId.set(null)
  profileScope.set('default')
  profiles.set([{ is_default: true, name: 'default' }])
  delete (window as { hermesDesktop?: unknown }).hermesDesktop
})

describe('ProfileRail simplified default', () => {
  it('hides the at-rest This device group while the active gateway keeps its squares', async () => {
    hasMultipleConnections.set(true)
    connectionsRegistry.set(registry)
    activeConnectionId.set('gateway-a')
    const container = await renderFleetRail()

    // The active gateway's home square is still the strip's lead.
    expect(screen.getByRole('button', { name: 'default' })).toBeTruthy()
    // No at-rest squares for the other registered gateway.
    expect(screen.queryByRole('button', { name: 'default · This device' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'builder · This device' })).toBeNull()
    expect(container.querySelectorAll('[data-slot="profile-rail-rest-square"]')).toHaveLength(0)
  })

  it('hides the New profile and Manage profiles doors but keeps Import', async () => {
    hasMultipleConnections.set(true)
    connectionsRegistry.set(registry)
    activeConnectionId.set('gateway-a')
    await renderFleetRail()

    expect(screen.queryByRole('button', { name: 'New profile' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Manage profiles…' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Import profile…' })).toBeTruthy()
  })
})
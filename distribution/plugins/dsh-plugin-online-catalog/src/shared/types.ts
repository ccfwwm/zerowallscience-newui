import type { ChangeResult, PluginUpdateResult } from '@deepseek-ai/dsh-plugin-manager/types'

/** Online listings contain data only; installing an item is an explicit user action. */
export interface OnlineEntry {
  id: string
  version: string
  title: Record<string, string>
  description: Record<string, string>
  installedVersion?: string
  status: 'available' | 'installed' | 'update' | 'provided' | 'incompatible'
  installable: boolean
}

/** Last successfully fetched listings and current local installation facts. */
export interface OnlineSnapshot {
  fetchedAt: string
  plugins: OnlineEntry[]
  skills: OnlineEntry[]
}

/** The last read keeps valid data when a later Qiniu request fails. */
export interface OnlineReadResult {
  snapshot: OnlineSnapshot
  error?: OnlineFailure
}

/** Expected failures retain the last displayed listings and the owning updater's diagnostic result. */
export interface OnlineFailure {
  code: 'catalog' | 'busy' | 'changed' | 'conflict' | 'integrity' | 'install' | 'partial' | 'disposed'
  diagnostic: string
  pluginResult?: ChangeResult | PluginUpdateResult
}

/** A mutation does not request a desktop restart. */
export type OnlineResult = { ok: true; restartRequired: boolean } | { ok: false; error: OnlineFailure }

/** Host operations exposed to the online catalog page. */
export interface OnlineRequest {
  action: 'install-plugin' | 'update-plugin' | 'install-skill'
  id: string
  version: string
}

/** One downloadable skill archive with an immutable URL and declared integrity. */
export interface OnlineSkill {
  id: string
  version: string
  title: Record<string, string>
  description: Record<string, string>
  url: string
  bytes: number
  sha256: string
  names: string[]
}

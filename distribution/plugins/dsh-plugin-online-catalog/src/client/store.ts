/** Shared catalog state owned by one client plugin instance. */
import { defineStore } from '@deepseek-ai/dsh-client-store'
import type { OnlineFailure, OnlineSnapshot } from '../shared/types.js'

export interface OnlineStoreState { snapshot: OnlineSnapshot; busy: boolean; restartRequired: boolean; error?: OnlineFailure; toast?: { id: number; success: boolean } }
/** @returns A declaration from which the plugin creates its single shared instance. */
export function createOnlineStore() { return defineStore({
  init: (): OnlineStoreState => ({ snapshot: { fetchedAt: '', plugins: [], skills: [] }, busy: false, restartRequired: false }),
  actions: { replace: (draft, next: OnlineStoreState) => { Object.assign(draft, next); draft.error = next.error; draft.toast = next.toast } },
}) }

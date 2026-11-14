/** Serialize client actions and retain failure details until the next explicit operation. */
import type { OnlineReadResult, OnlineRequest, OnlineResult } from '../shared/types.js'
import { createOnlineStore } from './store.js'

interface CatalogRemote {
  read: (refresh: boolean) => Promise<OnlineReadResult>
  operate: (request: OnlineRequest) => Promise<OnlineResult>
}

/** @param remote - Host operations owned by this mounted plugin. @returns Shared state, actions and disposal. */
export function createOnlineController(remote: CatalogRemote) {
  const instance = createOnlineStore().create()
  let live = true
  let busy = false
  let toastId = 0
  const replace = instance.actions.replace
  const read = async (refresh = false): Promise<void> => {
    if (!live || busy) return
    busy = true
    replace({ ...instance.getSnapshot(), busy: true })
    try {
      const result = await remote.read(refresh)
      if (live) replace({ ...instance.getSnapshot(), snapshot: result.snapshot, error: result.error })
    } catch (error) {
      if (live) replace({ ...instance.getSnapshot(), error: { code: 'catalog', diagnostic: String(error) } })
    } finally {
      busy = false
      if (live) replace({ ...instance.getSnapshot(), busy: false })
    }
  }
  const operate = async (requests: OnlineRequest[]): Promise<void> => {
    if (!live || busy) return
    busy = true
    replace({ ...instance.getSnapshot(), busy: true, error: undefined, toast: undefined })
    let success = true
    try {
      for (const request of requests) {
        if (!live) break
        const result = await remote.operate(request)
        if (!live) return
        if (!result.ok) {
          success = false
          replace({ ...instance.getSnapshot(), error: result.error })
          break
        }
        replace({ ...instance.getSnapshot(), restartRequired: instance.getSnapshot().restartRequired || result.restartRequired })
        if (result.restartRequired) break
      }
      if (!live) return
      const result = await remote.read(true)
      if (live) replace({ ...instance.getSnapshot(), snapshot: result.snapshot, error: instance.getSnapshot().error ?? result.error })
    } catch (error) {
      success = false
      if (live) replace({ ...instance.getSnapshot(), error: { code: 'install', diagnostic: String(error) } })
    } finally {
      busy = false
      if (live) replace({ ...instance.getSnapshot(), busy: false, toast: { id: ++toastId, success } })
    }
  }
  return {
    face: { read, operate, clearToast: () => { replace({ ...instance.getSnapshot(), toast: undefined }) }, hooks: { catalog: instance.store } },
    dispose: () => { live = false },
  }
}

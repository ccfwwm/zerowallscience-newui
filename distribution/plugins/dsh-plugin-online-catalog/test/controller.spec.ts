import { describe, expect, it, vi } from 'vitest'
import { createOnlineController } from '../src/client/controller.js'
import type { OnlineRequest, OnlineSnapshot } from '../src/shared/types.js'

const snapshot: OnlineSnapshot = { fetchedAt: '2026-11-14T12:00:00.000Z', plugins: [], skills: [] }
const requests: OnlineRequest[] = [{ action: 'update-plugin', id: 'some-skill-plugin', version: '1.1.0' }, { action: 'install-skill', id: 'workflow', version: '1.0.0' }]

describe('shared online catalog actions', () => {
  it('publishes fetched rows through the same source used by both views', async () => {
    const controller = createOnlineController({ read: async () => ({ snapshot }), operate: async () => ({ ok: true, restartRequired: false }) })
    try {
      await controller.face.read(true)
      expect(controller.face.hooks.catalog.getSnapshot()).toMatchObject({ snapshot, busy: false })
    } finally { controller.dispose() }
  })
  it('stops a batch on failure and preserves structured diagnostics after refreshing rows', async () => {
    const error = { code: 'install' as const, diagnostic: 'build-blocked; log: install.log' }
    const operate = vi.fn(async () => ({ ok: false as const, error }))
    const controller = createOnlineController({ read: async () => ({ snapshot }), operate })
    try {
      await controller.face.operate(requests)
      expect(operate).toHaveBeenCalledTimes(1)
      expect(controller.face.hooks.catalog.getSnapshot()).toMatchObject({ error, busy: false, toast: { success: false } })
    } finally { controller.dispose() }
  })
  it('waits for restart before issuing another candidate update', async () => {
    const operate = vi.fn(async () => ({ ok: true as const, restartRequired: true }))
    const controller = createOnlineController({ read: async () => ({ snapshot }), operate })
    try {
      await controller.face.operate(requests)
      expect(operate).toHaveBeenCalledTimes(1)
      expect(controller.face.hooks.catalog.getSnapshot().restartRequired).toBe(true)
    } finally { controller.dispose() }
  })
  it('prevents overlapping operations and ignores a late response after disposal', async () => {
    const started = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const operate = vi.fn(async () => { started.resolve(); await release.promise; return { ok: true as const, restartRequired: false } })
    const controller = createOnlineController({ read: async () => ({ snapshot }), operate })
    const pending = controller.face.operate(requests)
    try {
      await started.promise
      await controller.face.operate(requests)
      expect(operate).toHaveBeenCalledTimes(1)
      const before = controller.face.hooks.catalog.getSnapshot()
      controller.dispose()
      release.resolve()
      await pending
      expect(controller.face.hooks.catalog.getSnapshot()).toBe(before)
    } finally { release.resolve(); controller.dispose(); await pending }
  })
})

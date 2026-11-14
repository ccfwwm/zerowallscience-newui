/** Register the Qiniu catalog and share one state instance across Settings and Updates. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@zerowall/dsh-plugin-online-catalog/remote'
import { OnlineCatalogPanel, OnlineCatalogUpdateItem, OnlineFeedback, type OnlineFace } from './panel.js'
import { en, NS, zh } from './locales.js'
import { createOnlineController } from './controller.js'

export const inject = ['slots', 'locale', 'remote.zerowallOnlineCatalog']

/** @param ctx - Browser context. @returns void after registering reversible UI contributions. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { en, zh }))
  const remote = ctx.get('remote.zerowallOnlineCatalog')
  const controller = createOnlineController({
    read: async refresh => {
      const result = await remote.read(refresh)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    operate: async request => {
      const result = await remote.operate(request)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
  })
  const face = (): OnlineFace => ({ ...controller.face, resolveText: text => ctx.locale.resolveText({ ...text, en: text.en ?? '' }) })
  ctx.effect(() => { void controller.face.read(false); return controller.dispose })
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'zerowall-online-catalog', order: 36, label: () => ctx.locale.bind(NS)('title'), locale: NS, inject: face }, OnlineCatalogPanel))
  ctx.slots.inject('settings.updates.plugins', () => ctx.slots.register({ name: 'settings.updates.plugins', id: 'zerowall-online-catalog', order: 80, locale: NS, inject: () => ({ ...face(), open: () => ctx.emit('settings/open-section', 'zerowall-online-catalog') }) }, OnlineCatalogUpdateItem))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'zerowall-online-catalog-feedback', locale: NS, inject: face }, OnlineFeedback))
}

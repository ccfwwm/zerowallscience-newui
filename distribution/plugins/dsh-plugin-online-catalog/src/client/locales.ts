/** Typed copy for the live Qiniu catalog page. */
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'

export const NS = 'zerowall.onlineCatalog'
export const en = {
  title: 'Online plugins and skills', description: 'Add capabilities from the live ZeroWall catalog without replacing the desktop application.',
  refresh: 'Refresh catalog', updateAll: 'Update installed items', installing: 'Applying changes…', available: '{count} items available', empty: 'No online items are available.', loading: 'Loading catalog…',
  plugins: 'Plugins', skills: 'Skills', install: 'Install', update: 'Update', installed: 'Installed', provided: 'Included with this installation',
  incompatible: 'Not compatible with this runtime', lastChecked: 'Last checked {time}', failure: 'The catalog could not be refreshed. Existing entries are retained.',
  open: 'Open online catalog', updateHint: 'Refresh the online catalog to discover new plugins and skills.', done: 'Changes applied. Check the catalog for restart instructions.',
  restart: 'Changes are ready. Restart the application to apply them, then continue updating remaining items.',
  operationFailure: 'The change could not be completed. Review the details and retry.',
  partialFailure: 'Skill files were imported, but setup did not finish. Check skill enablement before retrying.',
  details: 'Diagnostic details', managedElsewhere: 'Manage from the Plugins page',
} as const
export const zh: Record<keyof typeof en, string> = {
  title: '在线插件与技能', description: '从七牛云在线目录添加能力，无需替换桌面程序。',
  refresh: '刷新目录', updateAll: '一键更新已安装项', installing: '正在应用变更…', available: '有 {count} 项内容可用', empty: '当前没有可用的在线内容。', loading: '正在加载目录…',
  plugins: '插件', skills: '技能', install: '安装', update: '更新', installed: '已安装', provided: '当前安装已提供',
  incompatible: '与当前运行时不兼容', lastChecked: '上次检查：{time}', failure: '目录刷新失败，已保留上次可用内容。',
  open: '打开在线目录', updateHint: '刷新在线目录，即可发现新增插件与技能。', done: '变更已应用，请查看目录中的重启提示',
  restart: '变更已准备好，请重启应用以生效，再继续更新剩余项目',
  operationFailure: '变更未能完成，请查看详情后重试',
  partialFailure: '技能文件已导入，但设置尚未完成，请检查技能启停状态后重试',
  details: '诊断详情', managedElsewhere: '请在插件页面管理',
}
export type OnlineCatalogKey = keyof typeof en
export type OnlineCatalogTranslate = Translate<OnlineCatalogKey>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'zerowall.onlineCatalog': OnlineCatalogKey }
}

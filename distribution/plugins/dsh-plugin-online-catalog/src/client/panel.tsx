/** Catalog rows use explicit item kinds and one-click updates only for installed items. */
import React, { useEffect } from 'react'
import { Button, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { OnlineEntry, OnlineRequest } from '../shared/types.js'
import type { OnlineCatalogTranslate } from './locales.js'
import type { OnlineStoreState } from './store.js'
import css from './panel.module.css'

type PanelProps = PropsLocale<'zerowall.onlineCatalog'> & InjectFace<OnlineFace>
type UpdateProps = PanelProps & { open: () => void }

/** Operations and reactive state shared by all catalog views. */
export interface OnlineFace {
  read: (refresh?: boolean) => Promise<void>
  operate: (requests: OnlineRequest[]) => Promise<void>
  clearToast: () => void
  resolveText: (text: Record<string, string>) => string
  hooks: { catalog: SnapshotStore<OnlineStoreState> }
}

function Item({ row, resolveText, t, busy, onOperate }: { row: OnlineEntry; resolveText: OnlineFace['resolveText']; t: OnlineCatalogTranslate; busy: boolean; onOperate: (row: OnlineEntry) => void }) {
  const action = row.status === 'update' ? t('update') : t('install')
  const actionable = row.installable && (row.status === 'available' || row.status === 'update')
  return <li className={css.item}>
    <div className={css.itemCopy}><strong>{resolveText(row.title)}</strong><span>{row.id} · {row.installedVersion && row.installedVersion !== row.version ? `${row.installedVersion} → ` : ''}{row.version}</span><p>{resolveText(row.description)}</p></div>
    <div className={css.itemAction}><span className={row.status === 'incompatible' ? css.badgeBad : css.badge}>{row.status === 'installed' ? t('installed') : row.status === 'provided' ? t('provided') : row.status === 'incompatible' ? t('incompatible') : !row.installable ? t('managedElsewhere') : action}</span>{actionable ? <Button size="sm" variant="primary" disabled={busy} onClick={() => onOperate(row)}>{action}</Button> : null}</div>
  </li>
}

/** @param props - Bound state and operations. @returns Online catalog settings. */
export function OnlineCatalogPanel({ useCatalog, t, read, operate, resolveText }: PanelProps): React.JSX.Element {
  const state = useCatalog(value => value)
  useEffect(() => { void read(false) }, [read])
  const request = (row: OnlineEntry, kind: 'plugins' | 'skills'): OnlineRequest => ({ action: kind === 'skills' ? 'install-skill' : row.status === 'update' ? 'update-plugin' : 'install-plugin', id: row.id, version: row.version })
  const updates = (['plugins', 'skills'] as const).flatMap(kind => state.snapshot[kind].filter(row => row.installable && row.status === 'update').map(row => request(row, kind)))
  const blocked = state.busy || state.restartRequired
  return <section className={css.root} aria-label={t('title')} aria-busy={state.busy}>
    <header className={css.header}><div><h2>{t('title')}</h2><p>{t('description')}</p></div><div className={css.actions}><Button variant="outline" disabled={state.busy} onClick={() => { void read(true) }}>{t('refresh')}</Button>{updates.length ? <Button variant="primary" disabled={blocked} onClick={() => { void operate(updates) }}>{t('updateAll')}</Button> : null}</div></header>
    {state.restartRequired ? <p className={css.notice} role="status">{t('restart')}</p> : null}
    {state.busy ? <p role="status">{t('installing')}</p> : null}
    {state.error ? <div className={css.notice} role="alert"><p>{state.error.code === 'catalog' ? t('failure') : state.error.code === 'partial' ? t('partialFailure') : t('operationFailure')}</p><details><summary>{t('details')}</summary><pre>{state.error.diagnostic}</pre></details></div> : null}
    {state.snapshot.fetchedAt ? <p className={css.meta}>{t('lastChecked', { time: new Date(state.snapshot.fetchedAt).toLocaleString() })}</p> : null}
    {(['plugins', 'skills'] as const).map(kind => <section className={css.group} key={kind}><h3>{t(kind)}</h3>{state.snapshot[kind].length ? <ul>{state.snapshot[kind].map(row => <Item key={row.id} row={row} resolveText={resolveText} t={t} busy={blocked} onOperate={item => { void operate([request(item, kind)]) }} />)}</ul> : <p>{state.busy ? t('loading') : t('empty')}</p>}</section>)}
  </section>
}

/** @param props - Shared catalog state and navigation. @returns Updates page entry. */
export function OnlineCatalogUpdateItem({ useCatalog, t, open }: UpdateProps): React.JSX.Element {
  const state = useCatalog(value => value)
  const count = [...state.snapshot.plugins, ...state.snapshot.skills].filter(row => row.installable && (row.status === 'available' || row.status === 'update')).length
  return <div className={css.updateItem}><div><strong>{t('title')}</strong><p>{count ? t('available', { count }) : t('updateHint')}</p></div><Button size="sm" variant={count ? 'primary' : 'outline'} onClick={open}>{t('open')}</Button></div>
}

/** @param props - Navigation-independent feedback state. @returns Transient operation feedback. */
export function OnlineFeedback({ useCatalog, t, clearToast }: PanelProps): React.JSX.Element | null {
  const toast = useCatalog(value => value.toast)
  return toast ? <Toast key={toast.id} text={t(toast.success ? 'done' : 'operationFailure')} {...toast.success ? { tone: 'success' as const } : {}} onDone={clearToast} /> : null
}

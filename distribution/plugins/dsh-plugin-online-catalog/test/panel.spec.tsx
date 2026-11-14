// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OnlineCatalogPanel, OnlineCatalogUpdateItem } from '../src/client/panel.js'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { en } from '../src/client/locales.js'
import type { OnlineStoreState } from '../src/client/store.js'
import type { OnlineEntry } from '../src/shared/types.js'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  Button: ({ children, variant: _variant, size: _size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant: string; size: string }) => <button {...props}>{children}</button>,
  Toast: () => null,
}))
afterEach(cleanup)
const dictionary: Record<string, string> = en
const t: PropsLocale<'zerowall.onlineCatalog'>['t'] = (key, values) => Object.entries(values ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), dictionary[key] ?? key)
const entry: OnlineEntry = { id: 'some-skill-plugin', version: '1.1.0', installedVersion: '1.0.0', title: { en: 'Plugin with skill in name' }, description: { en: 'Plugin description' }, status: 'update', installable: true }
const initial: OnlineStoreState = { snapshot: { fetchedAt: '', plugins: [entry, { ...entry, id: 'new-plugin', title: { en: 'New plugin' }, status: 'available' }], skills: [{ ...entry, id: 'workflow', title: { en: 'Workflow' } }] }, busy: false, restartRequired: false }
function props(state = initial) { return { useCatalog: <S,>(selector: (value: OnlineStoreState) => S): S => selector(state), t, read: vi.fn(async () => {}), operate: vi.fn(async () => {}), clearToast: () => {}, resolveText: (text: Record<string, string>) => text.en ?? '' } }

describe('online catalog page', () => {
  it('updates only installed items and routes plugins and skills by their list', () => {
    const face = props()
    render(<OnlineCatalogPanel {...face} />)
    fireEvent.click(screen.getByRole('button', { name: en.updateAll }))
    expect(face.operate).toHaveBeenCalledWith([
      { action: 'update-plugin', id: 'some-skill-plugin', version: '1.1.0' },
      { action: 'install-skill', id: 'workflow', version: '1.1.0' },
    ])
    fireEvent.click(screen.getAllByRole('button', { name: en.update })[0]!)
    expect(face.operate).toHaveBeenLastCalledWith([{ action: 'update-plugin', id: 'some-skill-plugin', version: '1.1.0' }])
    expect(screen.getByRole('region', { name: en.title }).textContent).toMatchSnapshot()
  })
  it('retains entries and diagnostic details after an operation fails', () => {
    render(<OnlineCatalogPanel {...props({ ...initial, error: { code: 'install', diagnostic: 'build-blocked; log install.log' } })} />)
    expect(screen.getByRole('alert').textContent).toContain(en.operationFailure)
    expect(screen.getByText('Plugin with skill in name')).toBeDefined()
    expect(screen.getByText('build-blocked; log install.log')).toBeDefined()
  })
  it('blocks more changes until a prepared update is applied', () => {
    render(<OnlineCatalogPanel {...props({ ...initial, restartRequired: true })} />)
    expect(screen.getByRole('status').textContent).toBe(en.restart)
    expect((screen.getByRole('button', { name: en.updateAll }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('opens the dedicated catalog from the update center', () => {
    const open = vi.fn()
    render(<OnlineCatalogUpdateItem {...props()} open={open} />)
    fireEvent.click(screen.getByRole('button', { name: en.open }))
    expect(open).toHaveBeenCalledTimes(1)
  })
})

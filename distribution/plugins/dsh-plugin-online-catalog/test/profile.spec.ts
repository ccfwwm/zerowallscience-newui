import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import SkillRegistry from '@zerowall/dsh-plugin-skills/registry'
import { SkillsManagement } from '@zerowall/dsh-plugin-skills'
import { OnlineCatalog } from '../src/host/index.js'
import { getDshRuntimeVersion } from '@deepseek-ai/dsh-app-boot'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => { try { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() } finally { vi.unstubAllGlobals() } })

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'online-catalog-'))
  cleanups.push(() => rm(root, { recursive: true, force: true }))
  const ctx = new Context()
  const resources = join(root, 'resources')
  await mkdir(resources)
  await writeFile(join(resources, 'catalog.json'), '[]')
  const registry = ctx.plugin(SkillRegistry)
  cleanups.push(() => registry.dispose())
  await registry
  const management = ctx.plugin(SkillsManagement, { home: root, resources })
  cleanups.push(() => management.dispose())
  await management
  const install = vi.fn<Context['pluginManager']['installBundle']>(async () => ({ changed: true, application: 'restart-required', stage: 'install', target: 'some-skill-plugin' }))
  // Only the manager methods consumed by the catalog are supplied by this fixture.
  ctx.provide('pluginManager', { listBundles: async () => [], installBundle: install })
  const archive = await new JSZip().file('workflow/SKILL.md', '---\nname: workflow\ndescription: Test workflow\n---\nRead the project.\n').generateAsync({ type: 'uint8array' })
  const skills = { schemaVersion: 1, skills: [{ id: 'workflow', version: '1.0.0', title: { en: 'Workflow' }, description: { en: 'Workflow' }, url: 'https://catalog.example/workflow.zip', bytes: archive.length, sha256: createHash('sha256').update(archive).digest('hex'), names: ['workflow'] }] }
  const engines: { dsh?: string } = {}
  const plugins = { format: 1, title: 'Plugins', plugins: [{ name: 'some-skill-plugin', versions: [{ version: '1.0.0', publishTimestamp: 1, source: { type: 'npm' }, engines }] }] }
  const transport: typeof fetch = async input => {
    const url = String(input)
    if (url === 'https://catalog.example/plugins.json') return Response.json(plugins)
    if (url === 'https://catalog.example/skills.json') return Response.json(skills)
    if (url === 'https://catalog.example/workflow.zip') return new Response(new Uint8Array(archive).buffer)
    throw new Error('Unexpected fixture URL')
  }
  vi.stubGlobal('fetch', transport)
  const fork = ctx.plugin(OnlineCatalog, { home: root, pluginIndexUrl: 'https://catalog.example/plugins.json', skillIndexUrl: 'https://catalog.example/skills.json' })
  cleanups.push(() => fork.dispose())
  await fork
  return { root, ctx, registry: ctx.get('skills') as SkillRegistry, service: ctx.zerowallOnlineCatalog, fork, skills, install, engines }
}

describe('online catalog profile integration', () => {
  it('uses Host compatibility rules for prereleases and blocks an unmet runtime range', async () => {
    const { service, install, engines } = await setup()
    engines.dsh = `>=${getDshRuntimeVersion()}`
    expect((await service.read(true)).snapshot.plugins[0]).toMatchObject({ status: 'available', installable: true })
    expect(await service.operate({ action: 'install-plugin', id: 'some-skill-plugin', version: '1.0.0' })).toMatchObject({ ok: true })
    install.mockClear()
    engines.dsh = '>=999.0.0'
    expect((await service.read(true)).snapshot.plugins[0]).toMatchObject({ status: 'incompatible', installable: false })
    expect(await service.operate({ action: 'install-plugin', id: 'some-skill-plugin', version: '1.0.0' })).toMatchObject({ ok: false, error: { code: 'changed' } })
    expect(install).not.toHaveBeenCalled()
  })
  it('loads a skill through the real importer and retains disabled policy on update', async () => {
    const { service, ctx, registry, skills, root } = await setup()
    expect(await service.operate({ action: 'install-skill', id: 'workflow', version: '1.0.0' })).toEqual({ ok: true, restartRequired: false })
    expect((await registry.get('workflow'))?.content).toContain('Read the project.')
    await ctx.zerowallSkills.request({ action: 'set-enabled', name: 'workflow', enabled: false, scope: 'global' })
    skills.skills[0]!.version = '1.0.1'
    expect(await service.operate({ action: 'install-skill', id: 'workflow', version: '1.0.1' })).toEqual({ ok: true, restartRequired: false })
    expect(await registry.get('workflow')).toBeUndefined()
    expect(JSON.parse(await readFile(join(root, 'zerowall-online-catalog/skills.json'), 'utf8'))).toEqual({ workflow: '1.0.1' })
    expect((await service.read(false)).snapshot.skills[0]).toMatchObject({ installedVersion: '1.0.1', status: 'installed' })
  })
  it('refuses a tampered archive before changing any existing skill', async () => {
    const { service, registry, skills } = await setup()
    await service.operate({ action: 'install-skill', id: 'workflow', version: '1.0.0' })
    const before = (await registry.get('workflow'))?.content
    skills.skills[0]!.version = '1.0.1'
    skills.skills[0]!.sha256 = '0'.repeat(64)
    expect(await service.operate({ action: 'install-skill', id: 'workflow', version: '1.0.1' })).toMatchObject({ ok: false, error: { code: 'integrity' } })
    expect((await registry.get('workflow'))?.content).toBe(before)
  })
  it('delegates a plugin whose name contains skill to the plugin manager', async () => {
    const { service, install } = await setup()
    expect(await service.operate({ action: 'install-plugin', id: 'some-skill-plugin', version: '1.0.0' })).toEqual({ ok: true, restartRequired: true })
    expect(install).toHaveBeenCalledWith('some-skill-plugin@1.0.0', expect.objectContaining({ saveExact: true, enabled: true }))
  })
  it('retains valid listings after an invalid replacement and refuses stale mutations', async () => {
    const { service, install } = await setup()
    const first = await service.read(true)
    vi.stubGlobal('fetch', async () => Response.json({ invalid: true }))
    const next = await service.read(true)
    expect(next.error?.code).toBe('catalog')
    expect(next.snapshot.plugins).toEqual(first.snapshot.plugins)
    expect(await service.operate({ action: 'install-plugin', id: 'some-skill-plugin', version: '1.0.0' })).toMatchObject({ ok: false })
    expect(install).not.toHaveBeenCalled()
  })
  it('retains the package manager failure classification, output and log path', async () => {
    const { service, install } = await setup()
    const result = { changed: false, application: 'failed' as const, stage: 'install' as const, target: 'some-skill-plugin', error: { code: 'operation-error' as const, diagnostic: 'Blocked builds' }, packageResult: { exitCode: 1, output: 'ERR_PNPM_IGNORED_BUILDS', failureKind: 'build-blocked' as const, truncated: false, logPath: 'install.log' } }
    install.mockResolvedValueOnce(result)
    const answer = await service.operate({ action: 'install-plugin', id: 'some-skill-plugin', version: '1.0.0' })
    expect(answer).toMatchObject({ ok: false, error: { code: 'install', pluginResult: result } })
  })
  it('awaits an admitted install during disposal and refuses queued work', async () => {
    const { service, fork, install } = await setup()
    const started = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    install.mockImplementationOnce(async () => { started.resolve(); await release.promise; return { changed: true, application: 'restart-required', stage: 'install', target: 'some-skill-plugin' } })
    const operation = service.operate({ action: 'install-plugin', id: 'some-skill-plugin', version: '1.0.0' })
    let disposing: Promise<void> | undefined
    try {
      await started.promise
      disposing = fork.dispose()
      release.resolve()
      await operation
      await disposing
      expect((await service.read(false)).error?.code).toBe('disposed')
    } finally { release.resolve(); await operation; await disposing }
  })
})

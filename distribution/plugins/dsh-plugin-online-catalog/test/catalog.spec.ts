import { describe, expect, it } from 'vitest'
import { parseSkills, readObject } from '../src/host/catalog.js'

const signal = () => new AbortController().signal
const response = (body: string | Uint8Array, status = 200): Response => new Response(typeof body === 'string' ? body : new Uint8Array(body).buffer, { status, headers: { 'content-type': 'application/json' } })

describe('online catalog reader', () => {
  it('reads bounded objects and rejects oversized streams', async () => {
    const fetcher: typeof fetch = async () => response(new Uint8Array([1, 2, 3]))
    await expect(readObject('https://catalog.example/object', 3, signal(), fetcher)).resolves.toEqual(new Uint8Array([1, 2, 3]))
    await expect(readObject('https://catalog.example/object', 2, signal(), fetcher)).rejects.toThrow('exceeds its size limit')
  })

  it('validates immutable skill metadata and rejects duplicate names', () => {
    const valid = new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, skills: [{ id: 'desktop-workflow', version: '1.0.0', title: { en: 'Desktop workflow' }, description: { en: 'Workflow' }, url: 'https://cdn.example/desktop.zip', bytes: 12, sha256: 'a'.repeat(64), names: ['desktop-workflow'] }] }))
    expect(parseSkills(valid)[0]?.id).toBe('desktop-workflow')
    const duplicate = JSON.parse(new TextDecoder().decode(valid)) as { skills: { names: string[] }[] }
    duplicate.skills[0]!.names = ['desktop-workflow', 'desktop-workflow']
    expect(() => parseSkills(new TextEncoder().encode(JSON.stringify(duplicate)))).toThrow('Repeated skill name')
  })
})

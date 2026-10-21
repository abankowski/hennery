import { describe, expect, it } from 'vitest'
import { versionText } from './version'
import webPackage from '../../package.json'

describe('version text', () => {
  it('injects the loaded page release from the web package', () => {
    expect(__PAGE_VERSION__).toBe(webPackage.version)
  })
  it('shows the collector release and short source commit', () => {
    expect(versionText('0.2.1', { collector_version: '0.2.1', source_commit: 'abcdef1234567890abcdef1234567890abcdef12' })).toEqual({ label: 'hennery 0.2.1 · abcdef12', hint: null })
  })
  it('shows both releases when the loaded page differs', () => {
    expect(versionText('0.2.1', { collector_version: '0.2.2' })).toEqual({ label: 'hennery 0.2.2', hint: 'page 0.2.1 · server 0.2.2' })
  })
  it('does not invent a source commit for a development build', () => {
    expect(versionText('0.2.1', { collector_version: '0.2.1' })).toEqual({ label: 'hennery 0.2.1', hint: null })
  })
  it('keeps the page identity when talking to an older collector', () => {
    expect(versionText('0.2.1', null)).toEqual({ label: 'page 0.2.1', hint: 'server version unavailable' })
  })
})

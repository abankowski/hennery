import { afterEach, describe, expect, it, vi } from 'vitest'
import { draftKey, draftMayHaveBeenSent, forgetAllDrafts, loadDraft, markDraftSending, saveDraft } from './drafts'

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('drafts', () => {
  it('a send prepared after sign-out never restores the cleared draft', () => {
    saveDraft('s1', 'private words')
    forgetAllDrafts()
    markDraftSending('s1', 'private words')
    expect(sessionStorage.length).toBe(0)
  })

  it('keeps an uncertain send with its unchanged draft, clears it on edits or acceptance and scopes it to a session', () => {
    saveDraft('s1', 'possibly accepted')
    markDraftSending('s1', 'possibly accepted')
    expect(loadDraft('s1')).toBe('possibly accepted')
    saveDraft('s1', 'possibly accepted')
    expect(draftMayHaveBeenSent('s1')).toBe(true)
    expect(draftMayHaveBeenSent('s2')).toBe(false)
    saveDraft('s1', 'edited')
    expect(draftMayHaveBeenSent('s1')).toBe(false)
    saveDraft('s1', 'sent')
    markDraftSending('s1', 'sent')
    saveDraft('s1', '')
    expect(draftMayHaveBeenSent('s1')).toBe(false)
    expect(sessionStorage.length).toBe(0)
  })

  it('keeps a draft per session in sessionStorage under hennery.draft.<id>', () => {
    expect(draftKey('s1')).toBe('hennery.draft.s1')
    saveDraft('s1', 'one')
    saveDraft('s2', 'two')
    expect(sessionStorage.getItem('hennery.draft.s1')).toBe('one')
    expect(loadDraft('s1')).toBe('one')
    expect(loadDraft('s2')).toBe('two')
    expect(loadDraft('s3')).toBe('')
  })

  it('removes an emptied draft', () => {
    saveDraft('s1', 'one')
    saveDraft('s1', '')
    expect(sessionStorage.getItem('hennery.draft.s1')).toBeNull()
  })

  it('lives in the page only when storage refuses', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => saveDraft('s1', 'x')).not.toThrow()
    expect(() => markDraftSending('s1', 'x')).not.toThrow()
    expect(draftMayHaveBeenSent('s1')).toBe(false)
    expect(loadDraft('s1')).toBe('')
  })

  it('forgets every draft at once, and only the drafts', () => {
    saveDraft('s1', 'one')
    markDraftSending('s1', 'one')
    saveDraft('s2', 'two')
    saveDraft('s3', 'three')
    sessionStorage.setItem('hennery.hideClosed', '1')
    sessionStorage.setItem('hennery.draftless', 'kept')
    forgetAllDrafts()
    expect(loadDraft('s1')).toBe('')
    expect(loadDraft('s2')).toBe('')
    expect(loadDraft('s3')).toBe('')
    expect(sessionStorage.getItem('hennery.hideClosed')).toBe('1')
    expect(sessionStorage.getItem('hennery.draftless')).toBe('kept')
    expect(sessionStorage.length).toBe(2)
  })

  it('does not throw when storage refuses', () => {
    saveDraft('s1', 'one')
    const key = vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => forgetAllDrafts()).not.toThrow()
    expect(key).toHaveBeenCalled()
  })
})

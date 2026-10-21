import { beforeEach, describe, expect, it } from 'vitest'
import { deriveAccent } from './accent'
import { HAT_KEY, readHat, themeOf, writeHat } from './hats'
beforeEach(() => localStorage.clear())
describe('the selected hat', () => {
  it('is every hat until chosen, independently of appearance', () => {
    expect(readHat()).toBe('')
    writeHat('hat-a')
    expect(localStorage.getItem(HAT_KEY)).toBe('hat-a')
    expect(readHat()).toBe('hat-a')
    expect(themeOf('#4C5FD5')).toEqual(deriveAccent('#4c5fd5'))
    expect(themeOf(undefined)).toEqual(deriveAccent())
    expect(readHat()).toBe('hat-a')
  })
})

import { afterEach, expect, it } from 'vitest'
import { discardUpdateInputs, hasUpdateEdits, observeUpdateInput, prepareInputSave } from './update-edits'
afterEach(() => { discardUpdateInputs(document.body); document.body.innerHTML = ''; hasUpdateEdits() })
function edit(input: HTMLInputElement, text: string) {
  input.value = text
  const event = new Event('input')
  Object.defineProperty(event, 'target', { value: input })
  observeUpdateInput(event)
}
it('after a save, returning to an older value is still an unsaved edit', () => {
  document.body.innerHTML = '<form><input value="before"></form>'
  const input = document.querySelector('input')!
  edit(input, 'saved')
  prepareInputSave(input.form!)()
  expect(hasUpdateEdits()).toBe(false)
  edit(input, 'before')
  expect(hasUpdateEdits()).toBe(true)
})
it('a successful save cannot acknowledge later edits or another form', () => {
  document.body.innerHTML = '<form><input value="a"></form><form><input value="b"></form>'
  const [a,b] = [...document.querySelectorAll('input')]
  edit(a, 'draft-a'); edit(b, 'draft-b')
  const saved = prepareInputSave(a.form!)
  edit(a, 'newer-a'); saved()
  discardUpdateInputs(b.form!); b.remove()
  expect(hasUpdateEdits()).toBe(true)
  discardUpdateInputs(a.form!); a.remove()
  expect(hasUpdateEdits()).toBe(false)
})
it('unmounted generic controls remain busy until their owning save acknowledges them', () => {
  document.body.innerHTML = '<form><input value="before"></form>'
  const form = document.querySelector('form')!, input = document.querySelector('input')!
  edit(input, 'pending confirmation')
  const saved = prepareInputSave(form)
  try {
    form.remove()
    expect(hasUpdateEdits()).toBe(true)
  } finally { saved() }
  expect(hasUpdateEdits()).toBe(false)
})
it('saving one form never acknowledges another form', () => {
  document.body.innerHTML = '<form><input value="a"></form><form><input value="b"></form>'
  const [a,b] = [...document.querySelectorAll('input')]
  edit(a, 'saved-a'); edit(b, 'unsaved-b')
  prepareInputSave(a.form!)()
  expect(hasUpdateEdits()).toBe(true)
  discardUpdateInputs(b.form!)
  expect(hasUpdateEdits()).toBe(false)
})

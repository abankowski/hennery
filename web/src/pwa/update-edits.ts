// Track volatile controls separately from notification navigation's sticky bit.
// Successful form transactions clear only their unchanged fields. A failed
// request, another form, or an edit made during the request stays dirty.
const fields = new Map<Element, { baseline: string | null; revision: number }>()
const savedBaselines = new WeakMap<Element, string>()
const sources = new Set<() => boolean>()
let revision = 0
export const editRevision = () => revision
export const changedUpdateDraft = () => { revision++ }
export const watchUpdateDrafts = (source: () => boolean) => { sources.add(source); return () => { sources.delete(source) } }
const durable = '[data-persisted-draft],[data-update-search],input[type="search"],[data-question-draft]'
function value(field: Element): string {
  if (field instanceof HTMLInputElement && ['checkbox', 'radio'].includes(field.type)) return String(field.checked)
  if (field instanceof HTMLSelectElement && field.multiple) return JSON.stringify([...field.selectedOptions].map(option => option.value))
  return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement ? field.value : field.textContent ?? ''
}
export function observeUpdateFocus(event: Event) {
  const field = event.target
  if (field instanceof Element && !field.closest(durable) && !fields.has(field)) savedBaselines.set(field, value(field))
}
export function observeUpdateInput(event: Event) {
  const field = event.target
  if (!(field instanceof Element) || field.closest(durable)) return
  if (!field.matches('input,textarea,select,[contenteditable="true"]')) return
  const initial = field instanceof HTMLInputElement && ['checkbox', 'radio'].includes(field.type) ? String(field.defaultChecked)
    : field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.defaultValue : null
  const held = fields.get(field) ?? { baseline: savedBaselines.get(field) ?? initial, revision: 0 }
  revision++
  if (value(field) === held.baseline) fields.delete(field)
  else fields.set(field, { baseline: held.baseline, revision })
}
export function hasUpdateEdits() {
  for (const [field, held] of fields) if (value(field) === held.baseline) fields.delete(field)
  return fields.size > 0 || [...sources].some(source => source())
}
export function discardUpdateInputs(root: Element) {
  for (const field of fields.keys()) if (root.contains(field)) { fields.delete(field); savedBaselines.delete(field) }
}
export function prepareInputSave(root: Element) {
  const snapshot = [...fields].filter(([field]) => root.contains(field))
  return () => { for (const [field, held] of snapshot) if (fields.get(field)?.revision === held.revision) { savedBaselines.set(field, value(field)); fields.delete(field) } }
}
type Submission = { event: Event; save(): void; pending: number; started: boolean; sealed: boolean; failed: boolean }
let submission: Submission | null = null
const settle = (batch: Submission) => { if (batch.sealed && batch.started && !batch.pending && !batch.failed) batch.save() }
export function observeUpdateSubmit(event: Event) {
  if (!(event.target instanceof HTMLFormElement)) return
  const batch: Submission = { event, save: prepareInputSave(event.target), pending: 0, started: false, sealed: false, failed: false }
  submission = batch
  // A microtask can run between native capture and React's bubble handler.
  // Seal in the bubble listener, with a task fallback for stopped propagation.
  setTimeout(() => { if (submission === batch) submission = null; batch.sealed = true; settle(batch) }, 0)
}
export function finishUpdateSubmit(event: Event) {
  const batch = submission
  if (batch?.event !== event) return
  submission = null; batch.sealed = true; settle(batch)
}
/** Only requests started by this submit event participate; background work
 * cannot acknowledge a form's edits. All participating requests must succeed. */
export function captureUpdateSave(): (success: boolean) => void {
  const batch = submission
  if (!batch || window.event !== batch.event) return () => {}
  batch.pending++; batch.started = true
  return success => { batch.pending--; batch.failed ||= !success; settle(batch) }
}

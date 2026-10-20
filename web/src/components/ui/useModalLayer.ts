import { useEffect, type KeyboardEvent, type MouseEvent, type RefObject } from 'react'
const stack: HTMLElement[] = []
const locked = new Map<HTMLElement, { count: number; before: boolean }>()
/** Inert siblings along the ancestor path; works inside existing screen trees
 * and with a step-up mounted above a confirmation, without remounting forms. */
export function useModalLayer(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    stack.push(dialog)
    const siblings: HTMLElement[] = []
    let child: HTMLElement = dialog
    while (child.parentElement) {
      for (const node of child.parentElement.children) {
        if (!(node instanceof HTMLElement) || node === child || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') continue
        // App owns the page's step-up inert state. Do not restore it after
        // React removes that attribute on close (which would re-inert the page).
        if (!locked.has(node) && (node.inert || node.hasAttribute('inert'))) continue
        const state = locked.get(node) ?? { count: 0, before: false }
        state.count++; locked.set(node, state); node.inert = true; siblings.push(node)
      }
      child = child.parentElement
      if (child === document.body) break
    }
    return () => {
      stack.splice(stack.indexOf(dialog), 1)
      for (const node of siblings) {
        const state = locked.get(node)!
        if (--state.count === 0) { node.inert = state.before; locked.delete(node) }
      }
    }
  }, [ref])
  const trap = (event: KeyboardEvent<HTMLDivElement>, cancel: () => void, dismissible = true) => {
    const dialog = ref.current
    if (!dialog || stack.at(-1) !== dialog) return
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation()
      if (dismissible) cancel()
      return
    }
    if (event.key !== 'Tab') return
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => !el.closest('[hidden], [inert]'))
    const at = document.activeElement
    if (!controls.length) { event.preventDefault(); dialog.focus(); return }
    const first = controls[0], last = controls[controls.length - 1]
    if (event.shiftKey && (at === first || !controls.includes(at as HTMLElement))) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (at === last || !controls.includes(at as HTMLElement))) { event.preventDefault(); first.focus() }
  }
  const holdFocus = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) { event.preventDefault(); ref.current?.focus() }
  }
  return { trap, holdFocus }
}

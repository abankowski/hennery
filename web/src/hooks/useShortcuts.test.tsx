import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppActions } from '../app-actions'
import { useShortcuts } from './useShortcuts'
import { getTheme, setAppearance } from '../lib/theme'
import { useRef } from 'react'
import SessionDetails from '../components/SessionDetails'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren() })
function Harness({ actions, route = 'sessions', help, announce }: { actions: AppActions; route?: string; help: () => void; announce: (text: string) => void }) { useShortcuts(actions, route, help, announce); return <button>Page focus</button> }
function setup() {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Linux')
  const actions = new AppActions(), run = vi.fn(), help = vi.fn(), announce = vi.fn()
  actions.register('new-session', { label: 'New session', enabled: true, run })
  return { actions, run, help, announce }
}
it('registers exactly once across rerenders and removes the listener at unmount', () => {
  const props = setup(), view = render(<Harness {...props} />)
  view.rerender(<Harness {...props} route="hosts" />)
  fireEvent.keyDown(window, { key: 'n' }); expect(props.run).toHaveBeenCalledTimes(1)
  view.unmount(); fireEvent.keyDown(window, { key: 'n' }); expect(props.run).toHaveBeenCalledTimes(1)
})
it('does not consume a key when the current provider is absent or disabled', () => {
  const props = setup(); props.actions.register('new-session', { label: 'Unavailable', enabled: false, run: props.run })
  render(<Harness {...props} />)
  const event = new KeyboardEvent('keydown', { key: 'n', cancelable: true }); window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false); expect(props.run).not.toHaveBeenCalled()
})
it('leaves every shortcut alone under a modal, including theme and help', () => {
  const props = setup(); render(<Harness {...props} />)
  const dialog = document.createElement('div'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); document.body.append(dialog)
  setAppearance('light')
  for (const key of ['n', '?', 'L']) fireEvent.keyDown(window, { key, ctrlKey: key === 'L', shiftKey: key === 'L' })
  expect(props.run).not.toHaveBeenCalled(); expect(props.help).not.toHaveBeenCalled(); expect(getTheme().preference).toBe('light')
})
it('ignores the retained closed mobile details sheet, then suppresses shortcuts while it is open', () => {
  const props = setup(), palette = vi.fn()
  props.actions.register('open-commands', { label: 'Jump to', enabled: true, run: palette })
  function SessionHarness({ open }: { open: boolean }) {
    const trigger = useRef<HTMLButtonElement>(null)
    useShortcuts(props.actions, 'session', props.help, props.announce)
    return <><button ref={trigger}>Details</button><SessionDetails open={open} tab="Family" onTab={() => {}} onClose={() => {}} trigger={trigger}><p>Retained family reader</p></SessionDetails></>
  }
  const view = render(<SessionHarness open={false} />)
  // R3 keeps the real sheet and family reader mounted across close/open.
  const sheet = document.querySelector('[role="dialog"][aria-modal="true"]')
  expect(sheet).not.toBeNull()
  expect(sheet!.closest('[hidden]')).not.toBeNull()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); expect(palette).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(window, { key: 'n' }); expect(props.run).toHaveBeenCalledTimes(1)
  view.rerender(<SessionHarness open />)
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); expect(palette).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(window, { key: 'n' }); expect(props.run).toHaveBeenCalledTimes(1)
  view.rerender(<SessionHarness open={false} />)
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); expect(palette).toHaveBeenCalledTimes(2)
  fireEvent.keyDown(window, { key: 'n' }); expect(props.run).toHaveBeenCalledTimes(2)
})
it('cycles the shared theme and announces it, opens help, and respects prior preventDefault', () => {
  const props = setup(); render(<Harness {...props} />); setAppearance('system')
  fireEvent.keyDown(window, { key: 'L', ctrlKey: true, shiftKey: true })
  expect(getTheme().preference).toBe('light'); expect(props.announce).toHaveBeenCalledWith('Appearance: Light')
  fireEvent.keyDown(window, { key: '?' }); expect(props.help).toHaveBeenCalledOnce()
  const e = new KeyboardEvent('keydown', { key: 'n', cancelable: true }); e.preventDefault(); window.dispatchEvent(e)
  expect(props.run).not.toHaveBeenCalled()
})
it('keeps app typing usable when matchMedia is unavailable', () => {
  const props = setup(); vi.stubGlobal('matchMedia', undefined)
  render(<Harness {...props} />)
  fireEvent.keyDown(window, { key: 'n' }); expect(props.run).toHaveBeenCalledOnce()
  const rail = vi.fn(); props.actions.register('toggle-rail', { label: 'Navigation', enabled: true, run: rail })
  fireEvent.keyDown(window, { key: '[' }); expect(rail).not.toHaveBeenCalled()
})

import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { routed } from '../test-stream'
import UnseenObserver from './UnseenObserver'

const rect = (top: number, bottom: number) => ({ x:0, y:top, top, bottom, left:0, right:300, width:300, height:bottom-top, toJSON: () => ({}) })
it.each(['focus', 'visibility', 'viewport', 'content'])('requires %s before acknowledging a captured activity', async gate => {
  let ready = false
  vi.spyOn(document, 'hasFocus').mockImplementation(() => ready || gate !== 'focus')
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => ready || gate !== 'visibility' ? 'visible' : 'hidden')
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('transcript') ? rect(0, 300) : !ready && gate === 'viewport' ? rect(399, 400) : rect(199, 200)
  })
  const server = routed(() => new Response(null, { status:204 }))
  const view = render(<div className="transcript"><UnseenObserver id="s" eventId={10} revision={gate === 'content' ? 9 : 10} /></div>, { wrapper:server.wrapper })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 300)) })
  expect(server.calls).toHaveLength(0)
  ready = true
  view.rerender(<div className="transcript"><UnseenObserver id="s" eventId={10} revision={10} /></div>)
  fireEvent.focus(window)
  await waitFor(() => expect(server.calls).toHaveLength(1))
  expect(server.calls[0].path).toBe('/api/view/sessions/s/seen')
  expect(JSON.parse(server.fetch.mock.calls[0][1]!.body as string)).toEqual({ event_id:10 })
  fireEvent.scroll(view.container.querySelector('.transcript')!)
  expect(server.calls).toHaveLength(1)
})

it('rearms for new content while a previous acknowledgement is delayed', async () => {
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 300))
  let finish!: (response:Response) => void
  const server = routed(() => new Promise<Response>(resolve => { finish = resolve }))
  const view = render(<div className="transcript"><UnseenObserver id="s" eventId={10} revision={10} /></div>, { wrapper:server.wrapper })
  fireEvent.focus(window)
  await waitFor(() => expect(server.calls).toHaveLength(1))
  const previous = finish
  view.rerender(<div className="transcript"><UnseenObserver id="s" eventId={20} revision={20} /></div>)
  await act(async () => previous(new Response(null, { status:204 })))
  fireEvent.focus(window)
  await waitFor(() => expect(server.calls).toHaveLength(2))
  expect(JSON.parse(server.fetch.mock.calls[1][1]!.body as string)).toEqual({ event_id:20 })
  await act(async () => finish(new Response(null, { status:204 })))
})

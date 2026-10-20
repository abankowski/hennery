import { useRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SessionDetails, { type SessionDetailsTab } from './SessionDetails'

function View() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<SessionDetailsTab>('Family')
  const ref = useRef<HTMLButtonElement>(null)
  return <><button ref={ref} onClick={() => setOpen(true)}>Session details</button><input aria-label="Retained draft" defaultValue="keep this" /><SessionDetails open={open} tab={tab} onTab={setTab} onClose={() => setOpen(false)} trigger={ref}><a href="/sessions/child">Worker</a></SessionDetails></>
}

describe('SessionDetails', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('offers semantic arrow/Home/End tabs and empty states without inventing plan data', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query === '(max-width: 1023px)', addEventListener() {}, removeEventListener() {} })))
    render(<View />)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Session details' }))
    const family = screen.getByRole('tab', { name: 'Family' })
    expect(family).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(family, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Plan' })).toHaveFocus()
    expect(screen.getByText('No plan has been shared.', { exact: true })).toBeVisible()
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveFocus()
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('unknown')
    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(family).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Worker' })).toBeVisible()
  })

  it('shows Family, Plan and Details together in the desktop sidebar', async () => {
    render(<View />)
    await userEvent.click(screen.getByRole('button', { name: 'Session details' }))
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByRole('link', { name: 'Worker' })).toBeVisible()
    expect(screen.getByText('No plan has been shared.', { exact: true })).toBeVisible()
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toBeVisible()
  })

  it('makes the phone sheet modal, traps focus, preserves drafts and returns focus on Escape', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query === '(max-width: 1023px)', addEventListener() {}, removeEventListener() {} })))
    render(<View />)
    const trigger = screen.getByRole('button', { name: 'Session details' })
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Session details' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(trigger.inert).toBe(true)
    expect(screen.getByRole('tab', { name: 'Family' })).toHaveFocus()
    const last = screen.getByRole('link', { name: 'Worker' })
    last.focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close session details' })).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger.inert).toBe(false)
    expect(screen.getByRole('textbox', { name: 'Retained draft' })).toHaveValue('keep this')
    vi.unstubAllGlobals()
  })
})

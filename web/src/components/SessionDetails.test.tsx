import { useRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SessionDetails from './SessionDetails'

function View() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  return <><button ref={ref} onClick={() => setOpen(true)}>Session details</button><input aria-label="Retained draft" defaultValue="keep this" /><SessionDetails open={open} onClose={() => setOpen(false)} trigger={ref}><a href="/sessions/child">Worker</a></SessionDetails></>
}

describe('SessionDetails', () => {
  it('offers semantic arrow/Home/End tabs and empty states without inventing plan data', async () => {
    render(<View />)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Session details', exact: true }))
    const family = screen.getByRole('tab', { name: 'Family', exact: true })
    expect(family).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(family, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Plan', exact: true })).toHaveFocus()
    expect(screen.getByText('No plan has been shared.', { exact: true })).toBeVisible()
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Details', exact: true })).toHaveFocus()
    expect(screen.getByRole('region', { name: 'MCP delivery', exact: true })).toHaveTextContent('unknown')
    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(family).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Worker', exact: true })).toBeVisible()
  })

  it('makes the phone sheet modal, traps focus, preserves drafts and returns focus on Escape', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query === '(max-width: 1023px)', addEventListener() {}, removeEventListener() {} })))
    render(<View />)
    const trigger = screen.getByRole('button', { name: 'Session details', exact: true })
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Session details', exact: true })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(trigger.inert).toBe(true)
    expect(screen.getByRole('tab', { name: 'Family', exact: true })).toHaveFocus()
    const last = screen.getByRole('link', { name: 'Worker', exact: true })
    last.focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close session details', exact: true })).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger.inert).toBe(false)
    expect(screen.getByRole('textbox', { name: 'Retained draft', exact: true })).toHaveValue('keep this')
    vi.unstubAllGlobals()
  })
})

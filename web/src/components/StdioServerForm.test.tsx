import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import StdioServerForm from './StdioServerForm'

it('a locked value field sends no draft update, even for a queued change event', () => {
  const change = vi.fn()
  render(<StdioServerForm draft={{ id: 1, name: 'local', command: 'tool', args: [], env: [{ id: 2, name: 'TOKEN', keep: false }] }} locked allocate={() => 3} change={change} remove={vi.fn()} input={vi.fn()} clear={vi.fn()} />)
  const field = screen.getByRole('textbox', { name: 'Value for TOKEN' })
  expect(field).toHaveAttribute('readonly')
  fireEvent.change(field, { target: { value: 'late input event' } })
  expect(change).not.toHaveBeenCalled()
})

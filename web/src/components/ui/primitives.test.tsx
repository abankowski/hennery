import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Button, IconButton } from './Button'
import { Input, Select, Textarea } from './Field'
import { RadioGroup } from './RadioGroup'
import { StatusBadge } from './Badge'
import { HatChip } from './Badge'
import { deriveAccent } from '../../lib/accent'
import { setAppearance } from '../../lib/theme'

describe('shared native controls', () => {
  it('associates labels, hints and errors with their fields', () => {
    render(<><Input label="Project" hint="Canonical path" error="Unavailable" /><Select label="Model"><option>Default</option></Select><Textarea label="Prompt" /></>)
    const project = screen.getByRole('textbox', { name: 'Project' })
    expect(project).toHaveAttribute('aria-invalid', 'true')
    expect(project).toHaveAccessibleDescription('Canonical path Unavailable')
    expect(screen.getByRole('combobox', { name: 'Model' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Prompt' })).toBeInTheDocument()
  })
  it('does not submit implicitly and names icon actions independently of SVG paths', async () => {
    render(<><Button disabled>Save</Button><IconButton icon="x-mark" label="Close panel" /><StatusBadge status="wait">Needs permission</StatusBadge></>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'Close panel' }).querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Needs permission', { exact: true })).toBeInTheDocument()
  })
  it('uses native radio keyboard behavior and catalog-provided values', async () => {
    const changes: string[] = []
    render(<RadioGroup label="Effort" value="standard" options={[{ value: 'standard', label: 'Standard' }, { value: 'extended', label: 'Extended' }]} onChange={(v) => changes.push(v)} />)
    const standard = screen.getByRole('radio', { name: 'Standard' })
    standard.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(changes).toEqual(['extended'])
  })
  it('updates a scoped palette with appearance without changing the overview hat', () => {
    localStorage.setItem('hennery.hat', 'overview-hat')
    setAppearance('light')
    render(<HatChip colour="#ff00ff">Session hat</HatChip>)
    const chip = screen.getByText('Session hat', { exact: true })
    expect(chip.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#ff00ff').light.accent)
    act(() => setAppearance('dark'))
    expect(chip.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#ff00ff').dark.accent)
    expect(localStorage.getItem('hennery.hat')).toBe('overview-hat')
  })
})

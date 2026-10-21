import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Link, match } from './router'

afterEach(() => history.replaceState(null, '', '/'))

describe('match', () => {
  it.each([
    ['/', 'sessions'],
    ['/setup', 'setup'],
    ['/login', 'login'],
    ['/sessions', 'sessions'],
    ['/sessions/', 'sessions'],
    ['/new', 'new'],
    ['/needs-you', 'needs-you'],
    ['/more', 'more'],
    ['/defaults', 'defaults'],
    ['/hosts', 'hosts'],
    ['/mcp', 'mcp'],
    ['/hats', 'hats'],
    ['/settings', 'settings'],
    ['/mcp/x', 'not_found'],
    ['/sessions/a/b', 'not_found'],
    ['/nope', 'not_found'],
  ])('%s is %s', (path, name) => {
    expect(match(path).name).toBe(name)
  })

  it('decodes a session id', () => {
    expect(match('/sessions/s%2F1')).toEqual({ name: 'session', id: 's/1' })
    expect(match('/sessions/%E0%A4%A')).toEqual({ name: 'not_found' })
  })
})

describe('Link', () => {
  it('navigates inside the app on a plain click', async () => {
    render(<Link to="/hats">Hats</Link>)
    const before = history.length
    await userEvent.click(screen.getByRole('link', { name: 'Hats' }))
    expect(location.pathname).toBe('/hats')
    expect(history.length).toBe(before + 1)
  })

  it('leaves a modified click to the browser', async () => {
    render(<Link to="/hats">Hats</Link>)
    const link = screen.getByRole('link', { name: 'Hats' })
    expect(link).toHaveAttribute('href', '/hats')
    link.addEventListener('click', (e) => e.preventDefault())
    await userEvent.keyboard('{Control>}')
    await userEvent.click(link)
    await userEvent.keyboard('{/Control}')
    expect(location.pathname).toBe('/')
  })
})

it('retains a known app return route for the launcher and refuses foreign/auth return state', async () => {
  const { navigate, launcherReturn } = await import('./router')
  history.replaceState(null, '', '/hosts?pair=1')
  navigate('/new?host=h&cwd=%2Fproject')
  expect(launcherReturn()).toBe('/hosts?pair=1')
  expect(location.search).toBe('?host=h&cwd=%2Fproject')
  for (const raw of ['https://example.invalid', '//example.invalid', '/login', '/new', '/missing']) {
    history.replaceState({ launcherFrom: raw }, '', '/new')
    expect(launcherReturn()).toBe('/sessions')
  }
  history.replaceState(null, '', '/new')
  expect(launcherReturn()).toBe('/sessions')
})

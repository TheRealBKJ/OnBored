import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { currentPath, renderApp, savedState, SENIOR } from '../../test/render'

const nav = () => within(document.querySelector('aside.sidebar') as HTMLElement)

describe('Layout', () => {
  it('shows new-engineer nav with an unread badge on Messages', () => {
    renderApp('/')
    expect(nav().getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(nav().getByRole('link', { name: 'My plan' })).toBeInTheDocument()
    expect(nav().getByRole('link', { name: /Messages/ })).toHaveTextContent('Messages2')
  })

  it('shows senior nav labels', () => {
    renderApp('/', { as: SENIOR })
    expect(nav().getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(nav().getByRole('link', { name: 'Starter tasks' })).toBeInTheDocument()
    expect(nav().getByRole('link', { name: 'Messages' })).not.toHaveTextContent(/\d/)
  })

  it('switches the demo user and returns home', async () => {
    const { user } = renderApp('/tasks')
    await user.selectOptions(screen.getByDisplayValue('Sam Rivera'), 'Priya Raman')
    expect(currentPath()).toBe('/')
    expect(savedState().currentUserId).toBe(SENIOR)
    expect(screen.getByRole('heading', { name: /Good to see you, Priya/ })).toBeInTheDocument()
  })

  it('resets demo data only after confirming', async () => {
    const { user } = renderApp('/', { tweak: s => { s.docs = [] } })
    vi.mocked(confirm).mockReturnValueOnce(false)
    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    expect(savedState().docs).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    expect(savedState().docs.length).toBeGreaterThan(0)
  })
})

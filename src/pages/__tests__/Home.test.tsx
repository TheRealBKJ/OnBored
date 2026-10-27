import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { currentPath, renderApp, SENIOR } from '../../test/render'

const card = (heading: string) => within(screen.getByRole('heading', { name: heading }).closest('.card') as HTMLElement)

describe('Home (new engineer)', () => {
  it('greets the hire with plan progress', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: 'Welcome back, Sam' })).toBeInTheDocument()
    expect(screen.getByText(/6 steps left/)).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('lists the next unfinished steps with deep links', () => {
    renderApp('/')
    const up = card('Up next')
    expect(up.getByRole('link', { name: /ADR-012: Event-sourced dispatch/ })).toHaveAttribute('href', '/library/doc-adr12')
    expect(up.getByRole('link', { name: /Test scoring tie-breaks/ })).toHaveAttribute('href', '/tasks?open=t-1')
  })

  it('shows assigned tasks then unassigned suggestions', () => {
    renderApp('/')
    const tasks = card('My tasks')
    expect(tasks.getByRole('link', { name: /scoring tie-breaks/ })).toHaveTextContent('in progress')
    expect(tasks.getAllByText('Suggested')).toHaveLength(3)
  })

  it('says so when no plan is assigned', () => {
    renderApp('/', { tweak: s => { s.plans = [] } })
    expect(screen.getByText(/No plan assigned yet/)).toBeInTheDocument()
    expect(screen.getByText(/Plan complete/)).toBeInTheDocument()
  })

  it('links each area owner to a direct message', async () => {
    const { user } = renderApp('/')
    const owners = card('Who owns what')
    expect(owners.getByText('Dana Okafor')).toBeInTheDocument()
    await user.click(owners.getAllByRole('link')[0])
    expect(currentPath()).toMatch(/^\/messages/)
  })
})

describe('Home (senior)', () => {
  it('shows ramp stats and each hire with their plan progress', () => {
    renderApp('/', { as: SENIOR })
    expect(screen.getByRole('heading', { name: /Good to see you, Priya/ })).toBeInTheDocument()
    expect(screen.getByText('New engineers ramping').previousSibling).toHaveTextContent('2')
    const hires = card('New engineers')
    expect(hires.getByText('Sam Rivera')).toBeInTheDocument()
    expect(hires.getByText('5/11')).toBeInTheDocument()
  })

  it('lists unread questions waiting on the senior', () => {
    renderApp('/', {
      as: SENIOR,
      tweak: s => { s.threads[1].messages.push({ id: 'm-q', fromId: 'u-sam', body: 'One more question', at: new Date().toISOString() }) },
    })
    expect(card('Waiting on you').getByRole('link', { name: /Tie-break test/ })).toHaveAttribute('href', '/messages/th-2')
  })

  it('is all caught up with nothing unread', () => {
    renderApp('/', { as: SENIOR })
    expect(screen.getByText('All caught up.')).toBeInTheDocument()
  })
})

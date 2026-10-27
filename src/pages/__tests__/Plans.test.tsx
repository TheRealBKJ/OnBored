import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { currentPath, renderApp, savedState, SENIOR, NEW_HIRE } from '../../test/render'

const step = (title: string) => within(screen.getByText(title).closest('.list-item') as HTMLElement)

describe('Plans (new engineer)', () => {
  it('opens the only assigned plan directly', () => {
    renderApp('/plans')
    expect(screen.getByRole('heading', { name: 'Backend onboarding: Dispatch team' })).toBeInTheDocument()
    expect(screen.getByText('5 of 11 done')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit plan/ })).not.toBeInTheDocument()
  })

  it('checks and unchecks a step', async () => {
    const { user } = renderApp('/plans')
    await user.click(step('ADR-012: Event-sourced dispatch').getByTitle('Mark done'))
    expect(screen.getByText('6 of 11 done')).toBeInTheDocument()
    expect(savedState().progress[NEW_HIRE]).toContain('pi-6')
    await user.click(step('ADR-012: Event-sourced dispatch').getByTitle('Mark done'))
    expect(screen.getByText('5 of 11 done')).toBeInTheDocument()
  })

  it('does not let task steps be checked by hand', () => {
    renderApp('/plans')
    expect(step('Test scoring tie-breaks').getByTitle('Completes when the task is marked done')).toBeDisabled()
  })

  it('lists plans to choose from when there are several', () => {
    renderApp('/plans', { tweak: s => { s.plans[1].assigneeIds.push(NEW_HIRE) } })
    expect(screen.getByRole('heading', { name: 'My plans' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /onboarding|intern plan/ }).length).toBeGreaterThanOrEqual(2)
  })
})

describe('Plans (senior)', () => {
  it('lists every plan with each assignee', () => {
    renderApp('/plans', { as: SENIOR })
    expect(screen.getByRole('heading', { name: 'Onboarding plans' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Backend onboarding/ })).toHaveTextContent('45%')
    expect(screen.getByRole('link', { name: /Frontend intern plan/ })).toBeInTheDocument()
  })

  it('creates a plan from a template and assigns it', async () => {
    const { user } = renderApp('/plans', { as: SENIOR })
    await user.click(screen.getByRole('button', { name: 'New plan' }))
    const dialog = within(screen.getByRole('dialog', { name: 'New onboarding plan' }))
    await user.type(dialog.getByPlaceholderText('Backend onboarding: Billing'), 'Billing plan')
    await user.selectOptions(dialog.getByDisplayValue('Blank plan'), 'Copy of: Backend onboarding: Dispatch team')
    await user.click(dialog.getByRole('button', { name: 'Alex Kim · Frontend' }))
    await user.click(dialog.getByRole('button', { name: 'Create plan' }))
    const plan = savedState().plans[0]
    expect(plan).toMatchObject({ title: 'Billing plan', assigneeIds: ['u-alex'], authorId: SENIOR })
    expect(plan.phases).toHaveLength(3)
    expect(plan.phases[0].items[0].id).not.toBe('pi-1') // copied items get fresh ids
    expect(currentPath()).toBe(`/plans/${plan.id}`)
  })

  it('edits a plan: adds a meeting step and a phase', async () => {
    const { user } = renderApp('/plans/p-backend', { as: SENIOR })
    await user.click(screen.getByRole('button', { name: 'Edit plan' }))
    await user.click(screen.getAllByRole('button', { name: 'Add step' })[0])
    const dialog = within(screen.getByRole('dialog', { name: 'Add a step' }))
    await user.click(dialog.getByRole('button', { name: 'Meet someone' }))
    await user.type(dialog.getByPlaceholderText('30 min with Dana on the gateway'), 'Coffee with Marcus')
    await user.click(dialog.getByRole('button', { name: 'Add step' }))
    await user.click(screen.getByRole('button', { name: 'Add phase' }))
    const plan = savedState().plans.find(p => p.id === 'p-backend')!
    expect(plan.phases[0].items.at(-1)).toMatchObject({ type: 'meet', title: 'Coffee with Marcus' })
    expect(plan.phases).toHaveLength(4)
  })

  it('switches whose progress is shown and toggles assignees', async () => {
    const { user } = renderApp('/plans/p-backend', { as: SENIOR })
    expect(screen.getByText('5 of 11 done')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Alex Kim' }))
    expect(savedState().plans.find(p => p.id === 'p-backend')!.assigneeIds).toEqual(['u-sam', 'u-alex'])
    await user.selectOptions(screen.getByLabelText(/Showing progress for/), 'Alex Kim')
    expect(screen.getByText('0 of 11 done')).toBeInTheDocument()
  })

  it('deletes a plan after confirming', async () => {
    const { user } = renderApp('/plans/p-frontend', { as: SENIOR })
    await user.click(screen.getByRole('button', { name: 'Edit plan' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(savedState().plans.map(p => p.id)).toEqual(['p-backend'])
    expect(currentPath()).toBe('/plans')
  })

  it('shows not found for a bad id', () => {
    renderApp('/plans/nope', { as: SENIOR })
    expect(screen.getByText(/Plan not found/)).toBeInTheDocument()
  })
})

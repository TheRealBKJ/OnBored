import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { currentPath, renderApp, savedState, SENIOR, NEW_HIRE } from '../../test/render'

const column = (label: string) => within(screen.getByText(label).closest('.col') as HTMLElement)
const task = (id: string) => savedState().tasks.find(t => t.id === id)!

describe('Tasks board', () => {
  it('shows a hire their tasks plus unassigned ones, by status', () => {
    renderApp('/tasks')
    expect(column('In progress').getByRole('button', { name: /scoring tie-breaks/ })).toBeInTheDocument()
    expect(column('Up for grabs').getAllByRole('button')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Loads table/ })).not.toBeInTheDocument() // Alex's
  })

  it('filters by source and by whose tasks', async () => {
    const { user } = renderApp('/tasks')
    await user.click(screen.getByRole('button', { name: 'Senior picks' }))
    expect(screen.queryByRole('button', { name: /lint warnings/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'All sources' }))
    await user.selectOptions(screen.getByDisplayValue('Mine + unassigned'), "Everyone's tasks")
    expect(screen.getByRole('button', { name: /Loads table/ })).toBeInTheDocument()
  })

  it('walks a task from pick-up to review to approved', async () => {
    const { user, unmount } = renderApp('/tasks?open=t-2')
    let dialog = within(screen.getByRole('dialog', { name: 'Starter task' }))
    await user.click(dialog.getByRole('button', { name: 'Pick this up' }))
    expect(task('t-2')).toMatchObject({ assigneeId: NEW_HIRE, status: 'in_progress' })
    await user.click(dialog.getByRole('button', { name: 'Submit for review' }))
    expect(task('t-2').status).toBe('review')
    unmount()

    const state = savedState()
    renderApp('/tasks?open=t-2', { as: SENIOR, tweak: s => { s.tasks = state.tasks } })
    dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: 'Approve' }))
    expect(task('t-2').status).toBe('done')
  })

  it('asks the recommending senior from the task, reusing the existing thread', async () => {
    const { user } = renderApp('/tasks?open=t-1')
    await user.click(screen.getByRole('button', { name: 'Ask Priya' }))
    expect(currentPath()).toBe('/messages/th-2')
  })

  it('keeps the status locked for someone else\'s task', () => {
    renderApp('/tasks?open=t-2')
    expect(within(screen.getByRole('dialog')).getByDisplayValue('Up for grabs')).toBeDisabled()
  })

  it('lets a senior recommend, edit and delete a task', async () => {
    const { user } = renderApp('/tasks', { as: SENIOR })
    await user.click(screen.getByRole('button', { name: 'Recommend a task' }))
    let dialog = within(screen.getByRole('dialog', { name: 'Recommend a starter task' }))
    expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.type(dialog.getByPlaceholderText('Add retry metrics to the payout job'), 'Add payout metrics')
    await user.selectOptions(dialog.getByDisplayValue('Anyone'), 'Sam Rivera')
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    const created = savedState().tasks[0]
    expect(created).toMatchObject({ title: 'Add payout metrics', source: 'senior', recommendedById: SENIOR, assigneeId: NEW_HIRE })

    await user.click(screen.getByRole('button', { name: /Add payout metrics/ }))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    dialog = within(screen.getByRole('dialog', { name: 'Edit task' }))
    await user.click(dialog.getByRole('button', { name: 'Delete' }))
    expect(savedState().tasks.some(t => t.id === created.id)).toBe(false)
  })
})

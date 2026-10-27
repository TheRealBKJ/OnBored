import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { currentPath, renderApp, savedState, SENIOR } from '../../test/render'

describe('AskWhy', () => {
  it('answers from a team record and cites it', async () => {
    const { user } = renderApp('/')
    await user.type(screen.getByPlaceholderText('Why was it built this way?'), 'Why do we store money as cents?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(screen.getByText('Sources')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Why is money stored as integer cents/ })).toHaveAttribute('href', '/library/doc-why-cents')
  })

  it('runs an example question from its chip', async () => {
    const { user } = renderApp('/')
    await user.click(screen.getByRole('button', { name: 'Why is there a single API gateway?' }))
    const sources = screen.getByText('Sources').parentElement!
    expect(within(sources).getByRole('link', { name: /ADR-007/ })).toBeInTheDocument()
  })

  it('routes an unanswered question to a senior on the same track', async () => {
    const { user } = renderApp('/')
    await user.type(screen.getByPlaceholderText('Why was it built this way?'), 'Why is the office coffee so bad?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(screen.getByText(/Nothing the team has written down/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ask the area owner' }))
    const thread = savedState().threads.at(-1)!
    expect(currentPath()).toBe(`/messages/${thread.id}`)
    expect(thread.participantIds).toEqual(['u-sam', SENIOR])
    expect(thread.messages[0].body).toBe('Why is the office coffee so bad?')
  })

  it('clears back to the examples', async () => {
    const { user } = renderApp('/')
    await user.click(screen.getByRole('button', { name: 'Why do we store money as cents?' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByRole('button', { name: 'Why is dispatch event-sourced?' })).toBeInTheDocument()
  })

  it('does not offer to message an owner when a senior asks', async () => {
    const { user } = renderApp('/library', { as: SENIOR })
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    await user.type(screen.getAllByPlaceholderText('Why was it built this way?')[0], 'why cents')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(screen.queryByRole('button', { name: /Ask the area owner|Ask the owner/ })).not.toBeInTheDocument()
  })
})

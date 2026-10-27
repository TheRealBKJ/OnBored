import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { currentPath, renderApp, savedState, SENIOR, NEW_HIRE } from '../../test/render'

const thread = () => within(document.querySelector('.chat-main') as HTMLElement)

describe('Messages', () => {
  it('opens the newest thread and marks it read', () => {
    renderApp('/messages')
    expect(thread().getByText('Tie-break test')).toBeInTheDocument()
    expect(savedState().reads[NEW_HIRE]).toEqual(['th-2:m-4'])
  })

  it('links the thread to what it is about', () => {
    renderApp('/messages/th-1')
    expect(thread().getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/codebase?area=a-billing')
    expect(thread().getByRole('link', { name: /Saved as a why record/ })).toHaveAttribute('href', '/library/doc-why-cents')
  })

  it('sends a message with Enter', async () => {
    const { user } = renderApp('/messages/th-2')
    await user.type(thread().getByPlaceholderText('Message Priya…'), 'Thanks!{Enter}')
    expect(thread().getByText('Thanks!')).toBeInTheDocument()
    expect(savedState().threads.find(t => t.id === 'th-2')!.messages.at(-1)).toMatchObject({ fromId: NEW_HIRE, body: 'Thanks!' })
  })

  it('does not send blank messages', async () => {
    const { user } = renderApp('/messages/th-2')
    await user.type(thread().getByPlaceholderText('Message Priya…'), '   {Enter}')
    expect(savedState().threads.find(t => t.id === 'th-2')!.messages).toHaveLength(2)
  })

  it('starts a new conversation', async () => {
    const { user } = renderApp('/messages')
    await user.click(screen.getByRole('button', { name: 'New message' }))
    const dialog = within(screen.getByRole('dialog', { name: 'New message' }))
    expect(dialog.getByRole('button', { name: 'Send' })).toBeDisabled()
    await user.selectOptions(dialog.getByLabelText('To'), 'u-dana')
    await user.type(dialog.getByLabelText('Subject'), 'Gateway timeouts')
    await user.type(dialog.getByLabelText('Message'), 'What is the default timeout?')
    await user.click(dialog.getByRole('button', { name: 'Send' }))
    const t = savedState().threads.at(-1)!
    expect(t).toMatchObject({ subject: 'Gateway timeouts', participantIds: [NEW_HIRE, 'u-dana'] })
    expect(currentPath()).toBe(`/messages/${t.id}`)
  })

  it('?to= prefills the recipient when there is no thread yet', () => {
    renderApp('/messages?to=u-dana')
    expect(within(screen.getByRole('dialog', { name: 'New message' })).getByLabelText('To')).toHaveValue('u-dana')
  })

  it('?to= jumps to an existing direct thread', () => {
    renderApp('/messages?to=u-dana', { tweak: s => { s.threads.push({ id: 'th-dm', participantIds: [NEW_HIRE, 'u-dana'], subject: 'hi', messages: [] }) } })
    expect(currentPath()).toBe('/messages/th-dm')
  })

  it('lets a senior save their answer as a why record', async () => {
    const { user } = renderApp('/messages/th-2', { as: SENIOR })
    expect(thread().getAllByRole('button', { name: 'Save as why' })).toHaveLength(1)
    await user.click(thread().getByRole('button', { name: 'Save as why' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Save as a why record' }))
    expect((dialog.getByLabelText('The question') as HTMLInputElement).value).toMatch(/fixture helper/)
    await user.type(dialog.getByLabelText('Tags'), 'testing, dispatch')
    await user.click(dialog.getByRole('button', { name: 'Save to Library' }))
    const doc = savedState().docs[0]
    expect(doc).toMatchObject({ kind: 'why', authorId: SENIOR, tags: ['testing', 'dispatch'], areaId: 'a-dispatch' })
    expect(currentPath()).toBe(`/library/${doc.id}`)
  })

  it('does not offer Save as why to new engineers', () => {
    renderApp('/messages/th-2')
    expect(screen.queryByRole('button', { name: 'Save as why' })).not.toBeInTheDocument()
  })
})

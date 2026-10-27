import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { currentPath, renderApp, savedState, SENIOR } from '../../test/render'

const list = () => within(document.querySelector('.split .card .list') as HTMLElement)

describe('Library', () => {
  it('filters docs to the hire\'s track', () => {
    renderApp('/library')
    expect(screen.getByText(/Filtered to Backend and everyone/)).toBeInTheDocument()
    expect(list().getByRole('link', { name: /ADR-012/ })).toBeInTheDocument()
    expect(list().queryByRole('link', { name: /ADR-015/ })).not.toBeInTheDocument()
  })

  it('searches, and filters by kind and area', async () => {
    const { user } = renderApp('/library')
    await user.type(screen.getByPlaceholderText('Search titles, questions, tags…'), 'cents')
    expect(list().getAllByRole('link')).toHaveLength(1)
    await user.clear(screen.getByPlaceholderText('Search titles, questions, tags…'))
    await user.click(screen.getByRole('button', { name: 'Guides' }))
    expect(list().getAllByRole('link').map(a => a.textContent)).toEqual([
      expect.stringContaining('Local dev setup'), expect.stringContaining('How we do code review'),
    ])
    await user.click(screen.getByRole('button', { name: 'All' }))
    await user.selectOptions(screen.getByDisplayValue('All areas'), 'Billing')
    expect(list().getAllByRole('link')).toHaveLength(1)
  })

  it('shows an empty state when nothing matches', async () => {
    const { user } = renderApp('/library')
    await user.type(screen.getByPlaceholderText('Search titles, questions, tags…'), 'zzzz')
    expect(screen.getByText('No documents match.')).toBeInTheDocument()
  })

  it('hides Add document from new engineers', () => {
    renderApp('/library')
    expect(screen.queryByRole('button', { name: 'Add document' })).not.toBeInTheDocument()
  })

  it('lets a senior publish a decision record', async () => {
    const { user } = renderApp('/library', { as: SENIOR })
    await user.click(screen.getByRole('button', { name: 'Add document' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Add to the library' }))
    await user.click(dialog.getByRole('button', { name: 'Publish' }))
    expect(dialog.getByText('Give it a title.')).toBeInTheDocument()
    await user.type(dialog.getByPlaceholderText('ADR-016: Why we chose X'), 'ADR-016: Go for services')
    await user.type(dialog.getByPlaceholderText('Why does billing run as its own service?'), 'Why Go?')
    await user.click(dialog.getByRole('button', { name: 'Backend' }))
    await user.click(dialog.getByRole('button', { name: 'Publish' }))
    const doc = savedState().docs[0]
    expect(doc).toMatchObject({ kind: 'decision', title: 'ADR-016: Go for services', question: 'Why Go?', tracks: ['Backend'], authorId: SENIOR })
    expect(currentPath()).toBe(`/library/${doc.id}`)
    expect(screen.getByRole('heading', { name: 'ADR-016: Go for services' })).toBeInTheDocument()
  })

  it('reads an uploaded text file into the doc', async () => {
    const { user } = renderApp('/library?new=1', { as: SENIOR })
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: 'Upload file' }))
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await user.upload(input, new File(['# Runbook\nRestart the queue first.'], 'runbook.md', { type: 'text/markdown' }))
    await user.click(dialog.getByRole('button', { name: 'Publish' }))
    expect(savedState().docs[0]).toMatchObject({ kind: 'file', fileName: 'runbook.md', title: 'runbook', summary: 'Restart the queue first.' })
  })
})

describe('DocDetail', () => {
  it('shows the question, decision and sources, and counts a hire\'s read', () => {
    const before = renderApp('/library/doc-adr7')
    expect(screen.getByRole('heading', { name: /ADR-007/ })).toBeInTheDocument()
    expect(screen.getByText('THE QUESTION')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Decision' })).toBeInTheDocument()
    before.unmount()
    const views = savedState().docs.find(d => d.id === 'doc-adr7')!.views
    renderApp('/library/doc-adr7', { tweak: s => { s.docs.find(d => d.id === 'doc-adr7')!.views = views } })
    expect(savedState().docs.find(d => d.id === 'doc-adr7')!.views).toBe(views! + 1)
  })

  it('does not count a senior\'s read', () => {
    renderApp('/library/doc-adr7', { as: SENIOR })
    const seeded = savedState().docs.find(d => d.id === 'doc-adr7')!.views
    expect(seeded).toBe(savedState().docs.find(d => d.id === 'doc-adr7')!.views)
  })

  it('opens a thread with the author about the doc', async () => {
    const { user } = renderApp('/library/doc-adr7')
    await user.click(screen.getByRole('button', { name: /Ask Dana about this/ }))
    const t = savedState().threads.at(-1)!
    expect(t.context).toEqual({ kind: 'doc', id: 'doc-adr7' })
    expect(currentPath()).toBe(`/messages/${t.id}`)
  })

  it('lets a senior delete a doc', async () => {
    const { user } = renderApp('/library/doc-setup', { as: SENIOR })
    expect(screen.queryByRole('button', { name: /Ask .* about this/ })).toBeInTheDocument()
    await user.click(document.querySelector('button.btn.danger') as HTMLElement)
    expect(savedState().docs.some(d => d.id === 'doc-setup')).toBe(false)
    expect(currentPath()).toBe('/library')
  })

  it('shows not found for a bad id', () => {
    renderApp('/library/nope')
    expect(screen.getByText(/Document not found/)).toBeInTheDocument()
  })
})

import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { currentPath, makeState, renderApp, savedState, SENIOR, NEW_HIRE, INTERN } from '../../test/render'

const list = () => within(screen.getByTestId('doc-list') as HTMLElement)

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
  it('shows the question, decision and sources', () => {
    renderApp('/library/doc-adr7')
    expect(screen.getByRole('heading', { name: /ADR-007/ })).toBeInTheDocument()
    expect(screen.getByText('THE QUESTION')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Decision' })).toBeInTheDocument()
  })

  it('counts each hire\'s read once, however often they open it', async () => {
    const adr7 = () => savedState().docs.find(d => d.id === 'doc-adr7')!
    const seeded = makeState().docs.find(d => d.id === 'doc-adr7')!.views!
    const { user } = renderApp('/library/doc-adr7')
    expect(adr7()).toMatchObject({ views: seeded + 1, readBy: [NEW_HIRE] })
    await user.click(screen.getByRole('link', { name: '← Library' }))
    await user.click(within(screen.getByTestId('doc-list')).getByRole('link', { name: /ADR-007/ }))
    expect(adr7().views).toBe(seeded + 1)
    await user.selectOptions(screen.getByDisplayValue('Sam Rivera'), 'Alex Kim')
    await user.click(within(document.querySelector('aside.sidebar') as HTMLElement).getByRole('link', { name: 'Library' }))
    await user.click(within(screen.getByTestId('doc-list')).getByRole('link', { name: /ADR-007/ }))
    expect(adr7()).toMatchObject({ views: seeded + 2, readBy: [NEW_HIRE, INTERN] })
  })

  it('does not open a doc restricted to another track, or count it', () => {
    renderApp('/library/doc-adr12', { as: INTERN })
    expect(screen.getByText(/This document is for the Backend track/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /ADR-012/ })).not.toBeInTheDocument()
    expect(savedState().docs.find(d => d.id === 'doc-adr12')!.readBy).toBeUndefined()
  })

  it('keeps source links when a senior edits the sources', async () => {
    const { user } = renderApp('/library/doc-adr7', { as: SENIOR, tweak: s => {
      s.docs.find(d => d.id === 'doc-adr7')!.sources = [{ label: 'RFC 31', url: 'https://example.com/rfc31' }, { label: 'Postmortm' }]
    } })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const box = screen.getByLabelText(/Sources/) as HTMLTextAreaElement
    expect(box.value).toBe('RFC 31 https://example.com/rfc31\nPostmortm')
    await user.clear(box)
    await user.type(box, 'RFC 31 https://example.com/rfc31{Enter}Postmortem{Enter}https://example.com/pr/9')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(savedState().docs.find(d => d.id === 'doc-adr7')!.sources).toEqual([
      { label: 'RFC 31', url: 'https://example.com/rfc31' }, { label: 'Postmortem' }, { label: 'https://example.com/pr/9', url: 'https://example.com/pr/9' },
    ])
    expect(screen.getByRole('link', { name: 'RFC 31' })).toHaveAttribute('href', 'https://example.com/rfc31')
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

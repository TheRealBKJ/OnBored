import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { currentPath, renderApp, savedState, SENIOR, NEW_HIRE } from '../../test/render'

const detail = () => within(document.querySelector('aside.card') as HTMLElement)
const areaCard = (name: string) => screen.getAllByRole('button', { name: new RegExp(`^${name}`) })[0]

describe('Codebase map', () => {
  it('groups areas by importance and selects the first one', () => {
    renderApp('/codebase')
    expect(screen.getByText('Core: learn these first')).toBeInTheDocument()
    expect(detail().getByRole('heading', { name: 'API Gateway' })).toBeInTheDocument()
    expect(detail().getByText("WHY IT'S BUILT THIS WAY")).toBeInTheDocument()
  })

  it('selects an area from the URL and shows its docs and tasks', () => {
    renderApp('/codebase?area=a-billing')
    expect(detail().getByRole('heading', { name: 'Billing' })).toBeInTheDocument()
    expect(detail().getByRole('link', { name: /integer cents/ })).toHaveAttribute('href', '/library/doc-why-cents')
    expect(detail().getByRole('link', { name: /lint warnings/ })).toHaveAttribute('href', '/tasks?open=t-2')
  })

  it('highlights dependencies of the selected area', async () => {
    const { user } = renderApp('/codebase')
    await user.click(areaCard('Dispatch Engine'))
    expect(currentPath()).toBe('/codebase?tab=map&area=a-dispatch')
    expect(document.querySelectorAll('.area-card.dim').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dispatch Engine needs this').length).toBeGreaterThan(0)
  })

  it('opens a thread with the owner', async () => {
    const { user } = renderApp('/codebase?area=a-gateway')
    await user.click(detail().getByRole('button', { name: 'Ask' }))
    const t = savedState().threads.at(-1)!
    expect(t).toMatchObject({ participantIds: [NEW_HIRE, 'u-dana'], context: { kind: 'area', id: 'a-gateway' } })
    expect(currentPath()).toBe(`/messages/${t.id}`)
  })

  it('lets only seniors add and edit areas', async () => {
    renderApp('/codebase')
    expect(screen.queryByRole('button', { name: 'Add area' })).not.toBeInTheDocument()
  })

  it('adds an area as a senior', async () => {
    const { user } = renderApp('/codebase', { as: SENIOR })
    await user.click(screen.getByRole('button', { name: 'Add area' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Add codebase area' }))
    await user.type(dialog.getByLabelText('Name'), 'Notifications')
    await user.click(dialog.getByRole('button', { name: 'Auth' }))
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(savedState().areas.at(-1)).toMatchObject({ name: 'Notifications', dependsOn: ['a-auth'], ownerId: SENIOR })
  })

  it('deleting an area removes it from others\' dependencies', async () => {
    const { user } = renderApp('/codebase?area=a-auth', { as: SENIOR })
    await user.click(detail().getByRole('button', { name: 'Edit' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    const areas = savedState().areas
    expect(areas.some(a => a.id === 'a-auth')).toBe(false)
    expect(areas.some(a => a.dependsOn.includes('a-auth'))).toBe(false)
  })
})

describe('Codebase scanner', () => {
  afterEach(() => vi.unstubAllGlobals())

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))
  const mockGitHub = () => vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.endsWith('/repos/acme/app')) return json({ default_branch: 'main' })
    if (url.includes('/git/trees/')) return json({ tree: [
      { path: 'README.md', type: 'blob', size: 20 },
      { path: 'src/app.ts', type: 'blob', size: 50 },
      { path: 'node_modules/x.js', type: 'blob', size: 5 },
    ] })
    if (url.endsWith('README.md')) return Promise.resolve(new Response('# Acme app'))
    if (url.endsWith('src/app.ts')) return Promise.resolve(new Response('const a = 1\n// TODO: handle retries'))
    return json({}, 404)
  }))

  it('starts empty', () => {
    renderApp('/codebase?tab=scan')
    expect(screen.getByText(/No scan yet/)).toBeInTheDocument()
  })

  it('scans a public GitHub repo and lets a hire pick up a finding', async () => {
    mockGitHub()
    const { user } = renderApp('/codebase?tab=scan')
    await user.type(screen.getByPlaceholderText(/public GitHub repo/), 'github.com/acme/app')
    await user.click(screen.getByRole('button', { name: 'Scan' }))
    await screen.findByText('acme/app')
    expect(screen.getByText('Files').previousSibling).toHaveTextContent('2') // node_modules ignored
    expect(screen.getByText('README')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pick up' }))
    expect(savedState().tasks[0]).toMatchObject({ title: 'Resolve TODO: handle retries', assigneeId: NEW_HIRE, status: 'in_progress', source: 'ai' })
    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled()
  })

  it('a senior recommending a finding endorses it', async () => {
    mockGitHub()
    const { user } = renderApp('/codebase?tab=scan', { as: SENIOR })
    await user.type(screen.getByPlaceholderText(/public GitHub repo/), 'acme/app')
    await user.click(screen.getByRole('button', { name: 'Scan' }))
    await user.click(await screen.findByRole('button', { name: 'Recommend' }))
    expect(savedState().tasks[0]).toMatchObject({ source: 'senior', recommendedById: SENIOR, status: 'open' })
  })

  it('shows GitHub errors', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json({}, 404)))
    const { user } = renderApp('/codebase?tab=scan')
    await user.type(screen.getByPlaceholderText(/public GitHub repo/), 'acme/private')
    await user.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(screen.getByText('Repo not found, or it is private.')).toBeInTheDocument())
  })
})

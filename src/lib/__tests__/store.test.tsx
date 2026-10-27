import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StoreProvider, STORAGE_KEY, useStore } from '../store'
import { seed } from '../seed'

function grab() {
  let store!: ReturnType<typeof useStore>
  function Probe() { store = useStore(); return null }
  render(<StoreProvider><Probe /></StoreProvider>)
  return () => store
}

describe('store', () => {
  it('loads the seed when nothing is saved, and the saved state otherwise', () => {
    expect(grab()().state.docs).toHaveLength(seed.docs.length)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...seed, docs: [] }))
    expect(grab()().state.docs).toHaveLength(0)
  })

  it('falls back to the seed when saved data is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(grab()().state.users).toHaveLength(seed.users.length)
  })

  it('applies mutate synchronously so ids created inside it are readable right away', () => {
    const store = grab()
    let id = ''
    act(() => {
      store().mutate(s => { id = 'th-x'; s.threads.push({ id, participantIds: [], subject: '', messages: [] }) })
      store().mutate(s => { s.threads.find(t => t.id === id)!.subject = 'second mutate sees the first' })
    })
    expect(id).toBe('th-x')
    expect(store().state.threads.at(-1)!.subject).toBe('second mutate sees the first')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).threads.at(-1).id).toBe('th-x')
  })

  it('reset restores the seed', () => {
    const store = grab()
    act(() => store().mutate(s => { s.docs = [] }))
    act(() => store().reset())
    expect(store().state.docs).toHaveLength(seed.docs.length)
  })

  it('throws a clear error outside the provider', () => {
    function Bad() { useStore(); return null }
    expect(() => render(<Bad />)).toThrow('useStore outside StoreProvider')
  })
})

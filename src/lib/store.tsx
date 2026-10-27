import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppState, User } from './types'
import { seed } from './seed'

const KEY = 'layers-poc-v1'

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    // storage unavailable or corrupt: fall back to seed
  }
  return structuredClone(seed)
}

interface Store {
  state: AppState
  me: User
  /** Mutate a cloned draft; the result replaces state and is persisted. */
  mutate: (fn: (draft: AppState) => void) => void
  reset: () => void
  user: (id?: string) => User | undefined
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // quota or private mode; state still lives in memory
    }
  }, [state])

  const mutate = useCallback((fn: (draft: AppState) => void) => {
    setState(prev => {
      const draft = structuredClone(prev)
      fn(draft)
      return draft
    })
  }, [])

  const reset = useCallback(() => setState(structuredClone(seed)), [])

  const value = useMemo<Store>(() => {
    const byId = new Map(state.users.map(u => [u.id, u]))
    return {
      state,
      me: byId.get(state.currentUserId) ?? state.users[0],
      mutate,
      reset,
      user: id => (id ? byId.get(id) : undefined),
    }
  }, [state, mutate, reset])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

export const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`
export const now = () => new Date().toISOString()

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  const days = Math.floor(s / 86400)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { flushSave, StoreProvider, STORAGE_KEY } from '../lib/store'
import { seed } from '../lib/seed'
import { AppRoutes } from '../routes'
import type { AppState } from '../lib/types'

export const SENIOR = 'u-priya' // Staff Engineer, Backend, owns Dispatch + Billing
export const NEW_HIRE = 'u-sam' // Backend new hire on the Dispatch plan
export const INTERN = 'u-alex' // Frontend intern on the Web plan

let location = ''
function LocationProbe() {
  const loc = useLocation()
  location = loc.pathname + loc.search
  return null
}

/** Fresh copy of the seed data, optionally adjusted before the app loads it. */
export function makeState(as = NEW_HIRE, tweak?: (s: AppState) => void) {
  const s = structuredClone(seed)
  s.currentUserId = as
  tweak?.(s)
  return s
}

/** Render the whole app at `path`, signed in as `as`. The store loads from localStorage, so we seed it there. */
export function renderApp(path = '/', { as = NEW_HIRE, tweak }: { as?: string; tweak?: (s: AppState) => void } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState(as, tweak)))
  const user = userEvent.setup()
  const utils = render(
    <StoreProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </StoreProvider>,
  )
  return { user, ...utils }
}

/** The store persists every change; read it back to assert on data, not just the DOM. */
export function savedState(): AppState {
  flushSave()
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!)
}

export const currentPath = () => location

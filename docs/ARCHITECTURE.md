# Architecture

## The core idea: two audiences, one product

OnBored serves two people with opposite jobs:

- **New engineers** consume: follow a plan, read, explore, do small tasks, ask questions.
- **Senior engineers** author and supervise: write plans and records, map the code, recommend tasks, answer and capture answers, watch progress.

Those two experiences will keep drifting apart as the product grows. The code is organized so that drift happens in clearly marked places instead of in `if (senior)` checks scattered through every component.

## Structure

```
src/
  routes.tsx                 single route table
  features/<view>/           everything for one view
    index.tsx                route entry (and the role switch, if the view splits)
    Senior<View>.tsx         senior-only variant, when the page purpose differs
    NewHire<View>.tsx        new-engineer variant
    <Shared>.tsx             parts both roles use, gated by capability
    <View>.test.tsx          tests next to the code
    README.md                what the view is, who sees what, data touched, tests, next steps
  components/                shared across features
  lib/                       data model, store, permissions, pure logic
```

A file goes in `features/<view>/` when only that view uses it. It moves to `components/` or `lib/` when a second feature needs it, and not before.

## Role split: two tools

| Situation | Tool | Example |
|---|---|---|
| The page has a **different purpose** per role | `forRole(me, { senior: <A/>, new: <B/> })`, with separate files | Home: hire's next steps vs. senior's team dashboard |
| **Same page**, different powers | `can(me, 'capability')` | Plan detail: hires tick steps; seniors edit |

`forRole` takes a `Record<Role, T>`, so **adding a role is a compile error in every page that splits by role** until it decides what the new role sees. Capabilities live in one table (`lib/permissions.ts`), so moving a power between roles, or granting it to a new role, is a one-line change.

Rule of thumb: start with `can()`. When a page accumulates enough role checks that each role effectively sees a different layout, split it into `Senior<View>` and `NewHire<View>`, and move what they share into a shared component.

Likely next roles: **manager** (sees progress, does not author content), **onboarding buddy** (a peer who answers questions and can capture whys), **intern** (a new engineer with a shorter plan and no prod access). See `lib/README.md` for the steps to add one.

## Data flow

```
localStorage ⇄ StoreProvider (lib/store.tsx)
                 │  state, me, mutate(fn), user(id)
                 ▼
   features read via lib/selectors.ts, write via mutate() and lib/actions.ts
```

- `mutate(fn)` applies `fn` to a cloned draft **synchronously**, then sets state. Code like `mutate(s => { id = openThread(s, ...) }); navigate('/messages/' + id)` relies on this. (An earlier version used a lazy `setState` updater, so `id` was sometimes still empty. The tests caught it.)
- Selectors are pure functions of `AppState`, so most logic is tested without rendering.

## Backend seam

The backend should replace `StoreProvider` internals, not the features:

- Keep `useStore()`'s shape. `state` becomes cached query data, and `mutate` and `actions.ts` become API calls with optimistic updates.
- Enforce the same capabilities server-side. `can()` in the UI only decides what to show.
- Each `actions.ts` function is roughly one endpoint: `openThread`, `captureWhy`, `markRead`.
- The scanner moves server-side for private repos (GitHub App token). `findTasks` keeps returning `StarterTask[]`, so the Codebase view doesn't change.

## Styling

Tailwind v4 with tokens in `src/index.css`. See `components/README.md`.

## Testing

- `npm test` runs everything (Vitest + jsdom + Testing Library).
- Feature tests render the **whole app** with `renderApp(path, { as, tweak })` from `src/test/render.tsx`. That gives real routing, the real store and real permissions, signed in as any user, with optional changes to the seed.
- `savedState()` reads back what was persisted, so tests can assert on data as well as the DOM. `currentPath()` asserts on navigation.
- Each view is tested as both roles. When you add a capability, add a test that the other role does *not* get it.

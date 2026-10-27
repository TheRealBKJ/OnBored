# lib

Framework-light logic shared by every feature. None of these files render UI, except `store.tsx`, which provides the store context.

| File | What it is | Tests |
|---|---|---|
| `types.ts` | The data model: `User`, `Doc`, `CodeArea`, `Plan`, `StarterTask`, `Thread`, `RepoScan`, `AppState`. | none |
| `store.tsx` | `StoreProvider` and `useStore()`. State is loaded from localStorage (or the seed) and saved after every change. `mutate(fn)` clones the state, applies `fn` **synchronously** and replaces it, so code can create something and use its id on the next line. Also exports `uid`, `now`, `ago` and `STORAGE_KEY`. | `store.test.tsx` (5) |
| `permissions.ts` | **Who can do what.** `can(user, capability)`, `useCan()` and `forRole(user, { senior, new })`. See below. | `permissions.test.ts` (2) |
| `selectors.ts` | Derived data: plan progress, next steps, plans and docs visible to a user, thread order, unread state, `newHires` and `seniors`. | `selectors.test.ts` (9) |
| `actions.ts` | Multi-step state changes: `openThread` (reuses a thread with the same context), `captureWhy` (answer to doc), `markRead`. | `actions.test.ts` (5) |
| `ask.ts` | Ask-why retrieval: tokenizer, weighted field search, and `answerWhy`, which declines to answer below a confidence threshold. | `ask.test.ts` (6) |
| `scanner.ts` | Read-only repo scanner (local folder or public GitHub) plus `findTasks` heuristics (TODO/FIXME, untested files, debug output, `any`, missing READMEs) and `buildTree`. | `scanner.test.ts` (6) |
| `planItems.ts` | Icon and link target for each plan step type. | via feature tests |
| `tracks.ts` | Tracks a plan or doc can target. | none |
| `seed.ts` | Demo data for "Relay": 3 seniors, 2 hires, 8 areas, 7 docs, 5 tasks, 2 plans, 2 threads. Tests build on it, so changing seed values can break tests on purpose. | none |

## Permissions model

Roles today: `senior` and `new`. Every role-dependent behavior is one of two kinds:

1. **Different page.** Use `forRole(me, { senior: <SeniorX />, new: <NewHireX /> })`. Its type is `Record<Role, T>`, so adding a role to `Role` makes every split page fail to compile until it handles the new role. Used by Home, the Plans index, nav labels and Messages copy.
2. **Same page, different powers.** Use `can(me, 'plan.edit')`. Grants are a single table in `permissions.ts`.

To add a role (for example `manager`, or `buddy` for an onboarding buddy):

1. Add it to `Role` in `types.ts`.
2. Add its grants in `GRANTS`.
3. Fix the compile errors from `forRole`. Each one is a page that needs to decide what the new role sees.

Avoid `me.role === '...'` in feature code. `newHires()` and `seniors()` in `selectors.ts` are the only places that filter users by role.

## When the backend arrives

`store.tsx` is the seam. Keep the `useStore()` shape (`state`, `me`, `mutate`, `user`) and back it with API calls. `actions.ts` functions map onto endpoints one to one. Capabilities must also be enforced server-side; `can()` in the UI only hides buttons.

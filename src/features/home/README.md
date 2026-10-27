# Home

The landing page at `/`. It is two different pages depending on who is signed in, so it is split by role at the top.

| File | What it is |
|---|---|
| `index.tsx` | Route entry. Picks the variant with `forRole(me, { senior, new })`. |
| `NewHireHome.tsx` | The learner's day: plan progress, next steps, Ask why, tasks, the why records, who owns what. |
| `SeniorHome.tsx` | The senior's dashboard: everyone ramping, questions waiting on them, how often their records get read. |
| `Home.test.tsx` | Tests for both variants. |

## What each role sees

| | New engineer | Senior engineer |
|---|---|---|
| Header | "Day N at Relay", plan name, steps left, progress ring | Greeting, **Add doc** and **New plan** shortcuts |
| Main column | **Up next**: first 4 unfinished plan steps, deep-linked. **Ask why**. **My tasks**: assigned tasks, then 3 unassigned suggestions. | **New engineers**: each hire's plan progress, active task count and next step. A hire with no plan gets a "Create one" link. |
| Side column | **The why behind things**: decision and why records for their track. **Who owns what**: each area owner with a message button. | **Waiting on you**: unread threads. "Answer once" tip. |
| Stats | none | Hires ramping, questions waiting, whys captured, reads of your records |

## Data

Read only. Home never mutates state. It reads `plans`, `progress`, `tasks`, `docs`, `areas`, `threads` and `reads` through `lib/selectors.ts` (`plansFor`, `planProgress`, `nextUp`, `threadsFor`, `isUnread`, `newHires`).

## Links out

- Plan steps go wherever `itemHref` (`lib/planItems.ts`) points: `/library/:id`, `/tasks?open=:id` or `/codebase?area=:id`.
- Owner chat buttons go to `/messages?to=:userId`, which opens the existing direct thread or a prefilled compose dialog.

## Tests (8)

- Greeting, steps left and progress percentage.
- **Up next** deep links point to the right doc and task.
- **My tasks** order, and the "Suggested" badge on unassigned tasks.
- Empty states when no plan is assigned.
- Owner list links to Messages.
- Senior stats and per-hire progress (`5/11`).
- **Waiting on you** lists only unread threads, and shows "All caught up" when there are none.

## Next

- Senior: flag hires who are stalled (no progress in N days) at the top, not just a progress bar.
- New engineer: a "this week" view scoped to the current plan phase rather than the next 4 steps overall.
- Both: once there is a backend, these become summary endpoints. Today every number is computed client-side from the full state.

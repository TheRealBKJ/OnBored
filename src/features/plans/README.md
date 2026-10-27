# Plans

Onboarding plans: role-specific checklists, phase by phase (for example "Week 1: Get running"), of things to **read**, **explore**, **do** and **meet**. Seniors write them; new engineers work through them.

Routes: `/plans` (index, split by role) and `/plans/:id` (detail, shared, gated by capability).

| File | What it is |
|---|---|
| `index.tsx` | `/plans` entry. `forRole` picks `SeniorPlans` or `NewHirePlans`. Re-exports `PlanDetail`. |
| `SeniorPlans.tsx` | Every plan as a card, plus **New plan**. |
| `NewHirePlans.tsx` | Only assigned plans. With exactly one plan it renders `PlanDetail` directly. |
| `PlanCard.tsx` | Card used by both indexes: track, step count, each assignee's progress. |
| `PlanDetail.tsx` | The plan itself. Checklist for hires; editor and progress viewer for seniors. |
| `NewPlanModal.tsx` | Create a plan, blank or copied from an existing one, and assign hires. |
| `AddItemModal.tsx` | Add a step that links to a doc, task or area, or a free-text "meet someone" step. |
| `Plans.test.tsx` | Tests. |

## What each role sees

| | New engineer | Senior engineer |
|---|---|---|
| `/plans` | Their plan, opened directly (or a list if they have several). | All plans with progress per assignee. **New plan**. |
| Checkboxes | Can tick steps (`plan.checkOff`). Task steps tick themselves when the task is done. | Read-only. |
| Progress shown | Their own. | Any assignee's, via "Showing progress for" (`progress.viewOthers`). |
| Editing | none | **Edit plan** (`plan.edit`): rename, edit phases and goals, add or remove steps and phases, assign hires, delete. |

## Data

- `state.plans`: created, edited and deleted here.
- `state.progress[userId]`: list of completed plan item ids, toggled by the hire.
- Progress is computed by `planProgress` in `lib/selectors.ts`. A `task` step counts as done when its task's status is `done`, so seniors approving work moves the hire's plan forward automatically.
- Copying a plan clones its phases and gives every phase and item a fresh id, so progress on the original never leaks into the copy.

## Tests (10)

- The hire lands straight in their plan, and can tick and untick steps.
- Task steps can't be ticked by hand.
- The list view appears when a hire has more than one plan.
- Senior list and progress.
- Creating a plan from a template, including fresh ids and assignment.
- Adding a meet step and a phase.
- Switching which hire's progress is shown.
- Delete-with-confirm.
- Not found.

## Next

- Templates as a first-class thing (a "Backend template" separate from Sam's copy), so editing a template does not require cloning.
- Due dates per phase, and a nudge to the senior when a phase runs over.
- Reordering steps (drag and drop) in edit mode.
- When a manager or buddy role arrives, add `progress.viewOthers` to it in `lib/permissions.ts`. `PlanDetail` needs no change.

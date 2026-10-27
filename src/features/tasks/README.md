# Tasks

The starter-task board at `/tasks`: small, real changes picked to teach one part of the codebase each. Tasks come from two sources, shown with a badge: **Senior pick** (recommended by a senior) and **Found by scan** (from the Codebase scanner).

Routes: `/tasks`, `/tasks?open=:id` (task dialog), `/tasks?new=1` (recommend dialog).

| File | What it is |
|---|---|
| `Tasks.tsx` | Four columns (Up for grabs, In progress, In review, Done), a source filter, and a "whose tasks" filter. |
| `TaskModal.tsx` | One task: what, where (file:line plus snippet), what you'll learn, area, helper, assignee, status, and the actions for the current role. |
| `TaskEditor.tsx` | Recommend a new task, or edit and delete one. |
| `columns.ts` | Status to column label mapping, shared by the board and the status select. |
| `Tasks.test.tsx` | Tests. |

## Lifecycle

```
open ──Pick this up──▶ in_progress ──Submit for review──▶ review ──Approve──▶ done
       (new engineer)                (assignee)                    (senior)
```

When a task reaches `done`, any plan step that points at it counts as complete (see `features/plans`).

## What each role sees

| | New engineer | Senior engineer |
|---|---|---|
| Default filter | Mine + unassigned | Everyone's tasks |
| Actions | **Pick this up** (`task.pickUp`), **Submit for review** on their own task, **Ask {helper}** | **Recommend a task** (`task.recommend`), **Edit** and **Delete** (`task.edit`), set assignee (`task.assign`), **Approve** (`task.approve`) |
| Status select | Only on their own tasks, and without **Done**: only a senior's **Approve** finishes a task. Locked once done. | Always, any column |

**Ask {helper}** messages the recommender, or else the area owner, or else any senior. It reuses an existing thread about the same task.

## Data

`state.tasks` is created, edited, assigned, moved and deleted here. Scan findings also land here, from `features/codebase`.

## Tests (9)

- The hire's default view hides other people's tasks.
- Source and owner filters.
- Full lifecycle across both roles: pick up, submit, approve.
- Ask reuses the existing thread.
- Status is locked on other people's tasks.
- A senior recommends, edits and deletes a task.
- The assignee's status select has no Done, and locks once a task is approved; seniors get every column.

## Next

- Link a PR to a task, and move it to review or done from the PR's state (GitHub webhook) instead of by hand.
- Cap how many tasks a hire can hold in progress, so they finish before picking up more.
- Drag and drop between columns for seniors.

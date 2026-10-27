# Codebase

Two tabs at `/codebase`:

1. **Architecture map** (`?tab=map`, the default): the codebase areas seniors have mapped, each with what it does, *why it is built that way*, gotchas, owner, dependencies, and the docs and tasks attached to it.
2. **Scan a repo** (`?tab=scan`): a read-only scan of a local folder or a public GitHub repo that finds small first tasks.

| File | What it is |
|---|---|
| `Codebase.tsx` | Page shell and tabs. The tab lives in the URL so links can deep-link. |
| `AreaMap.tsx` | Area cards grouped core, supporting, edge. Selecting one highlights what it depends on and what uses it, and shows details in the side panel. `?area=:id` selects an area. |
| `AreaEditor.tsx` | Add, edit or delete an area. Deleting also removes it from other areas' `dependsOn`. |
| `Scanner.tsx` | Folder or GitHub input, scan results (stats, language bar, file tree, findings, README). |
| `Codebase.test.tsx` | Tests. `fetch` is mocked for the GitHub scan. |

## What each role sees

| | New engineer | Senior engineer |
|---|---|---|
| Map | Read-only. **Ask** messages the area owner, in a thread tied to the area. | **Add area** and **Edit** (`area.edit`). |
| Scan findings | **Pick up**: the finding becomes a task assigned to them, in progress, source "Found by scan". | **Recommend**, optionally with an assignee (`scan.recommend`): it becomes an open task with source "Senior pick" and them as recommender. |

## Data

- `state.areas`: edited here. Tasks and docs point at areas through `areaId`.
- `state.scan`: the last scan result (one at a time in the POC).
- Adding a finding pushes to `state.tasks`. The task's area is inferred from the file path (`area.path` prefix).
- The scanner (`lib/scanner.ts`) runs entirely in the browser. GitHub scans use the public API: 60 requests an hour without a token, and the tree plus up to 60 files are read.

## Tests (11)

- Grouping and default selection.
- `?area=` deep link with docs and tasks.
- Dependency highlighting.
- Ask the owner.
- Add area and delete area (with dependency cleanup) are senior-only.
- Scanner empty state.
- GitHub scan end to end (ignored paths, README, pick-up).
- A senior recommending a finding endorses it.
- GitHub error message.

## Next

- Draw the dependency graph (SVG edges) instead of highlighting cards. `.area-card` positions are already stable enough.
- Persist several scans per repo and diff them, so seniors see "new TODOs since last week".
- Replace the heuristics in `findTasks` with a model pass. The `StarterTask` shape it returns stays the same, so this view needs no change.
- Private repos need a backend holding a GitHub App token. Do not put tokens in the browser.

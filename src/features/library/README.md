# Library

The team's written knowledge: **decision records** (ADR-style: question, decision, alternatives, sources), **captured whys** (answers saved from Messages), **guides**, **links** and **uploaded files**. Ask why (`components/AskWhy.tsx`) answers only from what is in here.

Routes: `/library`, `/library?new=1` (opens the editor), `/library/:id`.

| File | What it is |
|---|---|
| `Library.tsx` | Search, kind chips, area filter, the list, and Ask why on the side. |
| `DocEditor.tsx` | Create or edit a doc. The fields change with the kind; it also handles file uploads. Exported for reuse. |
| `DocDetail.tsx` | One doc: question, decision, why, alternatives, sources, author, related docs, link to the original conversation. |
| `Library.test.tsx` | Tests for list, editor and detail. |

## What each role sees

| | New engineer | Senior engineer |
|---|---|---|
| Which docs | Docs for their track, plus docs for everyone. Header says "Filtered to Backend and everyone." The same rule (`canSeeDoc` in `lib/selectors.ts`) applies on the doc page, Codebase links and Home, so a direct link to another track's doc shows a notice instead. | All docs (`doc.viewAllTracks`). |
| Create | none | **Add document** (`doc.create`). |
| On a doc | **Ask {author} about this** opens a thread tied to the doc. Opening it counts as a read (`doc.countRead`). | **Edit** and **Delete** (`doc.edit`). Their reads are not counted, so the stats show real reuse by hires. |

## Data

- `state.docs`: created, edited and deleted here. Also created from Messages by `captureWhy` (`lib/actions.ts`).
- `doc.views` goes up by one the first time each new engineer opens the doc (`countRead`, tracked in `doc.readBy`), so revisits don't inflate it. Senior Home sums these as "Times your records were read".
- Sources are edited one per line as `label https://url`. A line that is only a URL becomes a linked source labelled with the URL.
- Uploads: text-like files of 512 KB or less are read into `body`. Other files are stored by name only, because the POC keeps everything in localStorage.
- Search uses `searchDocs` (`lib/ask.ts`), the same ranking as Ask why.

## Tests (14)

- Track filtering for hires.
- Search, kind and area filters, and the empty state.
- Add is hidden for hires.
- A senior publishes a decision record, including title validation and track targeting.
- Text file upload fills the title and summary.
- Detail page sections.
- Reads count once per hire across revisits, and not for seniors.
- A doc for another track shows a notice and isn't counted.
- Editing sources keeps their links.
- Ask the author.
- Senior delete.
- Not found.

## Next

- Real file storage (S3 or similar) once there is a backend. `body` should not hold file contents.
- Staleness: show "last confirmed accurate" on decision records, and prompt the owner to re-confirm after N months.
- Markdown rendering for `prose` bodies. They render as plain pre-wrapped text today.

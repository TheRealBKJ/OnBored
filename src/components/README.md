# Shared components

Used by more than one feature. Code used by a single feature belongs in that feature's folder instead.

| File | What it is | Tests |
|---|---|---|
| `Layout.tsx` | App shell: sidebar nav (labels come from `forRole`), unread count on Messages, the demo "Viewing as" user switcher, Reset demo data, and the mobile top bar. Renders the page through `<Outlet />`. | `__tests__/Layout.test.tsx` (5): nav per role, unread badge, mobile menu closes on navigation, switching user goes home, reset needs confirm |
| `AskWhy.tsx` | "Ask why" box. Searches the Library (`lib/ask.ts`) and answers only from team records, always with citations. When nothing matches it says so instead of guessing. New engineers (`ask.routeToOwner`) can send the question to the closest area owner or a senior on their track. | `__tests__/AskWhy.test.tsx` (5): cited answer, example chips, routing an unanswered question, clear, seniors don't get routing |
| `ui.tsx` | Primitives: `Avatar`, `Modal` (Escape, backdrop click and the close button all close it), `Field`, `Progress`, `Difficulty`, `SourceBadge`, `KindBadge`, `Empty`, `Icon` (inline SVG paths, no icon library). | `__tests__/ui.test.tsx` (6) |

## Styling

Tailwind v4. The design tokens and the shared primitive classes (`btn`, `card`, `badge`, `chip`, `input`, `modal`, ...) are in `src/index.css` under `@layer components`. Use those for anything that should look the same everywhere, and utilities for layout and one-offs. Colors are tokens (`bg-surface`, `text-muted`, `border-line`, `text-accent-ink`, ...) so dark mode works without `dark:` variants.

Two things to know when adding classes:

- **Don't name a component class after a Tailwind utility.** The utility layer wins. `list-item`, `ring` and `outline` were renamed to `list-row`, `progress-ring` and `outlined` for this reason.
- **Utilities beat component classes.** `className="btn mr-auto"` works as expected.

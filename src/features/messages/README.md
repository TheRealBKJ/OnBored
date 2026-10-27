# Messages

Direct conversations between new engineers and seniors. Threads can be tied to a **task**, **doc** or **area**, so the senior sees what the question is about. Seniors can turn a good answer into a **why record** in the Library: answer once, and the next hire finds it through Ask why.

Routes: `/messages`, `/messages/:id`, `/messages?to=:userId` (opens the direct thread with that person, or a compose dialog with them preselected).

| File | What it is |
|---|---|
| `Messages.tsx` | Thread list (unread in bold with a dot), active thread, **New message**, the `?to=` handling, and marking a thread read when it is opened. |
| `ThreadView.tsx` | One conversation: header with context link, messages, **Save as why** on the senior's own answers, composer (Enter sends, Shift+Enter for a new line). |
| `SaveWhyModal.tsx` | Edit the title, question, answer, area and tags, then save to the Library. |
| `ComposeModal.tsx` | Start a new thread. The recipient list shows which areas each person owns. |
| `Messages.test.tsx` | Tests. |

## What each role sees

| | New engineer | Senior engineer |
|---|---|---|
| Subtitle | "Ask the people who built it..." | "Answer once: save good answers as records..." |
| Save as why | none | On their own replies that follow someone else's question (`why.capture`). Once saved, the message shows a "Saved as a why record" link. |
| Compose default recipient | First senior | First new engineer |

## Data

- `state.threads`: created through `openThread` (`lib/actions.ts`), which reuses a thread when the same two people already have one about the same context. Messages are appended here.
- `state.reads[userId]`: one `threadId:lastMessageId` marker per thread. A thread is unread when its last message is from someone else and that marker is missing (`isUnread` in `lib/selectors.ts`).
- Save as why calls `captureWhy`. It creates a `kind: 'why'` doc authored by the senior, infers the area from the thread's context, and links the doc and the message both ways.

## Tests (11)

- Opening a thread marks it read.
- Context and saved-why links.
- Enter sends; blank messages are not sent.
- New message.
- `?to=` prefills the recipient, or jumps to the existing thread; cancelling clears the URL.
- A senior saves an answer as a why record (fields prefilled, tags, area inferred).
- Hires don't get Save as why.

## Next

- Real-time delivery (WebSocket or SSE) and notifications once there is a backend. Today the other person only sees new messages after a reload.
- Suggest Save as why automatically when a senior's reply looks like an explanation (long, contains "because").
- Slack bridge: many teams will want answers to land in Slack, with a link back here to capture the why.

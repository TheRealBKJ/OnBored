import type { AppState, Doc, Message, Thread } from './types'
import { now, uid } from './store'

/** Find an existing thread about the same context, or open a new one. Returns the thread id. */
export function openThread(s: AppState, fromId: string, toId: string, subject: string, context?: Thread['context'], firstMessage?: string) {
  let t = context && s.threads.find(t =>
    t.context?.kind === context.kind && t.context.id === context.id &&
    t.participantIds.includes(fromId) && t.participantIds.includes(toId))
  if (!t) {
    t = { id: uid('th'), participantIds: [fromId, toId], subject, context, messages: [] }
    s.threads.push(t)
  }
  if (firstMessage?.trim()) t.messages.push({ id: uid('m'), fromId, body: firstMessage.trim(), at: now() })
  return t.id
}

/** The message `answer` replies to: the latest earlier message from someone else. */
export function questionFor(t: Thread, answer: Message) {
  return t.messages.slice(0, t.messages.indexOf(answer)).reverse().find(x => x.fromId !== answer.fromId)
}

/** The codebase area a thread is about, via its area, task or doc context. */
export function threadArea(s: AppState, t: Thread) {
  const c = t.context
  if (!c) return undefined
  if (c.kind === 'area') return c.id
  if (c.kind === 'task') return s.tasks.find(x => x.id === c.id)?.areaId
  return s.docs.find(x => x.id === c.id)?.areaId
}

/** Count a new engineer's read of a doc once per person, however often they open it. */
export function countRead(s: AppState, docId: string, userId: string) {
  const d = s.docs.find(d => d.id === docId)
  if (!d || d.readBy?.includes(userId)) return
  d.readBy = [...(d.readBy ?? []), userId]
  d.views = (d.views ?? 0) + 1
}

/**
 * Bottom-up capture (Report 4, idea B/C): a senior's answer in chat becomes a "why" record
 * so the next hire who asks finds it in the Library without asking again.
 */
export function captureWhy(s: AppState, threadId: string, messageId: string, edits: Partial<Doc>) {
  const t = s.threads.find(t => t.id === threadId)
  const m = t?.messages.find(m => m.id === messageId)
  if (!t || !m) return
  const asked = questionFor(t, m)
  // `areaId: undefined` in edits means the senior chose "None"; only a missing key falls back to the thread's area.
  const areaId = 'areaId' in edits ? edits.areaId : threadArea(s, t)
  const doc: Doc = {
    id: uid('doc'), kind: 'why', title: edits.title || asked?.body.slice(0, 80) || t.subject,
    question: edits.question ?? asked?.body, summary: `Answered by a senior engineer in Messages.`,
    body: edits.body ?? m.body, tags: edits.tags ?? [], areaId, tracks: [],
    authorId: m.fromId, createdAt: now(), capturedFromThreadId: t.id,
    sources: [{ label: `Conversation: ${t.subject}` }], views: 0,
  }
  s.docs.unshift(doc)
  m.savedDocId = doc.id
  return doc.id
}

export function markRead(s: AppState, userId: string, t: Thread) {
  const m = t.messages[t.messages.length - 1]
  if (!m) return
  const key = `${t.id}:${m.id}`
  const list = (s.reads[userId] ??= []).filter(k => !k.startsWith(`${t.id}:`))
  list.push(key)
  s.reads[userId] = list
}

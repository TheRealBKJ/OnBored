import type { AppState, Doc, Thread } from './types'
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

/**
 * Bottom-up capture (Report 4, idea B/C): a senior's answer in chat becomes a "why" record
 * so the next hire who asks finds it in the Library without asking again.
 */
export function captureWhy(s: AppState, threadId: string, messageId: string, edits: Partial<Doc>) {
  const t = s.threads.find(t => t.id === threadId)
  const m = t?.messages.find(m => m.id === messageId)
  if (!t || !m) return
  const idx = t.messages.indexOf(m)
  const asked = [...t.messages.slice(0, idx)].reverse().find(x => x.fromId !== m.fromId)
  const areaId = t.context?.kind === 'area' ? t.context.id
    : t.context?.kind === 'task' ? s.tasks.find(x => x.id === t.context!.id)?.areaId
    : t.context?.kind === 'doc' ? s.docs.find(x => x.id === t.context!.id)?.areaId : undefined
  const doc: Doc = {
    id: uid('doc'), kind: 'why', title: edits.title || asked?.body.slice(0, 80) || t.subject,
    question: edits.question ?? asked?.body, summary: `Answered by a senior engineer in Messages.`,
    body: edits.body ?? m.body, tags: edits.tags ?? [], areaId: edits.areaId ?? areaId, tracks: [],
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

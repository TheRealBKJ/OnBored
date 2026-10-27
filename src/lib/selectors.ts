import type { AppState, Plan, PlanItem, Thread, User } from './types'

export function planItems(plan: Plan): PlanItem[] {
  return plan.phases.flatMap(p => p.items)
}

/** Progress of one user through one plan. Task items count as done when the task is done. */
export function planProgress(state: AppState, plan: Plan, userId: string) {
  const done = new Set(state.progress[userId] ?? [])
  const items = planItems(plan)
  const isDone = (it: PlanItem) =>
    done.has(it.id) || (it.type === 'task' && state.tasks.find(t => t.id === it.refId)?.status === 'done')
  const completed = items.filter(isDone).length
  return { completed, total: items.length, ratio: items.length ? completed / items.length : 0, isDone }
}

export function plansFor(state: AppState, user: User) {
  return user.role === 'new'
    ? state.plans.filter(p => p.assigneeIds.includes(user.id))
    : state.plans
}

export function nextUp(state: AppState, user: User, n = 4) {
  const out: { plan: Plan; item: PlanItem; phase: string }[] = []
  for (const plan of plansFor(state, user)) {
    const { isDone } = planProgress(state, plan, user.id)
    for (const phase of plan.phases)
      for (const item of phase.items)
        if (!isDone(item) && out.length < n) out.push({ plan, item, phase: phase.title })
  }
  return out
}

export function threadsFor(state: AppState, userId: string): Thread[] {
  return state.threads
    .filter(t => t.participantIds.includes(userId))
    .sort((a, b) => last(b).localeCompare(last(a)))
}

const last = (t: Thread) => t.messages[t.messages.length - 1]?.at ?? ''

/** A thread is unread if its last message is from someone else and we haven't opened it since. */
export function isUnread(state: AppState, t: Thread, userId: string) {
  const m = t.messages[t.messages.length - 1]
  if (!m || m.fromId === userId) return false
  return !(state.reads[userId] ?? []).includes(`${t.id}:${m.id}`)
}

export function unreadCount(state: AppState, userId: string) {
  return threadsFor(state, userId).filter(t => isUnread(state, t, userId)).length
}

export function docsFor(state: AppState, user: User) {
  return state.docs.filter(d => user.role === 'senior' || !d.tracks.length || d.tracks.includes(user.track))
}

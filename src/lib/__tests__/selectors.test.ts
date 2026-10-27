import { describe, expect, it } from 'vitest'
import { docsFor, isUnread, nextUp, planItems, planProgress, plansFor, threadsFor, unreadCount } from '../selectors'
import { makeState, NEW_HIRE, SENIOR } from '../../test/render'

const s = () => makeState()
const userOf = (state = s(), id = NEW_HIRE) => state.users.find(u => u.id === id)!

describe('planProgress', () => {
  it('counts checked items and done tasks', () => {
    const state = s()
    const plan = state.plans.find(p => p.id === 'p-backend')!
    expect(planItems(plan)).toHaveLength(11)
    const p = planProgress(state, plan, NEW_HIRE)
    expect(p.completed).toBe(5)
    expect(p.ratio).toBeCloseTo(5 / 11)
  })

  it('marks a task item done when its task is done, even if never checked', () => {
    const state = s()
    state.tasks.find(t => t.id === 't-1')!.status = 'done'
    const plan = state.plans.find(p => p.id === 'p-backend')!
    const p = planProgress(state, plan, NEW_HIRE)
    expect(p.isDone(planItems(plan).find(i => i.id === 'pi-8')!)).toBe(true)
    expect(p.completed).toBe(6)
  })

  it('returns ratio 0 for an empty plan instead of NaN', () => {
    const state = s()
    const plan = { ...state.plans[0], phases: [] }
    expect(planProgress(state, plan, NEW_HIRE).ratio).toBe(0)
  })
})

describe('plansFor / nextUp', () => {
  it('shows new engineers only their assigned plans, seniors all of them', () => {
    const state = s()
    expect(plansFor(state, userOf(state)).map(p => p.id)).toEqual(['p-backend'])
    expect(plansFor(state, userOf(state, SENIOR))).toHaveLength(state.plans.length)
  })

  it('lists the first unfinished steps in order', () => {
    const state = s()
    expect(nextUp(state, userOf(state), 3).map(x => x.item.id)).toEqual(['pi-6', 'pi-7', 'pi-8'])
  })
})

describe('threads and unread', () => {
  it('sorts threads newest first', () => {
    const state = s()
    expect(threadsFor(state, NEW_HIRE).map(t => t.id)).toEqual(['th-2', 'th-1'])
  })

  it('is unread only when the last message is from someone else and not yet read', () => {
    const state = s()
    const th2 = state.threads.find(t => t.id === 'th-2')!
    expect(isUnread(state, th2, NEW_HIRE)).toBe(true)
    expect(isUnread(state, th2, SENIOR)).toBe(false)
    state.reads[NEW_HIRE] = ['th-2:m-4']
    expect(isUnread(state, th2, NEW_HIRE)).toBe(false)
    expect(unreadCount(state, NEW_HIRE)).toBe(1)
  })
})

describe('docsFor', () => {
  it('hides docs for other tracks from new engineers', () => {
    const state = s()
    const ids = docsFor(state, userOf(state)).map(d => d.id)
    expect(ids).toContain('doc-adr12') // Backend
    expect(ids).toContain('doc-setup') // everyone
    expect(ids).not.toContain('doc-grid') // Frontend only
  })

  it('shows seniors everything', () => {
    const state = s()
    expect(docsFor(state, userOf(state, SENIOR))).toHaveLength(state.docs.length)
  })
})

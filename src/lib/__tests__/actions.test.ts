import { describe, expect, it } from 'vitest'
import { captureWhy, countRead, markRead, openThread, threadArea } from '../actions'
import { makeState, NEW_HIRE, SENIOR } from '../../test/render'

describe('openThread', () => {
  it('reuses the thread about the same context between the same people', () => {
    const s = makeState()
    const id = openThread(s, NEW_HIRE, SENIOR, 'again', { kind: 'task', id: 't-1' }, 'follow-up')
    expect(id).toBe('th-2')
    expect(s.threads).toHaveLength(2)
    expect(s.threads.find(t => t.id === 'th-2')!.messages.at(-1)!.body).toBe('follow-up')
  })

  it('opens a new thread for a new context and skips blank first messages', () => {
    const s = makeState()
    const id = openThread(s, NEW_HIRE, SENIOR, 'Dispatch?', { kind: 'area', id: 'a-dispatch' }, '   ')
    const t = s.threads.find(t => t.id === id)!
    expect(t.participantIds).toEqual([NEW_HIRE, SENIOR])
    expect(t.messages).toHaveLength(0)
  })
})

describe('captureWhy', () => {
  it('turns a senior answer into a why record linked back to the thread', () => {
    const s = makeState()
    const docId = captureWhy(s, 'th-2', 'm-4', {})!
    const doc = s.docs[0]
    expect(doc.id).toBe(docId)
    expect(doc.kind).toBe('why')
    expect(doc.question).toMatch(/fixture helper/)
    expect(doc.body).toMatch(/testutil.NewLoadEvents/)
    expect(doc.authorId).toBe(SENIOR)
    expect(doc.areaId).toBe('a-dispatch') // inherited from task t-1
    expect(doc.capturedFromThreadId).toBe('th-2')
    expect(s.threads.find(t => t.id === 'th-2')!.messages[1].savedDocId).toBe(docId)
  })

  it('saves with no area when the senior picks None', () => {
    const s = makeState()
    captureWhy(s, 'th-2', 'm-4', { areaId: undefined })
    expect(s.docs[0].areaId).toBeUndefined()
  })

  it('takes the area from a doc, task or area context', () => {
    const s = makeState()
    const t = s.threads[0]
    t.context = { kind: 'doc', id: 'doc-adr7' }
    expect(threadArea(s, t)).toBe('a-gateway')
    t.context = { kind: 'area', id: 'a-db' }
    expect(threadArea(s, t)).toBe('a-db')
    t.context = undefined
    expect(threadArea(s, t)).toBeUndefined()
  })

  it('does nothing for an unknown message', () => {
    const s = makeState()
    expect(captureWhy(s, 'th-2', 'nope', {})).toBeUndefined()
    expect(s.docs).toHaveLength(makeState().docs.length)
  })
})

describe('markRead', () => {
  it('keeps one read marker per thread', () => {
    const s = makeState()
    const t = s.threads.find(t => t.id === 'th-2')!
    markRead(s, NEW_HIRE, t)
    t.messages.push({ id: 'm-new', fromId: SENIOR, body: 'x', at: new Date().toISOString() })
    markRead(s, NEW_HIRE, t)
    expect(s.reads[NEW_HIRE]).toEqual(['th-2:m-new'])
  })
})

describe('countRead', () => {
  it('counts each reader once', () => {
    const s = makeState()
    const views = () => s.docs.find(d => d.id === 'doc-setup')!.views
    const start = views()!
    countRead(s, 'doc-setup', NEW_HIRE)
    countRead(s, 'doc-setup', NEW_HIRE)
    expect(views()).toBe(start + 1)
    countRead(s, 'doc-setup', 'u-alex')
    expect(views()).toBe(start + 2)
    countRead(s, 'nope', NEW_HIRE) // unknown doc is a no-op
  })
})

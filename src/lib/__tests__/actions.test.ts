import { describe, expect, it } from 'vitest'
import { captureWhy, markRead, openThread } from '../actions'
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

import { describe, expect, it } from 'vitest'
import { answerWhy, searchDocs, tokens } from '../ask'
import { makeState } from '../../test/render'

const { docs, areas } = makeState()

describe('tokens', () => {
  it('drops stop words and folds simple plurals', () => {
    expect(tokens('Why do we store the cents?')).toEqual(['store', 'cent'])
  })
})

describe('searchDocs', () => {
  it('ranks the record that answers the question first', () => {
    expect(searchDocs('integer cents money', docs, areas)[0].doc.id).toBe('doc-why-cents')
  })

  it('matches on area names', () => {
    expect(searchDocs('gateway', docs, areas).map(h => h.doc.id)).toContain('doc-adr7')
  })

  it('returns nothing for an empty or stop-word-only query', () => {
    expect(searchDocs('why is the', docs, areas)).toEqual([])
  })
})

describe('answerWhy', () => {
  it('answers confidently and cites the record', () => {
    const a = answerWhy('Why do we store money as cents?', docs, areas)
    expect(a.confident).toBe(true)
    expect(a.cites.map(d => d.id)).toContain('doc-why-cents')
  })

  it('admits when nothing answers the question instead of guessing', () => {
    const a = answerWhy('Why is the office coffee so bad?', docs, areas)
    expect(a.confident).toBe(false)
    expect(a.text).toMatch(/Ask the area owner/)
  })
})

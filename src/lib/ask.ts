import type { CodeArea, Doc } from './types'

/**
 * "Ask why": retrieval over the team's decision records and captured answers.
 * Every answer must cite a record; if nothing matches well we say so and route to a person
 * instead of guessing (Report 4, MVE 1 kill condition: confident answers citing the wrong record).
 * A model call can replace `compose` later; retrieval and citations stay the same.
 */

const STOP = new Set('a an the is are was were do does did why how what when where who we our you i to of in on for and or it this that with be as at by from not no use used using instead there their them so'.split(' '))

export function tokens(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(t => t.length > 1 && !STOP.has(t))
    .map(t => t.replace(/(ing|ed|es|s)$/, ''))
}

export interface Hit { doc: Doc; score: number; matched: string[] }

export function searchDocs(q: string, docs: Doc[], areas: CodeArea[] = []): Hit[] {
  const qt = [...new Set(tokens(q))]
  if (!qt.length) return []
  const areaName = new Map(areas.map(a => [a.id, a.name]))
  return docs
    .map(doc => {
      const fields: [string, number][] = [
        [doc.question ?? '', 3], [doc.title, 3], [doc.tags.join(' '), 2],
        [doc.decision ?? '', 2], [doc.summary, 1.5], [doc.body, 1], [areaName.get(doc.areaId ?? '') ?? '', 1.5],
      ]
      let score = 0
      const matched: string[] = []
      for (const t of qt) {
        let best = 0
        for (const [text, w] of fields) if (tokens(text).includes(t)) best = Math.max(best, w)
        if (best) { score += best; matched.push(t) }
      }
      // reward covering more of the question, and records that state a decision
      score *= matched.length / qt.length
      if (doc.kind === 'decision' || doc.kind === 'why') score *= 1.25
      return { doc, score, matched }
    })
    .filter(h => h.score > 0)
    .sort((a, b) => b.score - a.score)
}

export interface Answer { confident: boolean; text: string; cites: Doc[] }

export function answerWhy(q: string, docs: Doc[], areas: CodeArea[]): Answer {
  const hits = searchDocs(q, docs, areas)
  const top = hits[0]
  if (!top || top.score < 3) {
    return {
      confident: false,
      text: 'Nothing the team has written down answers this yet. Ask the area owner, and save their answer so the next person finds it here.',
      cites: hits.slice(0, 2).map(h => h.doc),
    }
  }
  const d = top.doc
  const lead = d.decision ? `${d.decision} ` : ''
  const why = firstSentences(d.body, 2)
  return { confident: true, text: `${lead}${why}`, cites: hits.filter(h => h.score >= top.score * 0.5).slice(0, 3).map(h => h.doc) }
}

function firstSentences(s: string, n: number) {
  const parts = s.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+/g) ?? [s]
  return parts.slice(0, n).join(' ').trim()
}

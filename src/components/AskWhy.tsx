import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { answerWhy } from '../lib/ask'
import type { Answer } from '../lib/ask'
import { useStore } from '../lib/store'
import { docsFor, seniors } from '../lib/selectors'
import { can } from '../lib/permissions'
import { openThread } from '../lib/actions'
import { Icon, KindBadge } from './ui'

const EXAMPLES = ['Why is there a single API gateway?', 'Why do we store money as cents?', 'Why is dispatch event-sourced?']

export function AskWhy({ compact = false }: { compact?: boolean }) {
  const { state, me, mutate } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('')
  const [ans, setAns] = useState<Answer | null>(null)

  const ask = (text = q) => {
    if (!text.trim()) return
    setQ(text); setAsked(text)
    setAns(answerWhy(text, docsFor(state, me), state.areas))
  }

  // Route an unanswered question to the owner of the closest area, or any senior.
  const askPerson = () => {
    const cite = ans?.cites[0]
    const area = state.areas.find(a => a.id === cite?.areaId)
    const to = area?.ownerId ?? seniors(state).find(u => u.track === me.track)?.id ?? seniors(state)[0].id
    let id = ''
    mutate(s => { id = openThread(s, me.id, to, asked.slice(0, 60), area ? { kind: 'area', id: area.id } : undefined, asked) })
    nav(`/messages/${id}`)
  }

  return (
    <div className="card">
      <div className="card-pad flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2"><Icon name="question" />Ask why</h2>
            {!compact && <p className="text-small text-muted">Answers come only from records your team wrote, and always cite them.</p>}
          </div>
        </div>
        <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); ask() }}>
          <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Why was it built this way?" />
          <button className="btn primary" type="submit"><Icon name="search" />Ask</button>
        </form>
        {!ans && (
          <div className="chips">
            {EXAMPLES.map(e => <button key={e} className="chip" onClick={() => ask(e)}>{e}</button>)}
          </div>
        )}
        {ans && (
          <div className={`callout ${ans.confident ? 'ai' : 'plain'}`}>
            <p className="mb-2.5">{ans.text}</p>
            {ans.cites.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-tiny text-muted">{ans.confident ? 'Sources' : 'Closest records (not a direct answer)'}</span>
                {ans.cites.map(d => (
                  <Link key={d.id} to={`/library/${d.id}`} className="flex items-center gap-2 text-small underline">
                    <KindBadge kind={d.kind} /> <span className="truncate">{d.title}</span>
                  </Link>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {can(me, 'ask.routeToOwner') && <button className="btn sm" onClick={askPerson}><Icon name="chat" size={13} />{ans.confident ? 'Still unclear? Ask the owner' : 'Ask the area owner'}</button>}
              <button className="btn ghost sm" onClick={() => { setAns(null); setQ('') }}>Clear</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore, ago } from '../../lib/store'
import { docsFor } from '../../lib/selectors'
import { can } from '../../lib/permissions'
import { searchDocs } from '../../lib/ask'
import type { DocKind } from '../../lib/types'
import { AskWhy } from '../../components/AskWhy'
import { Empty, Icon, KindBadge } from '../../components/ui'
import { DocEditor } from './DocEditor'

const KINDS: { k: DocKind | 'all'; label: string }[] = [
  { k: 'all', label: 'All' }, { k: 'decision', label: 'Decisions' }, { k: 'why', label: 'Captured whys' },
  { k: 'guide', label: 'Guides' }, { k: 'link', label: 'Links' }, { k: 'file', label: 'Files' },
]

export function Library() {
  const { state, me, user } = useStore()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<DocKind | 'all'>('all')
  const [area, setArea] = useState('')
  const creating = params.get('new') === '1'

  const visible = docsFor(state, me)
  const docs = useMemo(() => {
    let list = q.trim() ? searchDocs(q, visible, state.areas).map(h => h.doc) : visible
    if (kind !== 'all') list = list.filter(d => d.kind === kind)
    if (area) list = list.filter(d => d.areaId === area)
    return list
  }, [q, kind, area, visible, state.areas])

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Library</h1><p>Guides, decision records and the captured answers to "why is it like this?"{!can(me, 'doc.viewAllTracks') && ` Filtered to ${me.track} and everyone.`}</p></div>
        {can(me, 'doc.create') && <button className="btn primary" onClick={() => setParams({ new: '1' })}><Icon name="plus" />Add document</button>}
      </div>

      <div className="split">
        <div className="stack">
          <div className="row wrap">
            <div className="grow" style={{ minWidth: 220, position: 'relative' }}>
              <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search titles, questions, tags…" />
            </div>
            <select className="select" style={{ width: 'auto' }} value={area} onChange={e => setArea(e.target.value)}>
              <option value="">All areas</option>
              {state.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="chips">
            {KINDS.map(k => <button key={k.k} className={`chip ${kind === k.k ? 'active' : ''}`} onClick={() => setKind(k.k)}>{k.label}</button>)}
          </div>
          <div className="card">
            <div className="list">
              {docs.length === 0 && <Empty>No documents match.</Empty>}
              {docs.map(d => {
                const a = state.areas.find(a => a.id === d.areaId)
                return (
                  <Link key={d.id} to={`/library/${d.id}`} className="list-item">
                    <span style={{ color: 'var(--muted)', marginTop: 2 }}><Icon name={d.kind === 'link' ? 'link' : d.kind === 'file' ? 'file' : d.kind === 'guide' ? 'book' : 'bookmark'} /></span>
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{d.title}</div>
                      <div className="small muted" style={{ margin: '2px 0 6px' }}>{d.question && d.kind !== 'why' ? d.question : d.summary}</div>
                      <div className="row wrap tiny muted">
                        <KindBadge kind={d.kind} />
                        {a && <span className="badge outline">{a.name}</span>}
                        {d.tracks.map(t => <span key={t} className="badge outline">{t}</span>)}
                        <span>{user(d.authorId)?.name} · {ago(d.createdAt)}</span>
                        {!!d.views && <span>· read {d.views}×</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
        <div className="stack">
          <AskWhy compact />
          <div className="card card-pad small muted stack-sm">
            <h3 style={{ color: 'var(--text)' }}>What goes here</h3>
            <p><strong>Decision records</strong>: the question, what was decided, what else was considered, and the sources.</p>
            <p><strong>Captured whys</strong>: answers seniors gave in Messages, saved so nobody has to ask twice.</p>
            <p><strong>Guides, links, files</strong>: setup docs, process, runbooks.</p>
          </div>
        </div>
      </div>
      {creating && <DocEditor onClose={() => setParams({})} />}
    </div>
  )
}

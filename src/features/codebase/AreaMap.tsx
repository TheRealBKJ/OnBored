import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, uid } from '../../lib/store'
import { openThread } from '../../lib/actions'
import { can } from '../../lib/permissions'
import type { CodeArea } from '../../lib/types'
import { Avatar, Difficulty, Icon, KindBadge } from '../../components/ui'
import { AreaEditor } from './AreaEditor'

const DEPTH_LABEL: Record<CodeArea['depth'], string> = { core: 'Core: learn these first', supporting: 'Supporting', edge: 'Infrastructure & edges' }

export function AreaMap() {
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const selId = params.get('area') ?? state.areas[0]?.id
  const sel = state.areas.find(a => a.id === selId)
  const [editing, setEditing] = useState<CodeArea | null>(null)
  const canEdit = can(me, 'area.edit')

  const related = useMemo(() => {
    if (!sel) return new Set<string>()
    const usedBy = state.areas.filter(a => a.dependsOn.includes(sel.id)).map(a => a.id)
    return new Set([sel.id, ...sel.dependsOn, ...usedBy])
  }, [sel, state.areas])

  const select = (id: string) => setParams({ tab: 'map', area: id })
  const ask = (a: CodeArea) => {
    let id = ''
    mutate(s => { id = openThread(s, me.id, a.ownerId, `Question about ${a.name}`, { kind: 'area', id: a.id }) })
    nav(`/messages/${id}`)
  }

  return (
    <div className="split">
      <div className="stack" style={{ gap: 18 }}>
        <div className="row-between wrap">
          <div className="row tiny muted wrap">
            <span className="badge outline" style={{ borderLeft: '3px solid var(--accent)' }}>core</span>
            <span className="badge outline" style={{ borderLeft: '3px solid var(--senior)' }}>supporting</span>
            <span className="badge outline" style={{ borderLeft: '3px solid var(--faint)' }}>edge</span>
            <span>Select an area to highlight what it depends on and what uses it.</span>
          </div>
          {canEdit && <button className="btn sm" onClick={() => setEditing({ id: uid('a'), name: '', path: '', description: '', why: '', ownerId: me.id, depth: 'supporting', dependsOn: [], gotchas: [] })}><Icon name="plus" size={13} />Add area</button>}
        </div>
        {(['core', 'supporting', 'edge'] as const).map(depth => {
          const areas = state.areas.filter(a => a.depth === depth)
          if (!areas.length) return null
          return (
            <div key={depth}>
              <div className="nav-section" style={{ padding: '0 0 8px' }}>{DEPTH_LABEL[depth]}</div>
              <div className="grid g2">
                {areas.map(a => {
                  const tasks = state.tasks.filter(t => t.areaId === a.id && t.status !== 'done').length
                  const docs = state.docs.filter(d => d.areaId === a.id).length
                  const role = !sel || a.id === sel.id ? '' : sel.dependsOn.includes(a.id) ? 'depends on' : a.dependsOn.includes(sel.id) ? 'uses it' : ''
                  return (
                    <button key={a.id} onClick={() => select(a.id)}
                      className={`card area-card depth-${a.depth} ${a.id === sel?.id ? 'selected' : ''} ${sel && !related.has(a.id) ? 'dim' : ''}`}
                      style={{ textAlign: 'left' }}>
                      <div className="row-between"><strong>{a.name}</strong>{role && <span className="badge accent">{role === 'depends on' ? `${sel!.name} needs this` : `uses ${sel!.name}`}</span>}</div>
                      <code className="muted tiny">{a.path}</code>
                      <p className="small muted" style={{ margin: '6px 0 8px' }}>{a.description}</p>
                      <div className="row tiny muted"><Avatar user={user(a.ownerId)} size={18} />{user(a.ownerId)?.name.split(' ')[0]}<span>· {docs} docs · {tasks} tasks</span></div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {sel && (
        <aside className="card" style={{ position: 'sticky', top: 16 }}>
          <div className="card-head">
            <div><h2>{sel.name}</h2><code className="tiny muted">{sel.path}</code></div>
            {canEdit && <button className="btn sm" onClick={() => setEditing(structuredClone(sel))}><Icon name="edit" size={13} />Edit</button>}
          </div>
          <div className="card-pad stack">
            <p className="small">{sel.description}</p>
            <div className="callout small"><div className="tiny" style={{ fontWeight: 650, opacity: .8, marginBottom: 2 }}>WHY IT'S BUILT THIS WAY</div>{sel.why}</div>
            {sel.gotchas.length > 0 && (
              <div><h3 style={{ marginBottom: 4 }}>Gotchas</h3>
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{sel.gotchas.map(g => <li key={g}>{g}</li>)}</ul></div>
            )}
            <div className="row wrap small">
              <span className="muted">Depends on:</span>
              {sel.dependsOn.length ? sel.dependsOn.map(id => <button key={id} className="chip" onClick={() => select(id)}>{state.areas.find(a => a.id === id)?.name}</button>) : <span className="faint">nothing</span>}
            </div>
            <div className="divider" />
            <div className="row">
              <Avatar user={user(sel.ownerId)} />
              <div className="grow"><div className="small" style={{ fontWeight: 600 }}>{user(sel.ownerId)?.name}</div><div className="tiny muted">Owner</div></div>
              {me.id !== sel.ownerId && <button className="btn sm" onClick={() => ask(sel)}><Icon name="chat" size={13} />Ask</button>}
            </div>
            <AreaLinks area={sel} />
          </div>
        </aside>
      )}
      {editing && <AreaEditor area={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function AreaLinks({ area }: { area: CodeArea }) {
  const { state } = useStore()
  const docs = state.docs.filter(d => d.areaId === area.id)
  const tasks = state.tasks.filter(t => t.areaId === area.id && t.status !== 'done')
  return (
    <>
      {docs.length > 0 && <div className="stack-sm"><h3>Read</h3>{docs.map(d => <Link key={d.id} to={`/library/${d.id}`} className="row small"><KindBadge kind={d.kind} /><span className="truncate" style={{ textDecoration: 'underline' }}>{d.title}</span></Link>)}</div>}
      {tasks.length > 0 && <div className="stack-sm"><h3>Starter tasks here</h3>{tasks.map(t => <Link key={t.id} to={`/tasks?open=${t.id}`} className="row small"><Difficulty level={t.difficulty} /><span className="truncate" style={{ textDecoration: 'underline' }}>{t.title}</span></Link>)}</div>}
    </>
  )
}

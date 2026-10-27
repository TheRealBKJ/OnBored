import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, uid } from '../../lib/store'
import { openThread } from '../../lib/actions'
import { can } from '../../lib/permissions'
import { docsFor } from '../../lib/selectors'
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
  const visibleDocs = docsFor(state, me)
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
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-[18px]">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-tiny text-muted flex-wrap">
            <span className="badge outlined border-l-3 border-l-accent">core</span>
            <span className="badge outlined border-l-3 border-l-senior">supporting</span>
            <span className="badge outlined border-l-3 border-l-faint">edge</span>
            <span>Select an area to highlight what it depends on and what uses it.</span>
          </div>
          {canEdit && <button className="btn sm" onClick={() => setEditing({ id: uid('a'), name: '', path: '', description: '', why: '', ownerId: me.id, depth: 'supporting', dependsOn: [], gotchas: [] })}><Icon name="plus" size={13} />Add area</button>}
        </div>
        {(['core', 'supporting', 'edge'] as const).map(depth => {
          const areas = state.areas.filter(a => a.depth === depth)
          if (!areas.length) return null
          return (
            <div key={depth}>
              <div className="nav-section p-0 pb-2">{DEPTH_LABEL[depth]}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                {areas.map(a => {
                  const tasks = state.tasks.filter(t => t.areaId === a.id && t.status !== 'done').length
                  const docs = visibleDocs.filter(d => d.areaId === a.id).length
                  const role = !sel || a.id === sel.id ? '' : sel.dependsOn.includes(a.id) ? 'depends on' : a.dependsOn.includes(sel.id) ? 'uses it' : ''
                  return (
                    <button key={a.id} onClick={() => select(a.id)}
                      className={`card area-card depth-${a.depth} ${a.id === sel?.id ? 'selected' : ''} ${sel && !related.has(a.id) ? 'dim' : ''} text-left`}
                     >
                      <div className="flex items-center justify-between gap-2"><strong>{a.name}</strong>{role && <span className="badge accent">{role === 'depends on' ? `${sel!.name} needs this` : `uses ${sel!.name}`}</span>}</div>
                      <code className="text-muted text-tiny">{a.path}</code>
                      <p className="text-small text-muted mt-1.5 mb-2">{a.description}</p>
                      <div className="flex items-center gap-2 text-tiny text-muted"><Avatar user={user(a.ownerId)} size={18} />{user(a.ownerId)?.name.split(' ')[0]}<span>· {docs} docs · {tasks} tasks</span></div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {sel && (
        <aside className="card sticky top-4">
          <div className="card-head">
            <div><h2>{sel.name}</h2><code className="text-tiny text-muted">{sel.path}</code></div>
            {canEdit && <button className="btn sm" onClick={() => setEditing(structuredClone(sel))}><Icon name="edit" size={13} />Edit</button>}
          </div>
          <div className="card-pad flex flex-col gap-3">
            <p className="text-small">{sel.description}</p>
            <div className="callout text-small"><div className="text-tiny mb-0.5 font-[650] opacity-80">WHY IT'S BUILT THIS WAY</div>{sel.why}</div>
            {sel.gotchas.length > 0 && (
              <div><h3 className="mb-1">Gotchas</h3>
                <ul className="text-small m-0 list-disc pl-[18px]">{sel.gotchas.map(g => <li key={g}>{g}</li>)}</ul></div>
            )}
            <div className="flex items-center gap-2 flex-wrap text-small">
              <span className="text-muted">Depends on:</span>
              {sel.dependsOn.length ? sel.dependsOn.map(id => <button key={id} className="chip" onClick={() => select(id)}>{state.areas.find(a => a.id === id)?.name}</button>) : <span className="text-faint">nothing</span>}
            </div>
            <div className="my-1 h-px bg-line" />
            <div className="flex items-center gap-2">
              <Avatar user={user(sel.ownerId)} />
              <div className="min-w-0 flex-1"><div className="text-small font-semibold">{user(sel.ownerId)?.name}</div><div className="text-tiny text-muted">Owner</div></div>
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
  const { state, me } = useStore()
  const docs = docsFor(state, me).filter(d => d.areaId === area.id)
  const tasks = state.tasks.filter(t => t.areaId === area.id && t.status !== 'done')
  return (
    <>
      {docs.length > 0 && <div className="flex flex-col gap-1.5"><h3>Read</h3>{docs.map(d => <Link key={d.id} to={`/library/${d.id}`} className="flex items-center gap-2 text-small"><KindBadge kind={d.kind} /><span className="truncate underline">{d.title}</span></Link>)}</div>}
      {tasks.length > 0 && <div className="flex flex-col gap-1.5"><h3>Starter tasks here</h3>{tasks.map(t => <Link key={t.id} to={`/tasks?open=${t.id}`} className="flex items-center gap-2 text-small"><Difficulty level={t.difficulty} /><span className="truncate underline">{t.title}</span></Link>)}</div>}
    </>
  )
}

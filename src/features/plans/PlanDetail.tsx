import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore, uid } from '../../lib/store'
import { newHires, planProgress } from '../../lib/selectors'
import { can } from '../../lib/permissions'
import { ITEM_ICON, itemHref } from '../../lib/planItems'
import type { Plan, PlanItem } from '../../lib/types'
import { Avatar, Empty, Icon, Progress } from '../../components/ui'
import { AddItemModal } from './AddItemModal'

export function PlanDetail({ id: propId }: { id?: string }) {
  const params = useParams()
  const id = propId ?? params.id
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const plan = state.plans.find(p => p.id === id)
  const [adding, setAdding] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const canEdit = can(me, 'plan.edit')
  const canCheck = can(me, 'plan.checkOff')
  const viewsOthers = can(me, 'progress.viewOthers')
  const [viewAs, setViewAs] = useState<string>(viewsOthers ? plan?.assigneeIds[0] ?? '' : me.id)

  if (!plan) return <div className="page"><Empty>Plan not found. <Link to="/plans">Back to plans</Link></Empty></div>
  const prog = viewAs ? planProgress(state, plan, viewAs) : null

  const toggle = (item: PlanItem) => {
    if (!canCheck) return
    mutate(s => {
      const list = (s.progress[me.id] ??= [])
      const i = list.indexOf(item.id)
      if (i >= 0) list.splice(i, 1); else list.push(item.id)
    })
  }

  const edit = (fn: (p: Plan) => void) => mutate(s => { const p = s.plans.find(p => p.id === plan.id); if (p) fn(p) })

  return (
    <div className="page">
      <div className="page-head">
        <div className="max-w-160">
          {viewsOthers && <Link to="/plans" className="text-small text-muted">← All plans</Link>}
          {editing
            ? <input className="input mt-1.5 text-xl font-[650]" value={plan.title} onChange={e => edit(p => { p.title = e.target.value })} />
            : <h1 className="mt-1">{plan.title}</h1>}
          {editing
            ? <textarea className="textarea mt-2 min-h-15" value={plan.description} onChange={e => edit(p => { p.description = e.target.value })} />
            : <p>{plan.description}</p>}
          <div className="flex items-center gap-2 text-small text-muted mt-2"><span className="badge accent">{plan.track}</span>Written by <Avatar user={user(plan.authorId)} size={18} />{user(plan.authorId)?.name}</div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {editing && <button className="btn danger" onClick={() => { if (confirm('Delete this plan?')) { mutate(s => { s.plans = s.plans.filter(p => p.id !== plan.id) }); nav('/plans') } }}><Icon name="trash" />Delete</button>}
            <button className={`btn ${editing ? 'primary' : ''}`} onClick={() => setEditing(e => !e)}><Icon name={editing ? 'check' : 'edit'} />{editing ? 'Done editing' : 'Edit plan'}</button>
          </div>
        )}
      </div>

      {viewsOthers && (
        <div className="card card-pad flex items-center gap-2 flex-wrap mb-4">
          <span className="label m-0">Assigned</span>
          {newHires(state).map(u => {
            const on = plan.assigneeIds.includes(u.id)
            return (
              <button key={u.id} className={`chip ${on ? 'active' : ''}`} onClick={() => edit(p => { p.assigneeIds = on ? p.assigneeIds.filter(x => x !== u.id) : [...p.assigneeIds, u.id] })}>{u.name}</button>
            )
          })}
          <span className="min-w-0 flex-1" />
          {plan.assigneeIds.length > 0 && (
            <label className="flex items-center gap-2 text-small text-muted">Showing progress for
              <select className="select w-auto" value={viewAs} onChange={e => setViewAs(e.target.value)}>
                {plan.assigneeIds.map(id => <option key={id} value={id}>{user(id)?.name}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {prog && (
        <div className="flex items-center gap-2 mb-[18px]">
          <div className="min-w-0 flex-1"><Progress value={prog.ratio} /></div>
          <span className="text-small text-muted">{prog.completed} of {prog.total} done</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {plan.phases.map((ph, pIdx) => {
          const doneHere = prog ? ph.items.filter(prog.isDone).length : 0
          return (
            <div key={ph.id} className="card">
              <div className="card-head items-start">
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="flex flex-col gap-1.5">
                      <input className="input" value={ph.title} onChange={e => edit(p => { p.phases[pIdx].title = e.target.value })} />
                      <input className="input text-small" value={ph.goal} placeholder="Goal for this phase" onChange={e => edit(p => { p.phases[pIdx].goal = e.target.value })} />
                    </div>
                  ) : (
                    <>
                      <h2>{ph.title}</h2>
                      <p className="text-small text-muted mt-0.5"><strong>Goal:</strong> {ph.goal}</p>
                    </>
                  )}
                </div>
                {prog && <span className={`badge ${doneHere === ph.items.length && ph.items.length ? 'ok' : ''}`}>{doneHere}/{ph.items.length}</span>}
                {editing && <button className="btn ghost sm danger" onClick={() => edit(p => { p.phases.splice(pIdx, 1) })}><Icon name="trash" size={14} /></button>}
              </div>
              <div className="list">
                {ph.items.length === 0 && <Empty>No steps yet.</Empty>}
                {ph.items.map((it, iIdx) => {
                  const done = prog?.isDone(it) ?? false
                  const href = itemHref(it)
                  const isTask = it.type === 'task'
                  return (
                    <div key={it.id} className="list-row items-center">
                      <button className={`check ${done ? 'on' : ''}`} onClick={() => !isTask && toggle(it)} disabled={!canCheck || isTask}
                        title={isTask ? 'Completes when the task is marked done' : canCheck ? 'Mark done' : 'Only the new engineer can check this'}>
                        {done && <Icon name="check" size={12} />}
                      </button>
                      <span className="badge outlined"><Icon name={ITEM_ICON[it.type]} size={12} />{it.type}</span>
                      <div className="min-w-0 flex-1">
                        <div className={`font-[550] ${done ? 'text-muted line-through' : ''}`}>{it.title}</div>
                        {it.note && <div className="text-tiny text-muted">{it.note}</div>}
                      </div>
                      {href && <Link className="btn sm" to={href}>Open</Link>}
                      {editing && <button className="btn ghost sm danger" onClick={() => edit(p => { p.phases[pIdx].items.splice(iIdx, 1) })}><Icon name="x" size={14} /></button>}
                    </div>
                  )
                })}
                {editing && (
                  <div className="list-row"><button className="btn sm" onClick={() => setAdding(ph.id)}><Icon name="plus" size={13} />Add step</button></div>
                )}
              </div>
            </div>
          )
        })}
        {editing && (
          <button className="btn self-start" onClick={() => edit(p => { p.phases.push({ id: uid('ph'), title: `Week ${p.phases.length + 1}`, goal: '', items: [] }) })}>
            <Icon name="plus" />Add phase
          </button>
        )}
      </div>

      {adding && <AddItemModal onClose={() => setAdding(null)} onAdd={item => edit(p => { p.phases.find(ph => ph.id === adding)?.items.push(item) })} />}
    </div>
  )
}

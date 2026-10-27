import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore, uid, now } from '../lib/store'
import { planItems, planProgress, plansFor } from '../lib/selectors'
import type { Plan, PlanItem, PlanItemType } from '../lib/types'
import { Avatar, Empty, Field, Icon, Modal, Progress } from '../components/ui'
import { ITEM_ICON, itemHref } from './Home'

const TRACKS = ['Backend', 'Frontend', 'Platform', 'Mobile', 'Data']

export function Plans() {
  const { state, me, user } = useStore()
  const [params, setParams] = useSearchParams()
  const creating = params.get('new') === '1'
  const plans = plansFor(state, me)
  const senior = me.role === 'senior'

  // A new engineer with exactly one plan lands straight in it.
  if (!senior && plans.length === 1) return <PlanDetail id={plans[0].id} />

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{senior ? 'Onboarding plans' : 'My plans'}</h1><p>{senior ? 'Role-specific plans: what to read, explore, do and who to meet, week by week.' : 'Your onboarding, step by step.'}</p></div>
        {senior && <button className="btn primary" onClick={() => setParams({ new: '1' })}><Icon name="plus" />New plan</button>}
      </div>
      {plans.length === 0 && <div className="card"><Empty>No plans yet.</Empty></div>}
      <div className="grid g2">
        {plans.map(p => {
          const items = planItems(p)
          return (
            <Link key={p.id} to={`/plans/${p.id}`} className="card card-pad stack" style={{ gap: 10 }}>
              <div className="row-between"><span className="badge accent">{p.track}</span><span className="tiny muted">{p.phases.length} phases · {items.length} steps</span></div>
              <h2>{p.title}</h2>
              <p className="small muted">{p.description}</p>
              <div className="divider" />
              {p.assigneeIds.length === 0 && <span className="tiny faint">Not assigned yet</span>}
              {p.assigneeIds.map(id => {
                const prog = planProgress(state, p, id)
                return (
                  <div key={id} className="row">
                    <Avatar user={user(id)} size={22} />
                    <span className="small" style={{ width: 90 }}>{user(id)?.name.split(' ')[0]}</span>
                    <div className="grow"><Progress value={prog.ratio} /></div>
                    <span className="tiny muted">{Math.round(prog.ratio * 100)}%</span>
                  </div>
                )
              })}
              <span className="tiny faint">by {user(p.authorId)?.name}</span>
            </Link>
          )
        })}
      </div>
      {creating && <NewPlanModal onClose={() => setParams({})} />}
    </div>
  )
}

function NewPlanModal({ onClose }: { onClose: () => void }) {
  const { state, me, mutate } = useStore()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [track, setTrack] = useState(me.track)
  const [desc, setDesc] = useState('')
  const [from, setFrom] = useState('')
  const [assignees, setAssignees] = useState<string[]>([])
  const hires = state.users.filter(u => u.role === 'new')

  const create = () => {
    const id = uid('p')
    mutate(s => {
      const tpl = s.plans.find(p => p.id === from)
      const phases = tpl
        ? structuredClone(tpl.phases).map(ph => ({ ...ph, id: uid('ph'), items: ph.items.map(it => ({ ...it, id: uid('pi') })) }))
        : [{ id: uid('ph'), title: 'Week 1: Get running', goal: 'Run everything locally and merge one small PR.', items: [] }]
      const plan: Plan = { id, title: title || `${track} onboarding`, track, description: desc, authorId: me.id, assigneeIds: assignees, phases, createdAt: now() }
      s.plans.unshift(plan)
    })
    onClose()
    nav(`/plans/${id}`)
  }

  return (
    <Modal title="New onboarding plan" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={create}>Create plan</button></>}>
      <Field label="Title"><input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Backend onboarding: Billing" /></Field>
      <div className="grid g2">
        <Field label="Track (role)"><select className="select" value={track} onChange={e => setTrack(e.target.value)}>{TRACKS.map(t => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Start from">
          <select className="select" value={from} onChange={e => setFrom(e.target.value)}>
            <option value="">Blank plan</option>
            {state.plans.map(p => <option key={p.id} value={p.id}>Copy of: {p.title}</option>)}
          </select>
        </Field>
      </div>
      <Field label="What this plan is for"><textarea className="textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Four weeks from laptop to first real change. Focus on why billing is its own service." /></Field>
      <div>
        <span className="label">Assign to</span>
        <div className="chips">
          {hires.map(h => (
            <button key={h.id} className={`chip ${assignees.includes(h.id) ? 'active' : ''}`}
              onClick={() => setAssignees(a => a.includes(h.id) ? a.filter(x => x !== h.id) : [...a, h.id])}>
              {h.name} · {h.track}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function PlanDetail({ id: propId }: { id?: string }) {
  const params = useParams()
  const id = propId ?? params.id
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const plan = state.plans.find(p => p.id === id)
  const [adding, setAdding] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const senior = me.role === 'senior'
  const [viewAs, setViewAs] = useState<string>(senior ? plan?.assigneeIds[0] ?? '' : me.id)

  if (!plan) return <div className="page"><Empty>Plan not found. <Link to="/plans">Back to plans</Link></Empty></div>
  const prog = viewAs ? planProgress(state, plan, viewAs) : null
  const canEdit = senior

  const toggle = (item: PlanItem) => {
    if (senior) return
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
        <div style={{ maxWidth: 640 }}>
          {senior && <Link to="/plans" className="small muted">← All plans</Link>}
          {editing
            ? <input className="input" style={{ fontSize: 20, fontWeight: 650, marginTop: 6 }} value={plan.title} onChange={e => edit(p => { p.title = e.target.value })} />
            : <h1 style={{ marginTop: 4 }}>{plan.title}</h1>}
          {editing
            ? <textarea className="textarea" style={{ marginTop: 8, minHeight: 60 }} value={plan.description} onChange={e => edit(p => { p.description = e.target.value })} />
            : <p>{plan.description}</p>}
          <div className="row small muted" style={{ marginTop: 8 }}><span className="badge accent">{plan.track}</span>Written by <Avatar user={user(plan.authorId)} size={18} />{user(plan.authorId)?.name}</div>
        </div>
        {canEdit && (
          <div className="row">
            {editing && <button className="btn danger" onClick={() => { if (confirm('Delete this plan?')) { mutate(s => { s.plans = s.plans.filter(p => p.id !== plan.id) }); nav('/plans') } }}><Icon name="trash" />Delete</button>}
            <button className={`btn ${editing ? 'primary' : ''}`} onClick={() => setEditing(e => !e)}><Icon name={editing ? 'check' : 'edit'} />{editing ? 'Done editing' : 'Edit plan'}</button>
          </div>
        )}
      </div>

      {senior && (
        <div className="card card-pad row wrap" style={{ marginBottom: 16 }}>
          <span className="label" style={{ margin: 0 }}>Assigned</span>
          {state.users.filter(u => u.role === 'new').map(u => {
            const on = plan.assigneeIds.includes(u.id)
            return (
              <button key={u.id} className={`chip ${on ? 'active' : ''}`} onClick={() => edit(p => { p.assigneeIds = on ? p.assigneeIds.filter(x => x !== u.id) : [...p.assigneeIds, u.id] })}>{u.name}</button>
            )
          })}
          <span className="grow" />
          {plan.assigneeIds.length > 0 && (
            <label className="row small muted">Showing progress for
              <select className="select" style={{ width: 'auto' }} value={viewAs} onChange={e => setViewAs(e.target.value)}>
                {plan.assigneeIds.map(id => <option key={id} value={id}>{user(id)?.name}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {prog && (
        <div className="row" style={{ marginBottom: 18 }}>
          <div className="grow"><Progress value={prog.ratio} /></div>
          <span className="small muted">{prog.completed} of {prog.total} done</span>
        </div>
      )}

      <div className="stack" style={{ gap: 16 }}>
        {plan.phases.map((ph, pIdx) => {
          const doneHere = prog ? ph.items.filter(prog.isDone).length : 0
          return (
            <div key={ph.id} className="card">
              <div className="card-head" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  {editing ? (
                    <div className="stack-sm">
                      <input className="input" value={ph.title} onChange={e => edit(p => { p.phases[pIdx].title = e.target.value })} />
                      <input className="input small" value={ph.goal} placeholder="Goal for this phase" onChange={e => edit(p => { p.phases[pIdx].goal = e.target.value })} />
                    </div>
                  ) : (
                    <>
                      <h2>{ph.title}</h2>
                      <p className="small muted" style={{ marginTop: 2 }}><strong>Goal:</strong> {ph.goal}</p>
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
                    <div key={it.id} className="list-item" style={{ alignItems: 'center' }}>
                      <button className={`check ${done ? 'on' : ''}`} onClick={() => !isTask && toggle(it)} disabled={senior || isTask}
                        title={isTask ? 'Completes when the task is marked done' : senior ? 'Only the new engineer can check this' : 'Mark done'}>
                        {done && <Icon name="check" size={12} />}
                      </button>
                      <span className="badge outline"><Icon name={ITEM_ICON[it.type]} size={12} />{it.type}</span>
                      <div className="grow">
                        <div style={{ fontWeight: 550, textDecoration: done ? 'line-through' : undefined, color: done ? 'var(--muted)' : undefined }}>{it.title}</div>
                        {it.note && <div className="tiny muted">{it.note}</div>}
                      </div>
                      {href && <Link className="btn sm" to={href}>Open</Link>}
                      {editing && <button className="btn ghost sm danger" onClick={() => edit(p => { p.phases[pIdx].items.splice(iIdx, 1) })}><Icon name="x" size={14} /></button>}
                    </div>
                  )
                })}
                {editing && (
                  <div className="list-item"><button className="btn sm" onClick={() => setAdding(ph.id)}><Icon name="plus" size={13} />Add step</button></div>
                )}
              </div>
            </div>
          )
        })}
        {editing && (
          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => edit(p => { p.phases.push({ id: uid('ph'), title: `Week ${p.phases.length + 1}`, goal: '', items: [] }) })}>
            <Icon name="plus" />Add phase
          </button>
        )}
      </div>

      {adding && <AddItemModal onClose={() => setAdding(null)} onAdd={item => edit(p => { p.phases.find(ph => ph.id === adding)?.items.push(item) })} />}
    </div>
  )
}

function AddItemModal({ onClose, onAdd }: { onClose: () => void; onAdd: (i: PlanItem) => void }) {
  const { state } = useStore()
  const [type, setType] = useState<PlanItemType>('read')
  const [refId, setRefId] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')

  const options: { id: string; label: string }[] =
    type === 'read' ? state.docs.map(d => ({ id: d.id, label: d.title }))
    : type === 'task' ? state.tasks.map(t => ({ id: t.id, label: `${t.title}${t.source === 'ai' ? ' (scan)' : ''}` }))
    : type === 'explore' ? state.areas.map(a => ({ id: a.id, label: `${a.name} (${a.path})` }))
    : []

  const add = () => {
    const label = title || options.find(o => o.id === refId)?.label || 'Untitled step'
    onAdd({ id: uid('pi'), type, title: label, refId: refId || undefined, note: note || undefined })
    onClose()
  }

  return (
    <Modal title="Add a step" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={add} disabled={type !== 'meet' && !refId && !title}>Add step</button></>}>
      <div className="chips">
        {(['read', 'explore', 'task', 'meet'] as PlanItemType[]).map(t => (
          <button key={t} className={`chip ${type === t ? 'active' : ''}`} onClick={() => { setType(t); setRefId('') }}>
            {{ read: 'Read a doc', explore: 'Explore an area', task: 'Do a task', meet: 'Meet someone' }[t]}
          </button>
        ))}
      </div>
      {type !== 'meet' && (
        <Field label={type === 'read' ? 'Document' : type === 'task' ? 'Starter task' : 'Codebase area'}>
          <select className="select" value={refId} onChange={e => setRefId(e.target.value)}>
            <option value="">Choose…</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
      )}
      <Field label={type === 'meet' ? 'Who and why' : 'Title (optional, defaults to the item name)'}>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'meet' ? '30 min with Dana on the gateway' : ''} />
      </Field>
      <Field label="Note for the new engineer (optional)"><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Focus on why, not how" /></Field>
    </Modal>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, uid, now } from '../lib/store'
import { openThread } from '../lib/actions'
import type { StarterTask, TaskStatus } from '../lib/types'
import { Avatar, Difficulty, Field, Icon, Modal, SourceBadge } from '../components/ui'

const COLS: { s: TaskStatus; label: string }[] = [
  { s: 'open', label: 'Up for grabs' }, { s: 'in_progress', label: 'In progress' }, { s: 'review', label: 'In review' }, { s: 'done', label: 'Done' },
]

export function Tasks() {
  const { state, me, user } = useStore()
  const [params, setParams] = useSearchParams()
  const [src, setSrc] = useState<'all' | 'ai' | 'senior'>('all')
  const [mine, setMine] = useState(me.role === 'new' ? 'mine+open' : 'all')
  const openId = params.get('open')
  const creating = params.get('new') === '1'
  const senior = me.role === 'senior'

  const tasks = state.tasks.filter(t =>
    (src === 'all' || t.source === src) &&
    (mine === 'all' || t.assigneeId === me.id || (mine === 'mine+open' && !t.assigneeId)))

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      <div className="page-head">
        <div><h1>Starter tasks</h1><p>Small, real changes picked to teach one part of the codebase each. Some found by the scanner, some chosen by seniors.</p></div>
        <div className="row wrap">
          <Link className="btn" to="/codebase?tab=scan"><Icon name="spark" />Find more by scanning</Link>
          {senior && <button className="btn primary" onClick={() => setParams({ new: '1' })}><Icon name="plus" />Recommend a task</button>}
        </div>
      </div>
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <div className="chips">
          {(['all', 'senior', 'ai'] as const).map(s => <button key={s} className={`chip ${src === s ? 'active' : ''}`} onClick={() => setSrc(s)}>{{ all: 'All sources', senior: 'Senior picks', ai: 'Found by scan' }[s]}</button>)}
        </div>
        <span className="grow" />
        <select className="select" style={{ width: 'auto' }} value={mine} onChange={e => setMine(e.target.value)}>
          <option value="all">Everyone's tasks</option>
          <option value="mine+open">Mine + unassigned</option>
          <option value="mine">Only mine</option>
        </select>
      </div>

      <div className="board">
        {COLS.map(c => {
          const list = tasks.filter(t => t.status === c.s)
          return (
            <div key={c.s} className="col">
              <div className="col-head"><span>{c.label}</span><span>{list.length}</span></div>
              {list.map(t => (
                <button key={t.id} className="card task-card" style={{ textAlign: 'left' }} onClick={() => setParams({ open: t.id })}>
                  <strong className="small">{t.title}</strong>
                  <div className="row wrap tiny muted"><SourceBadge task={t} /><Difficulty level={t.difficulty} />{t.estimate}</div>
                  {t.file && <code className="tiny muted truncate">{t.file}</code>}
                  <div className="row-between tiny muted">
                    <span>{state.areas.find(a => a.id === t.areaId)?.name ?? t.kind}</span>
                    {t.assigneeId ? <Avatar user={user(t.assigneeId)} size={20} /> : <span className="faint">unassigned</span>}
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </div>
      {openId && <TaskModal id={openId} onClose={() => setParams({})} />}
      {creating && <TaskEditor onClose={() => setParams({})} />}
    </div>
  )
}

function TaskModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const [editing, setEditing] = useState(false)
  const t = state.tasks.find(x => x.id === id)
  if (!t) return null
  if (editing) return <TaskEditor existing={t} onClose={() => setEditing(false)} />
  const area = state.areas.find(a => a.id === t.areaId)
  const senior = me.role === 'senior'
  const helper = t.recommendedById ?? area?.ownerId ?? state.users.find(u => u.role === 'senior')!.id

  const set = (fn: (x: StarterTask) => void) => mutate(s => { const x = s.tasks.find(x => x.id === id); if (x) fn(x) })
  const ask = () => {
    let tid = ''
    mutate(s => { tid = openThread(s, me.id, helper, t.title, { kind: 'task', id: t.id }) })
    nav(`/messages/${tid}`)
  }

  return (
    <Modal title="Starter task" onClose={onClose} footer={
      <>
        {senior && <button className="btn" style={{ marginRight: 'auto' }} onClick={() => setEditing(true)}><Icon name="edit" />Edit</button>}
        {me.id !== helper && <button className="btn" onClick={ask}><Icon name="chat" />Ask {user(helper)?.name.split(' ')[0]}</button>}
        {!senior && !t.assigneeId && <button className="btn primary" onClick={() => set(x => { x.assigneeId = me.id; x.status = 'in_progress' })}>Pick this up</button>}
        {t.assigneeId === me.id && t.status === 'in_progress' && <button className="btn primary" onClick={() => set(x => { x.status = 'review' })}>Submit for review</button>}
        {senior && t.status === 'review' && <button className="btn primary" onClick={() => set(x => { x.status = 'done' })}><Icon name="check" />Approve</button>}
      </>
    }>
      <div className="row wrap"><SourceBadge task={t} /><span className="badge outline">{t.kind}</span><Difficulty level={t.difficulty} /><span className="small muted">{t.estimate}</span></div>
      <h2 style={{ fontSize: 18 }}>{t.title}</h2>
      <p>{t.description}</p>
      {t.file && <div><span className="label">Where</span><code>{t.file}{t.line ? `:${t.line}` : ''}</code></div>}
      {t.snippet && <div className="snippet">{t.snippet}</div>}
      <div className="callout small"><strong>What you'll learn:</strong> {t.learns}</div>
      <div className="grid g2 small">
        <div><span className="label">Area</span>{area ? <Link to={`/codebase?area=${area.id}`} style={{ textDecoration: 'underline' }}>{area.name}</Link> : <span className="muted">Unmapped</span>}</div>
        <div><span className="label">{t.source === 'senior' ? 'Recommended by' : 'Ask for help'}</span><span className="row"><Avatar user={user(helper)} size={20} />{user(helper)?.name}</span></div>
        <div>
          <span className="label">Assignee</span>
          {senior
            ? <select className="select" value={t.assigneeId ?? ''} onChange={e => set(x => { x.assigneeId = e.target.value || undefined })}>
                <option value="">Unassigned</option>
                {state.users.filter(u => u.role === 'new').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            : <span className="row">{t.assigneeId ? <><Avatar user={user(t.assigneeId)} size={20} />{user(t.assigneeId)?.name}</> : <span className="muted">Nobody yet</span>}</span>}
        </div>
        <div>
          <span className="label">Status</span>
          <select className="select" value={t.status} disabled={!senior && t.assigneeId !== me.id} onChange={e => set(x => { x.status = e.target.value as TaskStatus })}>
            {COLS.map(c => <option key={c.s} value={c.s}>{c.label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}

function TaskEditor({ onClose, existing }: { onClose: () => void; existing?: StarterTask }) {
  const { state, me, mutate } = useStore()
  const [t, setT] = useState<StarterTask>(() => existing ? structuredClone(existing) : {
    id: uid('t'), title: '', description: '', source: 'senior', kind: 'feature', difficulty: 1, estimate: '1-2 hrs',
    status: 'open', recommendedById: me.id, learns: '', createdAt: now(),
  })
  const set = <K extends keyof StarterTask>(k: K, v: StarterTask[K]) => setT(x => ({ ...x, [k]: v }))
  const save = () => {
    mutate(s => { const i = s.tasks.findIndex(x => x.id === t.id); if (i >= 0) s.tasks[i] = t; else s.tasks.unshift(t) })
    onClose()
  }
  return (
    <Modal title={existing ? 'Edit task' : 'Recommend a starter task'} onClose={onClose} footer={<>
      {existing && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => { mutate(s => { s.tasks = s.tasks.filter(x => x.id !== t.id) }); onClose() }}>Delete</button>}
      <button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!t.title} onClick={save}>Save</button></>}>
      <Field label="Title"><input className="input" autoFocus value={t.title} onChange={e => set('title', e.target.value)} placeholder="Add retry metrics to the payout job" /></Field>
      <Field label="What to do"><textarea className="textarea" value={t.description} onChange={e => set('description', e.target.value)} /></Field>
      <Field label="What they'll learn by doing it"><input className="input" value={t.learns} onChange={e => set('learns', e.target.value)} placeholder="How billing jobs are scheduled and retried" /></Field>
      <div className="grid g2">
        <Field label="File (optional)"><input className="input mono" value={t.file ?? ''} onChange={e => set('file', e.target.value || undefined)} /></Field>
        <Field label="Area"><select className="select" value={t.areaId ?? ''} onChange={e => set('areaId', e.target.value || undefined)}><option value="">None</option>{state.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Difficulty"><select className="select" value={t.difficulty} onChange={e => set('difficulty', Number(e.target.value) as 1 | 2 | 3)}><option value={1}>Easy</option><option value={2}>Medium</option><option value={3}>Stretch</option></select></Field>
        <Field label="Estimate"><input className="input" value={t.estimate} onChange={e => set('estimate', e.target.value)} /></Field>
        <Field label="Assign to"><select className="select" value={t.assigneeId ?? ''} onChange={e => set('assigneeId', e.target.value || undefined)}><option value="">Anyone</option>{state.users.filter(u => u.role === 'new').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Kind"><select className="select" value={t.kind} onChange={e => set('kind', e.target.value)}>{['feature', 'bug', 'tests', 'docs', 'cleanup', 'todo', 'types'].map(k => <option key={k}>{k}</option>)}</select></Field>
      </div>
    </Modal>
  )
}

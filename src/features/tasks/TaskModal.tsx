import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { openThread } from '../../lib/actions'
import { newHires, seniors } from '../../lib/selectors'
import { can } from '../../lib/permissions'
import type { StarterTask, TaskStatus } from '../../lib/types'
import { Avatar, Difficulty, Icon, Modal, SourceBadge } from '../../components/ui'
import { COLS } from './columns'
import { TaskEditor } from './TaskEditor'

export function TaskModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const [editing, setEditing] = useState(false)
  const t = state.tasks.find(x => x.id === id)
  if (!t) return null
  if (editing) return <TaskEditor existing={t} onClose={() => setEditing(false)} />
  const area = state.areas.find(a => a.id === t.areaId)
  const helper = t.recommendedById ?? area?.ownerId ?? seniors(state)[0].id

  const set = (fn: (x: StarterTask) => void) => mutate(s => { const x = s.tasks.find(x => x.id === id); if (x) fn(x) })
  const ask = () => {
    let tid = ''
    mutate(s => { tid = openThread(s, me.id, helper, t.title, { kind: 'task', id: t.id }) })
    nav(`/messages/${tid}`)
  }

  return (
    <Modal title="Starter task" onClose={onClose} footer={
      <>
        {can(me, 'task.edit') && <button className="btn mr-auto" onClick={() => setEditing(true)}><Icon name="edit" />Edit</button>}
        {me.id !== helper && <button className="btn" onClick={ask}><Icon name="chat" />Ask {user(helper)?.name.split(' ')[0]}</button>}
        {can(me, 'task.pickUp') && !t.assigneeId && <button className="btn primary" onClick={() => set(x => { x.assigneeId = me.id; x.status = 'in_progress' })}>Pick this up</button>}
        {t.assigneeId === me.id && t.status === 'in_progress' && <button className="btn primary" onClick={() => set(x => { x.status = 'review' })}>Submit for review</button>}
        {can(me, 'task.approve') && t.status === 'review' && <button className="btn primary" onClick={() => set(x => { x.status = 'done' })}><Icon name="check" />Approve</button>}
      </>
    }>
      <div className="flex items-center gap-2 flex-wrap"><SourceBadge task={t} /><span className="badge outlined">{t.kind}</span><Difficulty level={t.difficulty} /><span className="text-small text-muted">{t.estimate}</span></div>
      <h2 className="text-lg">{t.title}</h2>
      <p>{t.description}</p>
      {t.file && <div><span className="label">Where</span><code>{t.file}{t.line ? `:${t.line}` : ''}</code></div>}
      {t.snippet && <div className="snippet">{t.snippet}</div>}
      <div className="callout text-small"><strong>What you'll learn:</strong> {t.learns}</div>
      <div className="grid gap-4 sm:grid-cols-2 text-small">
        <div><span className="label">Area</span>{area ? <Link to={`/codebase?area=${area.id}`} className="underline">{area.name}</Link> : <span className="text-muted">Unmapped</span>}</div>
        <div><span className="label">{t.source === 'senior' ? 'Recommended by' : 'Ask for help'}</span><span className="flex items-center gap-2"><Avatar user={user(helper)} size={20} />{user(helper)?.name}</span></div>
        <div>
          <span className="label">Assignee</span>
          {can(me, 'task.assign')
            ? <select className="select" value={t.assigneeId ?? ''} onChange={e => set(x => { x.assigneeId = e.target.value || undefined })}>
                <option value="">Unassigned</option>
                {newHires(state).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            : <span className="flex items-center gap-2">{t.assigneeId ? <><Avatar user={user(t.assigneeId)} size={20} />{user(t.assigneeId)?.name}</> : <span className="text-muted">Nobody yet</span>}</span>}
        </div>
        <div>
          <span className="label">Status</span>
          <select className="select" value={t.status} disabled={!can(me, 'task.edit') && t.assigneeId !== me.id} onChange={e => set(x => { x.status = e.target.value as TaskStatus })}>
            {COLS.map(c => <option key={c.s} value={c.s}>{c.label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}

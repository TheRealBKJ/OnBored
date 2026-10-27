import { useState } from 'react'
import { useStore, uid, now } from '../../lib/store'
import { newHires } from '../../lib/selectors'
import type { StarterTask } from '../../lib/types'
import { Field, Modal } from '../../components/ui'

export function TaskEditor({ onClose, existing }: { onClose: () => void; existing?: StarterTask }) {
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
        <Field label="Assign to"><select className="select" value={t.assigneeId ?? ''} onChange={e => set('assigneeId', e.target.value || undefined)}><option value="">Anyone</option>{newHires(state).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Kind"><select className="select" value={t.kind} onChange={e => set('kind', e.target.value)}>{['feature', 'bug', 'tests', 'docs', 'cleanup', 'todo', 'types'].map(k => <option key={k}>{k}</option>)}</select></Field>
      </div>
    </Modal>
  )
}

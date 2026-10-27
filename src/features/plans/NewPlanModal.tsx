import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, uid, now } from '../../lib/store'
import { newHires } from '../../lib/selectors'
import type { Plan } from '../../lib/types'
import { Field, Modal } from '../../components/ui'
import { TRACKS } from './tracks'

export function NewPlanModal({ onClose }: { onClose: () => void }) {
  const { state, me, mutate } = useStore()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [track, setTrack] = useState(me.track)
  const [desc, setDesc] = useState('')
  const [from, setFrom] = useState('')
  const [assignees, setAssignees] = useState<string[]>([])
  const hires = newHires(state)

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

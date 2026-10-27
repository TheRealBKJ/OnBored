import { useState } from 'react'
import { useStore, uid } from '../../lib/store'
import type { PlanItem, PlanItemType } from '../../lib/types'
import { Field, Modal } from '../../components/ui'

export function AddItemModal({ onClose, onAdd }: { onClose: () => void; onAdd: (i: PlanItem) => void }) {
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

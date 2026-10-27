import { useState } from 'react'
import { useStore } from '../../lib/store'
import { seniors } from '../../lib/selectors'
import type { CodeArea } from '../../lib/types'
import { Field, Modal } from '../../components/ui'

export function AreaEditor({ area, onClose }: { area: CodeArea; onClose: () => void }) {
  const { state, mutate } = useStore()
  const [a, setA] = useState(area)
  const isNew = !state.areas.some(x => x.id === area.id)
  const set = <K extends keyof CodeArea>(k: K, v: CodeArea[K]) => setA(x => ({ ...x, [k]: v }))
  const save = () => {
    mutate(s => { const i = s.areas.findIndex(x => x.id === a.id); if (i >= 0) s.areas[i] = a; else s.areas.push(a) })
    onClose()
  }
  return (
    <Modal title={isNew ? 'Add codebase area' : `Edit ${area.name}`} onClose={onClose} footer={<>
      {!isNew && <button className="btn danger mr-auto" onClick={() => { mutate(s => { s.areas = s.areas.filter(x => x.id !== a.id); s.areas.forEach(x => { x.dependsOn = x.dependsOn.filter(d => d !== a.id) }) }); onClose() }}>Delete</button>}
      <button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={!a.name}>Save</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><input className="input" value={a.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Path in repo"><input className="input font-mono" value={a.path} onChange={e => set('path', e.target.value)} placeholder="services/billing" /></Field>
      </div>
      <Field label="What it does"><textarea className="textarea min-h-15" value={a.description} onChange={e => set('description', e.target.value)} /></Field>
      <Field label="Why it's built this way"><textarea className="textarea min-h-[70px]" value={a.why} onChange={e => set('why', e.target.value)} /></Field>
      <Field label="Gotchas (one per line)"><textarea className="textarea min-h-15" value={a.gotchas.join('\n')} onChange={e => set('gotchas', e.target.value.split('\n'))} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Owner"><select className="select" value={a.ownerId} onChange={e => set('ownerId', e.target.value)}>{seniors(state).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Importance"><select className="select" value={a.depth} onChange={e => set('depth', e.target.value as CodeArea['depth'])}><option value="core">Core</option><option value="supporting">Supporting</option><option value="edge">Edge / infra</option></select></Field>
      </div>
      <div><span className="label">Depends on</span>
        <div className="chips">{state.areas.filter(x => x.id !== a.id).map(x => (
          <button key={x.id} className={`chip ${a.dependsOn.includes(x.id) ? 'active' : ''}`} onClick={() => set('dependsOn', a.dependsOn.includes(x.id) ? a.dependsOn.filter(d => d !== x.id) : [...a.dependsOn, x.id])}>{x.name}</button>
        ))}</div>
      </div>
    </Modal>
  )
}

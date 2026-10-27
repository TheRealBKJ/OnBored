import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { openThread } from '../../lib/actions'
import { Field, Icon, Modal } from '../../components/ui'

export function ComposeModal({ onClose, initialTo }: { onClose: () => void; initialTo?: string }) {
  const { state, me, mutate } = useStore()
  const nav = useNavigate()
  const people = state.users.filter(u => u.id !== me.id)
  const [to, setTo] = useState(initialTo ?? people.find(p => p.role !== me.role)?.id ?? people[0].id)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const send = () => {
    let id = ''
    mutate(s => { id = openThread(s, me.id, to, subject || 'Quick question', undefined, body) })
    onClose()
    nav(`/messages/${id}`)
  }
  return (
    <Modal title="New message" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!body.trim()} onClick={send}><Icon name="send" />Send</button></>}>
      <Field label="To">
        <select className="select" value={to} onChange={e => setTo(e.target.value)}>
          {people.map(p => {
            const owns = state.areas.filter(a => a.ownerId === p.id).map(a => a.name)
            return <option key={p.id} value={p.id}>{p.name} · {p.title}{owns.length ? ` (owns ${owns.join(', ')})` : ''}</option>
          })}
        </select>
      </Field>
      <Field label="Subject"><input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Why does dispatch use Kafka?" /></Field>
      <Field label="Message"><textarea className="textarea" autoFocus value={body} onChange={e => setBody(e.target.value)} placeholder="I'm reading services/dispatch/consumer.go and…" /></Field>
    </Modal>
  )
}

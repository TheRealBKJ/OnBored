import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { captureWhy, questionFor, threadArea } from '../../lib/actions'
import type { Message, Thread } from '../../lib/types'
import { Field, Modal } from '../../components/ui'

export function SaveWhyModal({ thread, message, onClose }: { thread: Thread; message: Message; onClose: () => void }) {
  const { state, mutate } = useStore()
  const nav = useNavigate()
  const asked = questionFor(thread, message)
  const [question, setQuestion] = useState(asked?.body ?? '')
  const [title, setTitle] = useState(asked?.body.slice(0, 80) ?? thread.subject)
  const [body, setBody] = useState(message.body)
  const [tags, setTags] = useState('')
  const [areaId, setAreaId] = useState(threadArea(state, thread) ?? '')

  const save = () => {
    let docId: string | undefined
    mutate(s => { docId = captureWhy(s, thread.id, message.id, { title, question, body, areaId: areaId || undefined, tags: tags.split(',').map(t => t.trim()).filter(Boolean) }) })
    onClose()
    if (docId) nav(`/library/${docId}`)
  }

  return (
    <Modal title="Save as a why record" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save to Library</button></>}>
      <p className="text-small text-muted">Clean it up a little. It becomes searchable in Ask why, cited to you and this conversation.</p>
      <Field label="Title"><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <Field label="The question"><input className="input" value={question} onChange={e => setQuestion(e.target.value)} /></Field>
      <Field label="The answer (the why)"><textarea className="textarea min-h-30" value={body} onChange={e => setBody(e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Area"><select className="select" value={areaId} onChange={e => setAreaId(e.target.value)}><option value="">None</option>{state.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Tags"><input className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="billing, money" /></Field>
      </div>
    </Modal>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore, uid, now, ago } from '../lib/store'
import { captureWhy, markRead, openThread } from '../lib/actions'
import { isUnread, threadsFor } from '../lib/selectors'
import type { Message, Thread } from '../lib/types'
import { Avatar, Empty, Field, Icon, Modal } from '../components/ui'

export function Messages() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const threads = threadsFor(state, me.id)
  const active = threads.find(t => t.id === id) ?? (id ? undefined : threads[0])
  const [composing, setComposing] = useState(false)

  // /messages?to=<userId> opens (or starts) a direct thread with that person.
  useEffect(() => {
    const to = params.get('to')
    if (!to) return
    const existing = state.threads.find(t => !t.context && t.participantIds.includes(me.id) && t.participantIds.includes(to))
    if (existing) { nav(`/messages/${existing.id}`, { replace: true }); return }
    setParams({}, { replace: true })
    setComposing(true)
  }, [params, state.threads, me.id, nav, setParams])

  useEffect(() => {
    if (active && isUnread(state, active, me.id)) mutate(s => markRead(s, me.id, active))
  }, [active, state, me.id, mutate])

  return (
    <div className="page" style={{ maxWidth: 1240 }}>
      <div className="page-head">
        <div><h1>Messages</h1><p>{me.role === 'senior' ? 'Answer once: save good answers as records so the next hire finds them.' : 'Ask the people who built it. Answers worth keeping get saved to the Library.'}</p></div>
        <button className="btn primary" onClick={() => setComposing(true)}><Icon name="plus" />New message</button>
      </div>
      <div className="card chat">
        <div className="chat-list">
          {threads.length === 0 && <Empty>No conversations yet.</Empty>}
          {threads.map(t => {
            const other = user(t.participantIds.find(p => p !== me.id))
            const last = t.messages[t.messages.length - 1]
            const unread = isUnread(state, t, me.id)
            return (
              <Link key={t.id} to={`/messages/${t.id}`} className="list-item" style={{ background: t.id === active?.id ? 'var(--surface-2)' : undefined }}>
                <Avatar user={other} size={32} />
                <div className="grow">
                  <div className="row-between"><span className="truncate" style={{ fontWeight: unread ? 700 : 550 }}>{other?.name}</span><span className="tiny faint">{last ? ago(last.at) : ''}</span></div>
                  <div className="tiny truncate" style={{ fontWeight: 550 }}>{t.subject}</div>
                  <div className="tiny muted truncate">{last?.body ?? 'No messages yet'}</div>
                </div>
                {unread && <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--accent)', marginTop: 6 }} />}
              </Link>
            )
          })}
        </div>
        {active ? <ThreadView thread={active} key={active.id} /> : <div className="chat-main"><Empty>Select a conversation.</Empty></div>}
      </div>
      {composing && <ComposeModal initialTo={params.get('to') ?? undefined} onClose={() => setComposing(false)} />}
    </div>
  )
}

function ThreadView({ thread }: { thread: Thread }) {
  const { state, me, mutate, user } = useStore()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState<Message | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const other = user(thread.participantIds.find(p => p !== me.id))
  const ctx = thread.context
  const ctxLabel = ctx && (
    ctx.kind === 'task' ? { label: state.tasks.find(t => t.id === ctx.id)?.title, href: `/tasks?open=${ctx.id}`, icon: 'task' }
    : ctx.kind === 'doc' ? { label: state.docs.find(d => d.id === ctx.id)?.title, href: `/library/${ctx.id}`, icon: 'book' }
    : { label: state.areas.find(a => a.id === ctx.id)?.name, href: `/codebase?area=${ctx.id}`, icon: 'code' })

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [thread.messages.length])

  const send = () => {
    if (!text.trim()) return
    mutate(s => {
      const t = s.threads.find(t => t.id === thread.id)!
      t.messages.push({ id: uid('m'), fromId: me.id, body: text.trim(), at: now() })
      markRead(s, me.id, t)
    })
    setText('')
  }

  return (
    <div className="chat-main">
      <div className="card-head">
        <div className="row grow" style={{ minWidth: 0 }}>
          <Avatar user={other} />
          <div className="grow" style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }} className="truncate">{thread.subject}</div>
            <div className="tiny muted">{other?.name} · {other?.title}</div>
          </div>
        </div>
        {ctxLabel?.label && <Link to={ctxLabel.href} className="badge outline" style={{ maxWidth: 220 }}><Icon name={ctxLabel.icon} size={11} /><span className="truncate">{ctxLabel.label}</span></Link>}
      </div>
      <div className="chat-msgs">
        {thread.messages.length === 0 && <Empty>Say hi. Mention the file or doc you're looking at.</Empty>}
        {thread.messages.map((m, i) => {
          const mine = m.fromId === me.id
          // Seniors can capture their own answer to someone else's question.
          const canSave = me.role === 'senior' && mine && i > 0 && thread.messages.slice(0, i).some(x => x.fromId !== me.id)
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
              <Avatar user={user(m.fromId)} size={26} />
              <div className="stack-sm" style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div className="bubble">{m.body}</div>
                <div className="row tiny faint">
                  {ago(m.at)}
                  {m.savedDocId && <Link to={`/library/${m.savedDocId}`} className="badge accent"><Icon name="bookmark" size={10} />Saved as a why record</Link>}
                  {canSave && !m.savedDocId && <button className="btn ghost sm" onClick={() => setSaving(m)}><Icon name="bookmark" size={12} />Save as why</button>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={e => { e.preventDefault(); send() }}>
        <textarea className="textarea" style={{ minHeight: 42, height: 42 }} value={text} placeholder={`Message ${other?.name.split(' ')[0]}…`}
          onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button className="btn primary" disabled={!text.trim()}><Icon name="send" /></button>
      </form>
      {saving && <SaveWhyModal thread={thread} message={saving} onClose={() => setSaving(null)} />}
    </div>
  )
}

function SaveWhyModal({ thread, message, onClose }: { thread: Thread; message: Message; onClose: () => void }) {
  const { state, mutate } = useStore()
  const nav = useNavigate()
  const idx = thread.messages.indexOf(message)
  const asked = [...thread.messages.slice(0, idx)].reverse().find(x => x.fromId !== message.fromId)
  const [question, setQuestion] = useState(asked?.body ?? '')
  const [title, setTitle] = useState(asked?.body.slice(0, 80) ?? thread.subject)
  const [body, setBody] = useState(message.body)
  const [tags, setTags] = useState('')
  const defaultArea = thread.context?.kind === 'area' ? thread.context.id
    : thread.context?.kind === 'task' ? state.tasks.find(t => t.id === thread.context!.id)?.areaId : undefined
  const [areaId, setAreaId] = useState(defaultArea ?? '')

  const save = () => {
    let docId: string | undefined
    mutate(s => { docId = captureWhy(s, thread.id, message.id, { title, question, body, areaId: areaId || undefined, tags: tags.split(',').map(t => t.trim()).filter(Boolean) }) })
    onClose()
    if (docId) nav(`/library/${docId}`)
  }

  return (
    <Modal title="Save as a why record" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save to Library</button></>}>
      <p className="small muted">Clean it up a little. It becomes searchable in Ask why, cited to you and this conversation.</p>
      <Field label="Title"><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <Field label="The question"><input className="input" value={question} onChange={e => setQuestion(e.target.value)} /></Field>
      <Field label="The answer (the why)"><textarea className="textarea" style={{ minHeight: 120 }} value={body} onChange={e => setBody(e.target.value)} /></Field>
      <div className="grid g2">
        <Field label="Area"><select className="select" value={areaId} onChange={e => setAreaId(e.target.value)}><option value="">None</option>{state.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Tags"><input className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="billing, money" /></Field>
      </div>
    </Modal>
  )
}

function ComposeModal({ onClose, initialTo }: { onClose: () => void; initialTo?: string }) {
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

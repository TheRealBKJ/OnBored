import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, uid, now, ago } from '../../lib/store'
import { markRead } from '../../lib/actions'
import { can } from '../../lib/permissions'
import type { Message, Thread } from '../../lib/types'
import { Avatar, Empty, Icon } from '../../components/ui'
import { SaveWhyModal } from './SaveWhyModal'

export function ThreadView({ thread }: { thread: Thread }) {
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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar user={other} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{thread.subject}</div>
            <div className="text-tiny text-muted">{other?.name} · {other?.title}</div>
          </div>
        </div>
        {ctxLabel?.label && <Link to={ctxLabel.href} className="badge outlined max-w-55"><Icon name={ctxLabel.icon} size={11} /><span className="truncate">{ctxLabel.label}</span></Link>}
      </div>
      <div className="chat-msgs">
        {thread.messages.length === 0 && <Empty>Say hi. Mention the file or doc you're looking at.</Empty>}
        {thread.messages.map((m, i) => {
          const mine = m.fromId === me.id
          // Seniors can capture their own answer to someone else's question.
          const canSave = can(me, 'why.capture') && mine && i > 0 && thread.messages.slice(0, i).some(x => x.fromId !== me.id)
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
              <Avatar user={user(m.fromId)} size={26} />
              <div className={`flex flex-col gap-1.5 ${mine ? 'items-end' : 'items-start'}`}>
                <div className="bubble">{m.body}</div>
                <div className="flex items-center gap-2 text-tiny text-faint">
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
        <textarea className="textarea h-[42px] min-h-[42px]" value={text} placeholder={`Message ${other?.name.split(' ')[0]}…`}
          onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button className="btn primary" disabled={!text.trim()}><Icon name="send" /></button>
      </form>
      {saving && <SaveWhyModal thread={thread} message={saving} onClose={() => setSaving(null)} />}
    </div>
  )
}

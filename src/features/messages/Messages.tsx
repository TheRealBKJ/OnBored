import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore, ago } from '../../lib/store'
import { markRead } from '../../lib/actions'
import { isUnread, threadsFor } from '../../lib/selectors'
import { forRole } from '../../lib/permissions'
import { Avatar, Empty, Icon } from '../../components/ui'
import { ThreadView } from './ThreadView'
import { ComposeModal } from './ComposeModal'

export function Messages() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const threads = threadsFor(state, me.id)
  const active = threads.find(t => t.id === id) ?? (id ? undefined : threads[0])
  const [composing, setComposing] = useState<{ to?: string } | null>(null)

  // /messages?to=<userId> opens (or starts) a direct thread with that person.
  useEffect(() => {
    const to = params.get('to')
    if (!to) return
    const existing = state.threads.find(t => !t.context && t.participantIds.includes(me.id) && t.participantIds.includes(to))
    if (existing) { nav(`/messages/${existing.id}`, { replace: true }); return }
    setParams({}, { replace: true })
    setComposing({ to })
  }, [params, state.threads, me.id, nav, setParams])

  useEffect(() => {
    if (active && isUnread(state, active, me.id)) mutate(s => markRead(s, me.id, active))
  }, [active, state, me.id, mutate])

  return (
    <div className="page" style={{ maxWidth: 1240 }}>
      <div className="page-head">
        <div><h1>Messages</h1><p>{forRole(me, { senior: 'Answer once: save good answers as records so the next hire finds them.', new: 'Ask the people who built it. Answers worth keeping get saved to the Library.' })}</p></div>
        <button className="btn primary" onClick={() => setComposing({})}><Icon name="plus" />New message</button>
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
      {composing && <ComposeModal initialTo={composing.to} onClose={() => setComposing(null)} />}
    </div>
  )
}

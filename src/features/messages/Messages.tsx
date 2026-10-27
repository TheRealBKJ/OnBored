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

  // /messages?to=<userId> jumps to the direct thread with that person, or starts one.
  const to = params.get('to')
  const directId = to ? state.threads.find(t => !t.context && t.participantIds.includes(me.id) && t.participantIds.includes(to))?.id : undefined
  useEffect(() => {
    if (directId) nav(`/messages/${directId}`, { replace: true })
  }, [directId, nav])
  const compose = composing ?? (to && !directId ? { to } : null)
  const closeCompose = () => {
    setComposing(null)
    if (to) setParams({}, { replace: true })
  }

  useEffect(() => {
    if (active && isUnread(state, active, me.id)) mutate(s => markRead(s, me.id, active))
  }, [active, state, me.id, mutate])

  return (
    <div className="page max-w-310">
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
              <Link key={t.id} to={`/messages/${t.id}`} className={`list-row ${t.id === active?.id ? 'bg-surface-2' : ''}`}>
                <Avatar user={other} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><span className={`truncate ${unread ? 'font-bold' : 'font-[550]'}`}>{other?.name}</span><span className="text-tiny text-faint">{last ? ago(last.at) : ''}</span></div>
                  <div className="text-tiny truncate font-[550]">{t.subject}</div>
                  <div className="text-tiny text-muted truncate">{last?.body ?? 'No messages yet'}</div>
                </div>
                {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
              </Link>
            )
          })}
        </div>
        {active ? <ThreadView thread={active} key={active.id} /> : <div className="chat-main"><Empty>Select a conversation.</Empty></div>}
      </div>
      {compose && <ComposeModal initialTo={compose.to} onClose={closeCompose} />}
    </div>
  )
}

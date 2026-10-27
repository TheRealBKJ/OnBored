import { Link } from 'react-router-dom'
import { useStore, ago } from '../../lib/store'
import { isUnread, newHires, nextUp, planProgress, threadsFor } from '../../lib/selectors'
import { Avatar, Empty, Icon, Progress } from '../../components/ui'

export function SeniorHome() {
  const { state, me, user } = useStore()
  const hires = newHires(state)
  const myDocs = state.docs.filter(d => d.authorId === me.id)
  const captured = state.docs.filter(d => d.kind === 'why').length
  const waiting = threadsFor(state, me.id).filter(t => isUnread(state, t, me.id))
  const reuse = myDocs.filter(d => d.kind === 'why' || d.kind === 'decision').reduce((n, d) => n + (d.views ?? 0), 0)

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div><h1>Good to see you, {me.name.split(' ')[0]}</h1><p>How your new engineers are ramping, and what they need from you.</p></div>
        <div className="row wrap">
          <Link className="btn" to="/library?new=1"><Icon name="plus" />Add doc</Link>
          <Link className="btn primary" to="/plans?new=1"><Icon name="plus" />New plan</Link>
        </div>
      </div>

      <div className="grid g4">
        <div className="card stat"><div className="v">{hires.length}</div><div className="l">New engineers ramping</div></div>
        <div className="card stat"><div className="v">{waiting.length}</div><div className="l">Questions waiting on you</div></div>
        <div className="card stat"><div className="v">{captured}</div><div className="l">"Why" answers captured</div></div>
        <div className="card stat"><div className="v">{reuse}</div><div className="l">Times your records were read</div></div>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head"><h2>New engineers</h2></div>
          <div className="list">
            {hires.map(h => {
              const plan = state.plans.find(p => p.assigneeIds.includes(h.id))
              const prog = plan ? planProgress(state, plan, h.id) : null
              const next = nextUp(state, h, 1)[0]
              const active = state.tasks.filter(t => t.assigneeId === h.id && t.status !== 'done').length
              return (
                <div key={h.id} className="list-item" style={{ alignItems: 'center' }}>
                  <Avatar user={h} size={34} />
                  <div className="grow">
                    <div className="row-between">
                      <span style={{ fontWeight: 600 }}>{h.name}</span>
                      <span className="tiny muted">{h.title} · started {h.startDate ? ago(h.startDate) : '?'}</span>
                    </div>
                    {prog ? (
                      <>
                        <div className="row" style={{ margin: '6px 0 4px' }}><div className="grow"><Progress value={prog.ratio} /></div><span className="tiny">{prog.completed}/{prog.total}</span></div>
                        <div className="tiny muted truncate">{plan!.title} · {active} active task{active === 1 ? '' : 's'}{next && <> · next: {next.item.title}</>}</div>
                      </>
                    ) : <div className="tiny muted">No plan yet. <Link to="/plans?new=1" style={{ textDecoration: 'underline' }}>Create one</Link></div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h2>Waiting on you</h2><Link className="btn sm" to="/messages">Messages</Link></div>
            <div className="list">
              {waiting.length === 0 && <Empty>All caught up.</Empty>}
              {waiting.map(t => {
                const m = t.messages[t.messages.length - 1]
                return (
                  <Link key={t.id} to={`/messages/${t.id}`} className="list-item">
                    <Avatar user={user(m.fromId)} size={26} />
                    <div className="grow"><div style={{ fontWeight: 550 }} className="truncate">{t.subject}</div><div className="tiny muted truncate">{m.body}</div></div>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="callout small">
            <strong>Answer once.</strong> When you reply to a "why" question in Messages, save it as a record. The next hire who asks gets your answer from Ask why, with you cited.
          </div>
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useStore, ago } from '../lib/store'
import { nextUp, planProgress, plansFor, threadsFor, isUnread } from '../lib/selectors'
import type { PlanItem } from '../lib/types'
import { AskWhy } from '../components/AskWhy'
import { Avatar, Difficulty, Empty, Icon, KindBadge, Progress, SourceBadge } from '../components/ui'

export const ITEM_ICON: Record<PlanItem['type'], string> = { read: 'book', task: 'task', explore: 'code', meet: 'team' }

export function itemHref(item: PlanItem) {
  if (!item.refId) return undefined
  if (item.type === 'read') return `/library/${item.refId}`
  if (item.type === 'task') return `/tasks?open=${item.refId}`
  if (item.type === 'explore') return `/codebase?area=${item.refId}`
}

export function Home() {
  const { me } = useStore()
  return me.role === 'senior' ? <SeniorHome /> : <NewHome />
}

function NewHome() {
  const { state, me, user } = useStore()
  const plans = plansFor(state, me)
  const plan = plans[0]
  const prog = plan ? planProgress(state, plan, me.id) : null
  const day = me.startDate ? Math.max(1, Math.ceil((Date.now() - new Date(me.startDate).getTime()) / 86400000)) : 1
  const up = nextUp(state, me, 4)
  const myTasks = state.tasks.filter(t => t.assigneeId === me.id && t.status !== 'done')
  const suggested = state.tasks.filter(t => !t.assigneeId && t.status === 'open').slice(0, 3)
  const whys = state.docs.filter(d => d.kind === 'why' || d.kind === 'decision').filter(d => !d.tracks.length || d.tracks.includes(me.track)).slice(0, 4)
  const owners = [...new Set(state.areas.map(a => a.ownerId))].map(id => user(id)!).filter(Boolean)

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <div className="card hero">
        <div>
          <div className="small muted">Day {day} at Relay · {me.team} team</div>
          <h1 style={{ marginTop: 4 }}>Welcome back, {me.name.split(' ')[0]}</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: 520 }}>
            {plan ? <>You're on <strong style={{ color: 'var(--text)' }}>{plan.title}</strong>. {prog!.total - prog!.completed} steps left.</> : 'No plan assigned yet. Your senior engineer will add one.'}
          </p>
        </div>
        {prog && <div className="ring" style={{ ['--p' as string]: Math.round(prog.ratio * 100) }}><span>{Math.round(prog.ratio * 100)}%</span></div>}
      </div>

      <div className="split">
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h2>Up next</h2>{plan && <Link className="btn sm" to={`/plans/${plan.id}`}>Open plan</Link>}</div>
            <div className="list">
              {up.length === 0 && <Empty>Plan complete. Pick a starter task to keep going.</Empty>}
              {up.map(({ item, phase }) => {
                const href = itemHref(item)
                const body = (
                  <>
                    <span className="badge outline"><Icon name={ITEM_ICON[item.type]} size={12} />{item.type}</span>
                    <div className="grow"><div style={{ fontWeight: 550 }}>{item.title}</div><div className="tiny muted">{phase}</div></div>
                    {href && <Icon name="arrow" size={14} />}
                  </>
                )
                return href ? <Link key={item.id} to={href} className="list-item">{body}</Link> : <div key={item.id} className="list-item">{body}</div>
              })}
            </div>
          </div>

          <AskWhy />

          <div className="card">
            <div className="card-head"><h2>My tasks</h2><Link className="btn sm" to="/tasks">All tasks</Link></div>
            <div className="list">
              {[...myTasks, ...suggested].map(t => (
                <Link key={t.id} to={`/tasks?open=${t.id}`} className="list-item">
                  <div className="grow">
                    <div className="row wrap" style={{ marginBottom: 3 }}>
                      <span style={{ fontWeight: 550 }}>{t.title}</span>
                    </div>
                    <div className="row wrap tiny muted"><SourceBadge task={t} /><Difficulty level={t.difficulty} />{t.estimate}{!t.assigneeId && <span className="badge">Suggested</span>}</div>
                  </div>
                  {t.assigneeId && <span className="badge accent">{t.status.replace('_', ' ')}</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h2>The why behind things</h2></div>
            <div className="list">
              {whys.map(d => (
                <Link key={d.id} to={`/library/${d.id}`} className="list-item">
                  <div className="grow">
                    <div style={{ fontWeight: 550 }}>{d.question ?? d.title}</div>
                    <div className="row tiny muted" style={{ marginTop: 3 }}><KindBadge kind={d.kind} />by {user(d.authorId)?.name.split(' ')[0]}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Who owns what</h2></div>
            <div className="list">
              {owners.map(o => (
                <div key={o.id} className="list-item">
                  <Avatar user={o} />
                  <div className="grow">
                    <div style={{ fontWeight: 550 }}>{o.name}</div>
                    <div className="tiny muted">{state.areas.filter(a => a.ownerId === o.id).map(a => a.name).join(', ')}</div>
                  </div>
                  <Link className="btn sm" to={`/messages?to=${o.id}`}><Icon name="chat" size={13} /></Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SeniorHome() {
  const { state, me, user } = useStore()
  const hires = state.users.filter(u => u.role === 'new')
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

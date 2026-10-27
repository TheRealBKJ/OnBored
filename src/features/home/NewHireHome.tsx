import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { nextUp, planProgress, plansFor } from '../../lib/selectors'
import { ITEM_ICON, itemHref } from '../../lib/planItems'
import { AskWhy } from '../../components/AskWhy'
import { Avatar, Difficulty, Empty, Icon, KindBadge, SourceBadge } from '../../components/ui'

export function NewHireHome() {
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

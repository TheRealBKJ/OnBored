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
    <div className="page flex flex-col gap-4">
      <div className="card hero">
        <div>
          <div className="text-small text-muted">Day {day} at Relay · {me.team} team</div>
          <h1 className="mt-1">Welcome back, {me.name.split(' ')[0]}</h1>
          <p className="text-muted mt-1.5 max-w-130">
            {plan ? <>You're on <strong className="text-ink">{plan.title}</strong>. {prog!.total - prog!.completed} steps left.</> : 'No plan assigned yet. Your senior engineer will add one.'}
          </p>
        </div>
        {prog && <div className="progress-ring" style={{ ['--p' as string]: Math.round(prog.ratio * 100) }}><span>{Math.round(prog.ratio * 100)}%</span></div>}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="card-head"><h2>Up next</h2>{plan && <Link className="btn sm" to={`/plans/${plan.id}`}>Open plan</Link>}</div>
            <div className="list">
              {up.length === 0 && <Empty>Plan complete. Pick a starter task to keep going.</Empty>}
              {up.map(({ item, phase }) => {
                const href = itemHref(item)
                const body = (
                  <>
                    <span className="badge outlined"><Icon name={ITEM_ICON[item.type]} size={12} />{item.type}</span>
                    <div className="min-w-0 flex-1"><div className="font-[550]">{item.title}</div><div className="text-tiny text-muted">{phase}</div></div>
                    {href && <Icon name="arrow" size={14} />}
                  </>
                )
                return href ? <Link key={item.id} to={href} className="list-row">{body}</Link> : <div key={item.id} className="list-row">{body}</div>
              })}
            </div>
          </div>

          <AskWhy />

          <div className="card">
            <div className="card-head"><h2>My tasks</h2><Link className="btn sm" to="/tasks">All tasks</Link></div>
            <div className="list">
              {[...myTasks, ...suggested].map(t => (
                <Link key={t.id} to={`/tasks?open=${t.id}`} className="list-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-[3px]">
                      <span className="font-[550]">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-tiny text-muted"><SourceBadge task={t} /><Difficulty level={t.difficulty} />{t.estimate}{!t.assigneeId && <span className="badge">Suggested</span>}</div>
                  </div>
                  {t.assigneeId && <span className="badge accent">{t.status.replace('_', ' ')}</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="card-head"><h2>The why behind things</h2></div>
            <div className="list">
              {whys.map(d => (
                <Link key={d.id} to={`/library/${d.id}`} className="list-row">
                  <div className="min-w-0 flex-1">
                    <div className="font-[550]">{d.question ?? d.title}</div>
                    <div className="flex items-center gap-2 text-tiny text-muted mt-[3px]"><KindBadge kind={d.kind} />by {user(d.authorId)?.name.split(' ')[0]}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Who owns what</h2></div>
            <div className="list">
              {owners.map(o => (
                <div key={o.id} className="list-row">
                  <Avatar user={o} />
                  <div className="min-w-0 flex-1">
                    <div className="font-[550]">{o.name}</div>
                    <div className="text-tiny text-muted">{state.areas.filter(a => a.ownerId === o.id).map(a => a.name).join(', ')}</div>
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

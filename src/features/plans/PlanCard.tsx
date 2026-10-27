import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { planItems, planProgress } from '../../lib/selectors'
import type { Plan } from '../../lib/types'
import { Avatar, Progress } from '../../components/ui'

export function PlanCard({ plan: p }: { plan: Plan }) {
  const { state, user } = useStore()
  const items = planItems(p)
  return (
    <Link to={`/plans/${p.id}`} className="card card-pad stack" style={{ gap: 10 }}>
      <div className="row-between"><span className="badge accent">{p.track}</span><span className="tiny muted">{p.phases.length} phases · {items.length} steps</span></div>
      <h2>{p.title}</h2>
      <p className="small muted">{p.description}</p>
      <div className="divider" />
      {p.assigneeIds.length === 0 && <span className="tiny faint">Not assigned yet</span>}
      {p.assigneeIds.map(id => {
        const prog = planProgress(state, p, id)
        return (
          <div key={id} className="row">
            <Avatar user={user(id)} size={22} />
            <span className="small" style={{ width: 90 }}>{user(id)?.name.split(' ')[0]}</span>
            <div className="grow"><Progress value={prog.ratio} /></div>
            <span className="tiny muted">{Math.round(prog.ratio * 100)}%</span>
          </div>
        )
      })}
      <span className="tiny faint">by {user(p.authorId)?.name}</span>
    </Link>
  )
}

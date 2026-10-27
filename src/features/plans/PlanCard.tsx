import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { planItems, planProgress } from '../../lib/selectors'
import type { Plan } from '../../lib/types'
import { Avatar, Progress } from '../../components/ui'

export function PlanCard({ plan: p }: { plan: Plan }) {
  const { state, user } = useStore()
  const items = planItems(p)
  return (
    <Link to={`/plans/${p.id}`} className="card card-pad flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2"><span className="badge accent">{p.track}</span><span className="text-tiny text-muted">{p.phases.length} phases · {items.length} steps</span></div>
      <h2>{p.title}</h2>
      <p className="text-small text-muted">{p.description}</p>
      <div className="my-1 h-px bg-line" />
      {p.assigneeIds.length === 0 && <span className="text-tiny text-faint">Not assigned yet</span>}
      {p.assigneeIds.map(id => {
        const prog = planProgress(state, p, id)
        return (
          <div key={id} className="flex items-center gap-2">
            <Avatar user={user(id)} size={22} />
            <span className="text-small w-[90px]">{user(id)?.name.split(' ')[0]}</span>
            <div className="min-w-0 flex-1"><Progress value={prog.ratio} /></div>
            <span className="text-tiny text-muted">{Math.round(prog.ratio * 100)}%</span>
          </div>
        )
      })}
      <span className="text-tiny text-faint">by {user(p.authorId)?.name}</span>
    </Link>
  )
}

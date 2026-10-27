import { useStore } from '../../lib/store'
import { plansFor } from '../../lib/selectors'
import { Empty } from '../../components/ui'
import { PlanCard } from './PlanCard'
import { PlanDetail } from './PlanDetail'

export function NewHirePlans() {
  const { state, me } = useStore()
  const plans = plansFor(state, me)
  // A new engineer with exactly one plan lands straight in it.
  if (plans.length === 1) return <PlanDetail id={plans[0].id} />
  return (
    <div className="page">
      <div className="page-head"><div><h1>My plans</h1><p>Your onboarding, step by step.</p></div></div>
      {plans.length === 0 && <div className="card"><Empty>No plan assigned yet. Your senior engineer will add one.</Empty></div>}
      <div className="grid gap-4 sm:grid-cols-2">{plans.map(p => <PlanCard key={p.id} plan={p} />)}</div>
    </div>
  )
}

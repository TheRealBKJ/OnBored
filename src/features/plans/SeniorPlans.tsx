import { useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Empty, Icon } from '../../components/ui'
import { PlanCard } from './PlanCard'
import { NewPlanModal } from './NewPlanModal'

export function SeniorPlans() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const creating = params.get('new') === '1'
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Onboarding plans</h1><p>Role-specific plans: what to read, explore, do and who to meet, week by week.</p></div>
        <button className="btn primary" onClick={() => setParams({ new: '1' })}><Icon name="plus" />New plan</button>
      </div>
      {state.plans.length === 0 && <div className="card"><Empty>No plans yet.</Empty></div>}
      <div className="grid g2">{state.plans.map(p => <PlanCard key={p.id} plan={p} />)}</div>
      {creating && <NewPlanModal onClose={() => setParams({})} />}
    </div>
  )
}

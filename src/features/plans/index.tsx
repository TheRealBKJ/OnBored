import { useStore } from '../../lib/store'
import { forRole } from '../../lib/permissions'
import { SeniorPlans } from './SeniorPlans'
import { NewHirePlans } from './NewHirePlans'

export { PlanDetail } from './PlanDetail'

/** /plans: seniors manage every plan; a new engineer sees only theirs. */
export function Plans() {
  const { me } = useStore()
  return forRole(me, { senior: <SeniorPlans />, new: <NewHirePlans /> })
}

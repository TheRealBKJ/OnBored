import { useStore } from '../../lib/store'
import { forRole } from '../../lib/permissions'
import { NewHireHome } from './NewHireHome'
import { SeniorHome } from './SeniorHome'

/** Home is two different pages: a learner's next steps, or a senior's view of everyone ramping. */
export function Home() {
  const { me } = useStore()
  return forRole(me, { senior: <SeniorHome />, new: <NewHireHome /> })
}

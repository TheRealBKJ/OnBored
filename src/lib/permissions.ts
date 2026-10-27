import type { Role, User } from './types'
import { useStore } from './store'

/**
 * Everything a role can do, in one place. Views ask `can(me, 'plan.edit')` instead of
 * checking `me.role === 'senior'`, so adding a role (manager, onboarding buddy, intern)
 * or moving a power between roles is a change to this table, not a hunt through every page.
 */
export type Capability =
  // plans
  | 'plan.viewAll' // see every plan, not just assigned ones
  | 'plan.create'
  | 'plan.edit'
  | 'plan.checkOff' // tick off your own plan steps
  | 'progress.viewOthers'
  // library
  | 'doc.viewAllTracks'
  | 'doc.create'
  | 'doc.edit'
  | 'doc.countRead' // opening a doc counts as a read in its stats
  // codebase
  | 'area.edit'
  | 'scan.recommend' // a scan finding added by this role is an endorsed recommendation
  // tasks
  | 'task.recommend'
  | 'task.edit'
  | 'task.assign'
  | 'task.approve'
  | 'task.pickUp'
  // messages and ask-why
  | 'why.capture' // save your answer in a thread as a why record
  | 'ask.routeToOwner' // turn an unanswered Ask-why into a message to the owner

const GRANTS: Record<Role, readonly Capability[]> = {
  senior: [
    'plan.viewAll', 'plan.create', 'plan.edit', 'progress.viewOthers',
    'doc.viewAllTracks', 'doc.create', 'doc.edit',
    'area.edit', 'scan.recommend',
    'task.recommend', 'task.edit', 'task.assign', 'task.approve',
    'why.capture',
  ],
  new: [
    'plan.checkOff',
    'doc.countRead',
    'task.pickUp',
    'ask.routeToOwner',
  ],
}

export function can(user: Pick<User, 'role'> | undefined, cap: Capability) {
  return !!user && GRANTS[user.role].includes(cap)
}

/** `const can = useCan(); can('plan.edit')` for the signed-in user. */
export function useCan() {
  const { me } = useStore()
  return (cap: Capability) => can(me, cap)
}

/**
 * Pick the variant for the user's role. Typed as a full `Record<Role, T>` on purpose:
 * adding a role makes every page that splits by role fail to compile until it decides what that role sees.
 */
export function forRole<T>(user: Pick<User, 'role'>, variants: Record<Role, T>): T {
  return variants[user.role]
}

import type { PlanItem } from './types'

export const ITEM_ICON: Record<PlanItem['type'], string> = { read: 'book', task: 'task', explore: 'code', meet: 'team' }

export function itemHref(item: PlanItem) {
  if (!item.refId) return undefined
  if (item.type === 'read') return `/library/${item.refId}`
  if (item.type === 'task') return `/tasks?open=${item.refId}`
  if (item.type === 'explore') return `/codebase?area=${item.refId}`
}

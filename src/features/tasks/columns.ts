import type { TaskStatus } from '../../lib/types'

export const COLS: { s: TaskStatus; label: string }[] = [
  { s: 'open', label: 'Up for grabs' }, { s: 'in_progress', label: 'In progress' }, { s: 'review', label: 'In review' }, { s: 'done', label: 'Done' },
]

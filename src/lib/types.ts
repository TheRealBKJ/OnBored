export type Role = 'senior' | 'new'

export interface User {
  id: string
  name: string
  role: Role
  title: string
  team: string
  track: string // e.g. "Backend", "Frontend", "Platform"
  color: string
  startDate?: string
}

export type DocKind = 'guide' | 'decision' | 'link' | 'file' | 'why'

export interface DocSource {
  label: string
  url?: string
}

export interface Doc {
  id: string
  kind: DocKind
  title: string
  summary: string
  body: string
  tags: string[]
  areaId?: string
  tracks: string[] // empty = everyone
  authorId: string
  createdAt: string
  url?: string
  fileName?: string
  // decision records (ADR-style) and captured "why" answers
  question?: string
  decision?: string
  alternatives?: string[]
  sources?: DocSource[]
  capturedFromThreadId?: string
  /** Times read by new engineers; seeded docs start with a historical count. */
  views?: number
  /** New engineers already counted in `views`. */
  readBy?: string[]
}

export interface CodeArea {
  id: string
  name: string
  path: string
  description: string
  why: string
  ownerId: string
  depth: 'core' | 'supporting' | 'edge'
  dependsOn: string[]
  gotchas: string[]
}

export type PlanItemType = 'read' | 'task' | 'explore' | 'meet'

export interface PlanItem {
  id: string
  type: PlanItemType
  title: string
  refId?: string // doc id, task id or area id
  note?: string
}

export interface PlanPhase {
  id: string
  title: string
  goal: string
  items: PlanItem[]
}

export interface Plan {
  id: string
  title: string
  track: string
  description: string
  authorId: string
  assigneeIds: string[]
  phases: PlanPhase[]
  createdAt: string
}

export type TaskSource = 'ai' | 'senior'
export type TaskStatus = 'open' | 'in_progress' | 'review' | 'done'

export interface StarterTask {
  id: string
  title: string
  description: string
  source: TaskSource
  kind: string // todo, tests, docs, types, cleanup...
  file?: string
  line?: number
  snippet?: string
  difficulty: 1 | 2 | 3
  estimate: string
  areaId?: string
  status: TaskStatus
  assigneeId?: string
  recommendedById?: string
  learns: string // what you learn by doing it
  createdAt: string
}

export interface Message {
  id: string
  fromId: string
  body: string
  at: string
  savedDocId?: string
}

export interface Thread {
  id: string
  participantIds: string[]
  subject: string
  context?: { kind: 'task' | 'doc' | 'area'; id: string }
  messages: Message[]
}

export interface ScanFile {
  path: string
  size: number
  lang: string
  lines: number
}

export interface RepoScan {
  id: string
  name: string
  source: 'folder' | 'github'
  scannedAt: string
  files: ScanFile[]
  findings: StarterTask[]
  readme?: string
}

export interface AppState {
  users: User[]
  currentUserId: string
  docs: Doc[]
  areas: CodeArea[]
  plans: Plan[]
  tasks: StarterTask[]
  threads: Thread[]
  progress: Record<string, string[]> // userId -> completed plan item ids
  reads: Record<string, string[]> // userId -> threadIds read up to now (simple)
  scan?: RepoScan
}

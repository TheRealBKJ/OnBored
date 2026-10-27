import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { can } from '../../lib/permissions'
import { Avatar, Difficulty, Icon, SourceBadge } from '../../components/ui'
import { COLS } from './columns'
import { TaskModal } from './TaskModal'
import { TaskEditor } from './TaskEditor'

export function Tasks() {
  const { state, me, user } = useStore()
  const [params, setParams] = useSearchParams()
  const [src, setSrc] = useState<'all' | 'ai' | 'senior'>('all')
  const [mine, setMine] = useState(can(me, 'task.pickUp') ? 'mine+open' : 'all')
  const openId = params.get('open')
  const creating = params.get('new') === '1'

  const tasks = state.tasks.filter(t =>
    (src === 'all' || t.source === src) &&
    (mine === 'all' || t.assigneeId === me.id || (mine === 'mine+open' && !t.assigneeId)))

  return (
    <div className="page max-w-330">
      <div className="page-head">
        <div><h1>Starter tasks</h1><p>Small, real changes picked to teach one part of the codebase each. Some found by the scanner, some chosen by seniors.</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link className="btn" to="/codebase?tab=scan"><Icon name="spark" />Find more by scanning</Link>
          {can(me, 'task.recommend') && <button className="btn primary" onClick={() => setParams({ new: '1' })}><Icon name="plus" />Recommend a task</button>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3.5">
        <div className="chips">
          {(['all', 'senior', 'ai'] as const).map(s => <button key={s} className={`chip ${src === s ? 'active' : ''}`} onClick={() => setSrc(s)}>{{ all: 'All sources', senior: 'Senior picks', ai: 'Found by scan' }[s]}</button>)}
        </div>
        <span className="min-w-0 flex-1" />
        <select className="select w-auto" value={mine} onChange={e => setMine(e.target.value)}>
          <option value="all">Everyone's tasks</option>
          <option value="mine+open">Mine + unassigned</option>
          <option value="mine">Only mine</option>
        </select>
      </div>

      <div className="board">
        {COLS.map(c => {
          const list = tasks.filter(t => t.status === c.s)
          return (
            <div key={c.s} className="col">
              <div className="col-head"><span>{c.label}</span><span>{list.length}</span></div>
              {list.map(t => (
                <button key={t.id} className="card task-card text-left" onClick={() => setParams({ open: t.id })}>
                  <strong className="text-small">{t.title}</strong>
                  <div className="flex items-center gap-2 flex-wrap text-tiny text-muted"><SourceBadge task={t} /><Difficulty level={t.difficulty} />{t.estimate}</div>
                  {t.file && <code className="text-tiny text-muted truncate">{t.file}</code>}
                  <div className="flex items-center justify-between gap-2 text-tiny text-muted">
                    <span>{state.areas.find(a => a.id === t.areaId)?.name ?? t.kind}</span>
                    {t.assigneeId ? <Avatar user={user(t.assigneeId)} size={20} /> : <span className="text-faint">unassigned</span>}
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </div>
      {openId && <TaskModal id={openId} onClose={() => setParams({})} />}
      {creating && <TaskEditor onClose={() => setParams({})} />}
    </div>
  )
}

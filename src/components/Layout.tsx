import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { newHires, seniors, unreadCount } from '../lib/selectors'
import { forRole } from '../lib/permissions'
import { Avatar, Icon } from './ui'

export function Layout() {
  const { state, me, mutate, reset } = useStore()
  const loc = useLocation()
  const nav = useNavigate()
  const unread = unreadCount(state, me.id)
  const label = (senior: string, newHire: string) => forRole(me, { senior, new: newHire })

  // The mobile menu remembers the page it was opened on, so navigating anywhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === loc.pathname

  const links = [
    { to: '/', icon: 'home', label: label('Dashboard', 'Home'), end: true },
    { to: '/plans', icon: 'plan', label: label('Plans', 'My plan') },
    { to: '/library', icon: 'book', label: 'Library' },
    { to: '/codebase', icon: 'code', label: 'Codebase' },
    { to: '/tasks', icon: 'task', label: label('Starter tasks', 'Tasks') },
    { to: '/messages', icon: 'chat', label: 'Messages', count: unread },
  ]

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><Icon name="book" size={15} /></span>
          <div>Layers<small>Relay engineering</small></div>
        </div>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
            <Icon name={l.icon} />{l.label}
            {!!l.count && <span className="count">{l.count}</span>}
          </NavLink>
        ))}

        <div className="sidebar-foot">
          <div className="nav-section px-0.5 py-0">Viewing as (demo)</div>
          <select
            className="select"
            value={me.id}
            onChange={e => { mutate(s => { s.currentUserId = e.target.value }); nav('/') }}
          >
            <optgroup label="Senior engineers">
              {seniors(state).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </optgroup>
            <optgroup label="New engineers">
              {newHires(state).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </optgroup>
          </select>
          <div className="flex items-center gap-2">
            <Avatar user={me} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{me.name}</div>
              <div className="text-tiny text-muted truncate">{me.title} · {me.team}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-tiny text-faint"><Icon name="lock" size={12} />Read-only access to code</div>
          <button className="btn ghost sm" onClick={() => confirm('Reset all demo data?') && reset()}>Reset demo data</button>
        </div>
      </aside>

      <div className="main">
        <div className="mobile-bar">
          <button className="btn ghost sm" onClick={() => setOpenOn(open ? null : loc.pathname)} aria-label="Menu"><Icon name="menu" /></button>
          <strong>Layers</strong>
          <span className="min-w-0 flex-1" />
          <Avatar user={me} size={26} />
        </div>
        <Outlet />
      </div>
    </div>
  )
}

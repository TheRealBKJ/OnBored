import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../lib/store'
import { newHires, seniors, unreadCount } from '../lib/selectors'
import { forRole } from '../lib/permissions'
import { Avatar, Icon } from './ui'

export function Layout() {
  const { state, me, mutate, reset } = useStore()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  const unread = unreadCount(state, me.id)
  const label = (senior: string, newHire: string) => forRole(me, { senior, new: newHire })

  useEffect(() => setOpen(false), [loc.pathname])

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
          <div className="nav-section" style={{ padding: '0 2px' }}>Viewing as (demo)</div>
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
          <div className="row">
            <Avatar user={me} size={30} />
            <div className="grow">
              <div className="truncate" style={{ fontWeight: 600 }}>{me.name}</div>
              <div className="tiny muted truncate">{me.title} · {me.team}</div>
            </div>
          </div>
          <div className="row tiny faint"><Icon name="lock" size={12} />Read-only access to code</div>
          <button className="btn ghost sm" onClick={() => confirm('Reset all demo data?') && reset()}>Reset demo data</button>
        </div>
      </aside>

      <div className="main">
        <div className="mobile-bar">
          <button className="btn ghost sm" onClick={() => setOpen(o => !o)} aria-label="Menu"><Icon name="menu" /></button>
          <strong>Layers</strong>
          <span className="grow" />
          <Avatar user={me} size={26} />
        </div>
        <Outlet />
      </div>
    </div>
  )
}

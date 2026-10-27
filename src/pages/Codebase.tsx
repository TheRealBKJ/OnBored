import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, uid, ago } from '../lib/store'
import { scanFolder, scanGitHub, buildTree } from '../lib/scanner'
import type { TreeNode } from '../lib/scanner'
import { openThread } from '../lib/actions'
import type { CodeArea, RepoScan, StarterTask } from '../lib/types'
import { Avatar, Difficulty, Empty, Field, Icon, KindBadge, Modal, SourceBadge } from '../components/ui'

const DEPTH_LABEL: Record<CodeArea['depth'], string> = { core: 'Core: learn these first', supporting: 'Supporting', edge: 'Infrastructure & edges' }

export function Codebase() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'map'
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Codebase</h1><p>The map seniors drew of how things fit together and why, plus a read-only scan of the real code.</p></div>
      </div>
      <div className="tabs">
        <button className={`tab ${tab === 'map' ? 'active' : ''}`} onClick={() => setParams({ tab: 'map' })}>Architecture map</button>
        <button className={`tab ${tab === 'scan' ? 'active' : ''}`} onClick={() => setParams({ tab: 'scan' })}>Scan a repo</button>
      </div>
      {tab === 'map' ? <AreaMap /> : <Scanner />}
    </div>
  )
}

/* ------------------------------ map ------------------------------ */

function AreaMap() {
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const selId = params.get('area') ?? state.areas[0]?.id
  const sel = state.areas.find(a => a.id === selId)
  const [editing, setEditing] = useState<CodeArea | null>(null)
  const senior = me.role === 'senior'

  const related = useMemo(() => {
    if (!sel) return new Set<string>()
    const usedBy = state.areas.filter(a => a.dependsOn.includes(sel.id)).map(a => a.id)
    return new Set([sel.id, ...sel.dependsOn, ...usedBy])
  }, [sel, state.areas])

  const select = (id: string) => setParams({ tab: 'map', area: id })
  const ask = (a: CodeArea) => {
    let id = ''
    mutate(s => { id = openThread(s, me.id, a.ownerId, `Question about ${a.name}`, { kind: 'area', id: a.id }) })
    nav(`/messages/${id}`)
  }

  return (
    <div className="split">
      <div className="stack" style={{ gap: 18 }}>
        <div className="row-between wrap">
          <div className="row tiny muted wrap">
            <span className="badge outline" style={{ borderLeft: '3px solid var(--accent)' }}>core</span>
            <span className="badge outline" style={{ borderLeft: '3px solid var(--senior)' }}>supporting</span>
            <span className="badge outline" style={{ borderLeft: '3px solid var(--faint)' }}>edge</span>
            <span>Select an area to highlight what it depends on and what uses it.</span>
          </div>
          {senior && <button className="btn sm" onClick={() => setEditing({ id: uid('a'), name: '', path: '', description: '', why: '', ownerId: me.id, depth: 'supporting', dependsOn: [], gotchas: [] })}><Icon name="plus" size={13} />Add area</button>}
        </div>
        {(['core', 'supporting', 'edge'] as const).map(depth => {
          const areas = state.areas.filter(a => a.depth === depth)
          if (!areas.length) return null
          return (
            <div key={depth}>
              <div className="nav-section" style={{ padding: '0 0 8px' }}>{DEPTH_LABEL[depth]}</div>
              <div className="grid g2">
                {areas.map(a => {
                  const tasks = state.tasks.filter(t => t.areaId === a.id && t.status !== 'done').length
                  const docs = state.docs.filter(d => d.areaId === a.id).length
                  const role = !sel || a.id === sel.id ? '' : sel.dependsOn.includes(a.id) ? 'depends on' : a.dependsOn.includes(sel.id) ? 'uses it' : ''
                  return (
                    <button key={a.id} onClick={() => select(a.id)}
                      className={`card area-card depth-${a.depth} ${a.id === sel?.id ? 'selected' : ''} ${sel && !related.has(a.id) ? 'dim' : ''}`}
                      style={{ textAlign: 'left' }}>
                      <div className="row-between"><strong>{a.name}</strong>{role && <span className="badge accent">{role === 'depends on' ? `${sel!.name} needs this` : `uses ${sel!.name}`}</span>}</div>
                      <code className="muted tiny">{a.path}</code>
                      <p className="small muted" style={{ margin: '6px 0 8px' }}>{a.description}</p>
                      <div className="row tiny muted"><Avatar user={user(a.ownerId)} size={18} />{user(a.ownerId)?.name.split(' ')[0]}<span>· {docs} docs · {tasks} tasks</span></div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {sel && (
        <aside className="card" style={{ position: 'sticky', top: 16 }}>
          <div className="card-head">
            <div><h2>{sel.name}</h2><code className="tiny muted">{sel.path}</code></div>
            {senior && <button className="btn sm" onClick={() => setEditing(structuredClone(sel))}><Icon name="edit" size={13} />Edit</button>}
          </div>
          <div className="card-pad stack">
            <p className="small">{sel.description}</p>
            <div className="callout small"><div className="tiny" style={{ fontWeight: 650, opacity: .8, marginBottom: 2 }}>WHY IT'S BUILT THIS WAY</div>{sel.why}</div>
            {sel.gotchas.length > 0 && (
              <div><h3 style={{ marginBottom: 4 }}>Gotchas</h3>
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{sel.gotchas.map(g => <li key={g}>{g}</li>)}</ul></div>
            )}
            <div className="row wrap small">
              <span className="muted">Depends on:</span>
              {sel.dependsOn.length ? sel.dependsOn.map(id => <button key={id} className="chip" onClick={() => select(id)}>{state.areas.find(a => a.id === id)?.name}</button>) : <span className="faint">nothing</span>}
            </div>
            <div className="divider" />
            <div className="row">
              <Avatar user={user(sel.ownerId)} />
              <div className="grow"><div className="small" style={{ fontWeight: 600 }}>{user(sel.ownerId)?.name}</div><div className="tiny muted">Owner</div></div>
              {me.id !== sel.ownerId && <button className="btn sm" onClick={() => ask(sel)}><Icon name="chat" size={13} />Ask</button>}
            </div>
            <AreaLinks area={sel} />
          </div>
        </aside>
      )}
      {editing && <AreaEditor area={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function AreaLinks({ area }: { area: CodeArea }) {
  const { state } = useStore()
  const docs = state.docs.filter(d => d.areaId === area.id)
  const tasks = state.tasks.filter(t => t.areaId === area.id && t.status !== 'done')
  return (
    <>
      {docs.length > 0 && <div className="stack-sm"><h3>Read</h3>{docs.map(d => <Link key={d.id} to={`/library/${d.id}`} className="row small"><KindBadge kind={d.kind} /><span className="truncate" style={{ textDecoration: 'underline' }}>{d.title}</span></Link>)}</div>}
      {tasks.length > 0 && <div className="stack-sm"><h3>Starter tasks here</h3>{tasks.map(t => <Link key={t.id} to={`/tasks?open=${t.id}`} className="row small"><Difficulty level={t.difficulty} /><span className="truncate" style={{ textDecoration: 'underline' }}>{t.title}</span></Link>)}</div>}
    </>
  )
}

function AreaEditor({ area, onClose }: { area: CodeArea; onClose: () => void }) {
  const { state, mutate } = useStore()
  const [a, setA] = useState(area)
  const isNew = !state.areas.some(x => x.id === area.id)
  const set = <K extends keyof CodeArea>(k: K, v: CodeArea[K]) => setA(x => ({ ...x, [k]: v }))
  const save = () => {
    mutate(s => { const i = s.areas.findIndex(x => x.id === a.id); if (i >= 0) s.areas[i] = a; else s.areas.push(a) })
    onClose()
  }
  return (
    <Modal title={isNew ? 'Add codebase area' : `Edit ${area.name}`} onClose={onClose} footer={<>
      {!isNew && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => { mutate(s => { s.areas = s.areas.filter(x => x.id !== a.id); s.areas.forEach(x => { x.dependsOn = x.dependsOn.filter(d => d !== a.id) }) }); onClose() }}>Delete</button>}
      <button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={!a.name}>Save</button></>}>
      <div className="grid g2">
        <Field label="Name"><input className="input" value={a.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Path in repo"><input className="input mono" value={a.path} onChange={e => set('path', e.target.value)} placeholder="services/billing" /></Field>
      </div>
      <Field label="What it does"><textarea className="textarea" style={{ minHeight: 60 }} value={a.description} onChange={e => set('description', e.target.value)} /></Field>
      <Field label="Why it's built this way"><textarea className="textarea" style={{ minHeight: 70 }} value={a.why} onChange={e => set('why', e.target.value)} /></Field>
      <Field label="Gotchas (one per line)"><textarea className="textarea" style={{ minHeight: 60 }} value={a.gotchas.join('\n')} onChange={e => set('gotchas', e.target.value.split('\n'))} /></Field>
      <div className="grid g2">
        <Field label="Owner"><select className="select" value={a.ownerId} onChange={e => set('ownerId', e.target.value)}>{state.users.filter(u => u.role === 'senior').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Importance"><select className="select" value={a.depth} onChange={e => set('depth', e.target.value as CodeArea['depth'])}><option value="core">Core</option><option value="supporting">Supporting</option><option value="edge">Edge / infra</option></select></Field>
      </div>
      <div><span className="label">Depends on</span>
        <div className="chips">{state.areas.filter(x => x.id !== a.id).map(x => (
          <button key={x.id} className={`chip ${a.dependsOn.includes(x.id) ? 'active' : ''}`} onClick={() => set('dependsOn', a.dependsOn.includes(x.id) ? a.dependsOn.filter(d => d !== x.id) : [...a.dependsOn, x.id])}>{x.name}</button>
        ))}</div>
      </div>
    </Modal>
  )
}

/* ------------------------------ scanner ------------------------------ */

const LANG_COLORS = ['#3f6f2a', '#6a4fd8', '#b25e09', '#2f7de1', '#d43f6a', '#0f9d76', '#8a8678']

function Scanner() {
  const { state, me, mutate } = useStore()
  const [repo, setRepo] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const folderRef = useRef<HTMLInputElement>(null)
  const scan = state.scan

  const run = async (fn: () => Promise<RepoScan>) => {
    setErr(''); setBusy('Scanning…')
    try {
      const result = await fn()
      mutate(s => { s.scan = result })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card card-pad stack">
        <div className="row-between wrap">
          <div>
            <h2>Scan a codebase</h2>
            <p className="small muted">Read-only and runs in your browser. Files never leave your machine. Finds small first tasks: TODOs, untested files, missing READMEs, loose types.</p>
          </div>
        </div>
        <div className="row wrap">
          <button className="btn primary" disabled={!!busy} onClick={() => folderRef.current?.click()}><Icon name="folder" />Choose local folder</button>
          <input ref={folderRef} type="file" hidden
            // @ts-expect-error non-standard but supported in all major browsers
            webkitdirectory="" directory=""
            onChange={e => { const f = e.target.files; if (f?.length) run(() => scanFolder(f, (n, t) => setBusy(`Reading ${n}/${t} files…`))); e.target.value = '' }} />
          <span className="muted small">or</span>
          <form className="row grow" style={{ minWidth: 260 }} onSubmit={e => { e.preventDefault(); if (repo) run(() => scanGitHub(repo, setBusy)) }}>
            <input className="input" value={repo} onChange={e => setRepo(e.target.value)} placeholder="public GitHub repo, e.g. tiangolo/fastapi" />
            <button className="btn" disabled={!!busy || !repo}><Icon name="github" />Scan</button>
          </form>
        </div>
        {busy && <div className="small muted row"><Icon name="spark" />{busy}</div>}
        {err && <div className="small" style={{ color: 'var(--danger)' }}>{err}</div>}
      </div>

      {!scan && !busy && <div className="card"><Empty>No scan yet. Pick a folder (try this project) or a public repo.</Empty></div>}
      {scan && <ScanResult scan={scan} key={scan.id} senior={me.role === 'senior'} />}
    </div>
  )
}

function ScanResult({ scan, senior }: { scan: RepoScan; senior: boolean }) {
  const { state, me, mutate } = useStore()
  const tree = useMemo(() => buildTree(scan.files), [scan.files])
  const [selPath, setSelPath] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const hires = state.users.filter(u => u.role === 'new')

  const langs = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of scan.files) if (f.lang !== 'Other' && f.lang !== 'JSON' && f.lang !== 'Markdown') m.set(f.lang, (m.get(f.lang) ?? 0) + (f.size || 1))
    const total = [...m.values()].reduce((a, b) => a + b, 0) || 1
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([lang, n], i) => ({ lang, pct: n / total, color: LANG_COLORS[i] }))
  }, [scan.files])

  const findings = scan.findings.filter(f => !selPath || f.file?.startsWith(selPath))
  const already = new Set(state.tasks.map(t => `${t.file}:${t.line}:${t.title}`))
  const areaFor = (path?: string) => path ? state.areas.find(a => a.path && path.startsWith(a.path))?.id : undefined

  const add = (f: StarterTask) => {
    mutate(s => {
      s.tasks.unshift({
        ...f, id: uid('t'), areaId: areaFor(f.file),
        // A senior adding a scan finding is endorsing it; a new engineer adding one is picking it up.
        source: senior ? 'senior' : 'ai', recommendedById: senior ? me.id : undefined,
        assigneeId: senior ? assignTo || undefined : me.id, status: senior ? 'open' : 'in_progress',
      })
    })
  }

  return (
    <>
      <div className="grid g4">
        <div className="card stat"><div className="v truncate" style={{ fontSize: 18 }}>{scan.name}</div><div className="l">{scan.source === 'github' ? 'GitHub' : 'Local folder'} · {ago(scan.scannedAt)}</div></div>
        <div className="card stat"><div className="v">{scan.files.length.toLocaleString()}</div><div className="l">Files</div></div>
        <div className="card stat"><div className="v">{scan.files.reduce((n, f) => n + f.lines, 0).toLocaleString()}</div><div className="l">Lines read</div></div>
        <div className="card stat"><div className="v">{scan.findings.length}</div><div className="l">Starter tasks found</div></div>
      </div>

      {langs.length > 0 && (
        <div className="card card-pad stack-sm">
          <div className="bar">{langs.map(l => <div key={l.lang} style={{ width: `${l.pct * 100}%`, background: l.color }} />)}</div>
          <div className="row wrap small">{langs.map(l => <span key={l.lang} className="row" style={{ gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 99, background: l.color, display: 'inline-block' }} />{l.lang} <span className="muted">{Math.round(l.pct * 100)}%</span></span>)}</div>
        </div>
      )}

      <div className="split" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)' }}>
        <div className="card">
          <div className="card-head"><h3>Structure</h3>{selPath && <button className="btn ghost sm" onClick={() => setSelPath('')}>Clear filter</button>}</div>
          <div className="card-pad tree" style={{ maxHeight: 560, overflowY: 'auto' }}>
            {tree.children.map(n => <TreeRow key={n.path} node={n} depth={0} sel={selPath} onSel={setSelPath} />)}
          </div>
        </div>

        <div className="card">
          <div className="card-head wrap">
            <h3>Starter tasks {selPath && <code className="muted">in {selPath}</code>}</h3>
            {senior && (
              <label className="row small muted">Assign to
                <select className="select" style={{ width: 'auto' }} value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                  <option value="">Anyone (open)</option>
                  {hires.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="list" style={{ maxHeight: 560, overflowY: 'auto' }}>
            {findings.length === 0 && <Empty>Nothing found here. Clean code, or try another folder.</Empty>}
            {findings.map(f => {
              const added = already.has(`${f.file}:${f.line}:${f.title}`)
              return (
                <div key={f.id} className="list-item">
                  <div className="grow stack-sm">
                    <div className="row-between" style={{ alignItems: 'flex-start' }}>
                      <strong className="small">{f.title}</strong>
                      <button className={`btn sm ${added ? '' : 'primary'}`} disabled={added} onClick={() => add(f)}>
                        {added ? 'Added' : senior ? 'Recommend' : 'Pick up'}
                      </button>
                    </div>
                    <div className="row wrap tiny muted"><SourceBadge task={f} /><span className="badge outline">{f.kind}</span><Difficulty level={f.difficulty} />{f.estimate}</div>
                    {f.file && <code className="tiny muted">{f.file}{f.line ? `:${f.line}` : ''}</code>}
                    {f.snippet && <div className="snippet">{f.snippet}</div>}
                    <div className="tiny muted"><strong>You'll learn:</strong> {f.learns}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {scan.readme && (
        <div className="card"><div className="card-head"><h3>README</h3></div><div className="card-pad prose small" style={{ maxHeight: 360, overflowY: 'auto' }}>{scan.readme}</div></div>
      )}
    </>
  )
}

function TreeRow({ node, depth, sel, onSel }: { node: TreeNode; depth: number; sel: string; onSel: (p: string) => void }) {
  const isDir = node.children.length > 0
  const [open, setOpen] = useState(depth < 1)
  return (
    <>
      <div className={`tree-row ${sel === node.path ? 'sel' : ''}`} style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => { if (isDir) { setOpen(o => !o); onSel(node.path) } }}>
        <span className="faint" style={{ width: 10 }}>{isDir ? (open ? '▾' : '▸') : ''}</span>
        <span style={{ color: isDir ? 'var(--text)' : 'var(--muted)' }} className="truncate grow">{node.name}{isDir && '/'}</span>
        {isDir && <span className="faint tiny">{node.files}</span>}
      </div>
      {isDir && open && node.children.slice(0, 200).map(c => <TreeRow key={c.path} node={c} depth={depth + 1} sel={sel} onSel={onSel} />)}
    </>
  )
}

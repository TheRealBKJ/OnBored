import { useMemo, useRef, useState } from 'react'
import { useStore, uid, ago } from '../../lib/store'
import { scanFolder, scanGitHub, buildTree } from '../../lib/scanner'
import { newHires } from '../../lib/selectors'
import { can } from '../../lib/permissions'
import type { TreeNode } from '../../lib/scanner'
import type { RepoScan, StarterTask } from '../../lib/types'
import { Difficulty, Empty, Icon, SourceBadge } from '../../components/ui'

const LANG_COLORS = ['#3f6f2a', '#6a4fd8', '#b25e09', '#2f7de1', '#d43f6a', '#0f9d76', '#8a8678']

export function Scanner() {
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
      {scan && <ScanResult scan={scan} key={scan.id} endorses={can(me, 'scan.recommend')} />}
    </div>
  )
}

function ScanResult({ scan, endorses }: { scan: RepoScan; endorses: boolean }) {
  const { state, me, mutate } = useStore()
  const tree = useMemo(() => buildTree(scan.files), [scan.files])
  const [selPath, setSelPath] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const hires = newHires(state)

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
        source: endorses ? 'senior' : 'ai', recommendedById: endorses ? me.id : undefined,
        assigneeId: endorses ? assignTo || undefined : me.id, status: endorses ? 'open' : 'in_progress',
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
            {endorses && (
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
                        {added ? 'Added' : endorses ? 'Recommend' : 'Pick up'}
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

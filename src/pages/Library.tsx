import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore, uid, now, ago } from '../lib/store'
import { docsFor } from '../lib/selectors'
import { searchDocs } from '../lib/ask'
import { openThread } from '../lib/actions'
import type { Doc, DocKind } from '../lib/types'
import { AskWhy } from '../components/AskWhy'
import { Avatar, Empty, Field, Icon, KindBadge, Modal } from '../components/ui'

const KINDS: { k: DocKind | 'all'; label: string }[] = [
  { k: 'all', label: 'All' }, { k: 'decision', label: 'Decisions' }, { k: 'why', label: 'Captured whys' },
  { k: 'guide', label: 'Guides' }, { k: 'link', label: 'Links' }, { k: 'file', label: 'Files' },
]
const TRACKS = ['Backend', 'Frontend', 'Platform', 'Mobile', 'Data']
const MAX_FILE = 512 * 1024 // keeps localStorage healthy in the POC

export function Library() {
  const { state, me, user } = useStore()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<DocKind | 'all'>('all')
  const [area, setArea] = useState('')
  const creating = params.get('new') === '1'

  const visible = docsFor(state, me)
  const docs = useMemo(() => {
    let list = q.trim() ? searchDocs(q, visible, state.areas).map(h => h.doc) : visible
    if (kind !== 'all') list = list.filter(d => d.kind === kind)
    if (area) list = list.filter(d => d.areaId === area)
    return list
  }, [q, kind, area, visible, state.areas])

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Library</h1><p>Guides, decision records and the captured answers to "why is it like this?"{me.role === 'new' && ` Filtered to ${me.track} and everyone.`}</p></div>
        {me.role === 'senior' && <button className="btn primary" onClick={() => setParams({ new: '1' })}><Icon name="plus" />Add document</button>}
      </div>

      <div className="split">
        <div className="stack">
          <div className="row wrap">
            <div className="grow" style={{ minWidth: 220, position: 'relative' }}>
              <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search titles, questions, tags…" />
            </div>
            <select className="select" style={{ width: 'auto' }} value={area} onChange={e => setArea(e.target.value)}>
              <option value="">All areas</option>
              {state.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="chips">
            {KINDS.map(k => <button key={k.k} className={`chip ${kind === k.k ? 'active' : ''}`} onClick={() => setKind(k.k)}>{k.label}</button>)}
          </div>
          <div className="card">
            <div className="list">
              {docs.length === 0 && <Empty>No documents match.</Empty>}
              {docs.map(d => {
                const a = state.areas.find(a => a.id === d.areaId)
                return (
                  <Link key={d.id} to={`/library/${d.id}`} className="list-item">
                    <span style={{ color: 'var(--muted)', marginTop: 2 }}><Icon name={d.kind === 'link' ? 'link' : d.kind === 'file' ? 'file' : d.kind === 'guide' ? 'book' : 'bookmark'} /></span>
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{d.title}</div>
                      <div className="small muted" style={{ margin: '2px 0 6px' }}>{d.question && d.kind !== 'why' ? d.question : d.summary}</div>
                      <div className="row wrap tiny muted">
                        <KindBadge kind={d.kind} />
                        {a && <span className="badge outline">{a.name}</span>}
                        {d.tracks.map(t => <span key={t} className="badge outline">{t}</span>)}
                        <span>{user(d.authorId)?.name} · {ago(d.createdAt)}</span>
                        {!!d.views && <span>· read {d.views}×</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
        <div className="stack">
          <AskWhy compact />
          <div className="card card-pad small muted stack-sm">
            <h3 style={{ color: 'var(--text)' }}>What goes here</h3>
            <p><strong>Decision records</strong>: the question, what was decided, what else was considered, and the sources.</p>
            <p><strong>Captured whys</strong>: answers seniors gave in Messages, saved so nobody has to ask twice.</p>
            <p><strong>Guides, links, files</strong>: setup docs, process, runbooks.</p>
          </div>
        </div>
      </div>
      {creating && <DocEditor onClose={() => setParams({})} />}
    </div>
  )
}

export function DocEditor({ onClose, existing, defaults }: { onClose: () => void; existing?: Doc; defaults?: Partial<Doc> }) {
  const { state, me, mutate } = useStore()
  const nav = useNavigate()
  const [d, setD] = useState<Doc>(() => existing ? structuredClone(existing) : {
    id: uid('doc'), kind: 'decision', title: '', summary: '', body: '', tags: [], tracks: [], authorId: me.id, createdAt: now(),
    alternatives: [], sources: [], views: 0, ...defaults,
  })
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Doc>(k: K, v: Doc[K]) => setD(x => ({ ...x, [k]: v }))
  const decisionLike = d.kind === 'decision' || d.kind === 'why'

  const onFile = async (f?: File) => {
    if (!f) return
    setErr('')
    const textual = /\.(md|txt|markdown|rst|adoc|json|ya?ml|csv|[jt]sx?|py|go|rs|java|sql|sh)$/i.test(f.name) || f.type.startsWith('text/')
    if (textual && f.size > MAX_FILE) { setErr('That file is over 512 KB. The POC stores files in your browser, so keep them small.'); return }
    const body = textual ? await f.text() : ''
    setD(x => ({
      ...x, kind: 'file', fileName: f.name, title: x.title || f.name.replace(/\.[^.]+$/, ''),
      body: body || `Uploaded ${f.name} (${Math.round(f.size / 1024)} KB). Preview for this file type arrives with the backend.`,
      summary: x.summary || (textual ? body.split('\n').find(l => l.trim() && !l.startsWith('#'))?.slice(0, 140) ?? '' : f.name),
    }))
  }

  const save = () => {
    if (!d.title.trim()) { setErr('Give it a title.'); return }
    mutate(s => {
      const i = s.docs.findIndex(x => x.id === d.id)
      if (i >= 0) s.docs[i] = d; else s.docs.unshift(d)
    })
    onClose()
    if (!existing) nav(`/library/${d.id}`)
  }

  return (
    <Modal title={existing ? 'Edit document' : 'Add to the library'} onClose={onClose}
      footer={<><span className="small" style={{ color: 'var(--danger)', marginRight: 'auto' }}>{err}</span><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{existing ? 'Save' : 'Publish'}</button></>}>
      <div className="chips">
        {(['decision', 'guide', 'link', 'file'] as DocKind[]).concat(d.kind === 'why' ? ['why'] : []).map(k => (
          <button key={k} className={`chip ${d.kind === k ? 'active' : ''}`} onClick={() => set('kind', k)}>
            {{ decision: 'Decision record', guide: 'Guide', link: 'Link', file: 'Upload file', why: 'Captured why' }[k]}
          </button>
        ))}
      </div>

      {d.kind === 'file' && (
        <div className="dropzone" onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]) }}>
          <Icon name="file" size={20} />
          <div style={{ marginTop: 6 }}>{d.fileName ? <strong>{d.fileName}</strong> : 'Drop a file or click to choose'}</div>
          <div className="tiny">Markdown and text files are readable in-app. Others are stored by name.</div>
          <input ref={fileRef} type="file" hidden onChange={e => onFile(e.target.files?.[0])} />
        </div>
      )}

      <Field label="Title"><input className="input" value={d.title} onChange={e => set('title', e.target.value)} placeholder={decisionLike ? 'ADR-016: Why we chose X' : 'Title'} /></Field>
      {decisionLike && (
        <>
          <Field label="The question a new engineer would ask"><input className="input" value={d.question ?? ''} onChange={e => set('question', e.target.value)} placeholder="Why does billing run as its own service?" /></Field>
          <Field label="What we decided"><input className="input" value={d.decision ?? ''} onChange={e => set('decision', e.target.value)} /></Field>
        </>
      )}
      {d.kind === 'link' && <Field label="URL"><input className="input" value={d.url ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://" /></Field>}
      <Field label="One-line summary"><input className="input" value={d.summary} onChange={e => set('summary', e.target.value)} /></Field>
      <Field label={decisionLike ? 'Why: the reasoning, constraints and tradeoffs' : 'Body'}>
        <textarea className="textarea" style={{ minHeight: 120 }} value={d.body} onChange={e => set('body', e.target.value)} />
      </Field>
      {decisionLike && (
        <>
          <Field label="Alternatives considered (one per line)">
            <textarea className="textarea" style={{ minHeight: 60 }} value={(d.alternatives ?? []).join('\n')} onChange={e => set('alternatives', e.target.value.split('\n'))} />
          </Field>
          <Field label="Sources: design docs, tickets, PRs, postmortems (one per line)">
            <textarea className="textarea" style={{ minHeight: 60 }} value={(d.sources ?? []).map(s => s.label).join('\n')} onChange={e => set('sources', e.target.value.split('\n').map(label => ({ label })))} />
          </Field>
        </>
      )}
      <div className="grid g2">
        <Field label="Codebase area">
          <select className="select" value={d.areaId ?? ''} onChange={e => set('areaId', e.target.value || undefined)}>
            <option value="">None</option>
            {state.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Tags (comma separated)"><input className="input" value={d.tags.join(', ')} onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} /></Field>
      </div>
      <div>
        <span className="label">Who should see it (none = everyone)</span>
        <div className="chips">
          {TRACKS.map(t => (
            <button key={t} className={`chip ${d.tracks.includes(t) ? 'active' : ''}`} onClick={() => set('tracks', d.tracks.includes(t) ? d.tracks.filter(x => x !== t) : [...d.tracks, t])}>{t}</button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function DocDetail() {
  const { id } = useParams()
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const [editing, setEditing] = useState(false)
  const doc = state.docs.find(d => d.id === id)

  useEffect(() => {
    if (id && me.role === 'new') mutate(s => { const d = s.docs.find(d => d.id === id); if (d) d.views = (d.views ?? 0) + 1 })
  }, [id, me.role, mutate])

  if (!doc) return <div className="page"><Empty>Document not found. <Link to="/library">Back to library</Link></Empty></div>
  const author = user(doc.authorId)
  const area = state.areas.find(a => a.id === doc.areaId)
  const related = state.docs.filter(d => d.id !== doc.id && d.areaId && d.areaId === doc.areaId).slice(0, 4)
  const canEdit = me.role === 'senior'

  const askAuthor = () => {
    let tid = ''
    mutate(s => { tid = openThread(s, me.id, doc.authorId, `Question about: ${doc.title}`, { kind: 'doc', id: doc.id }) })
    nav(`/messages/${tid}`)
  }

  return (
    <div className="page">
      <Link to="/library" className="small muted">← Library</Link>
      <div className="split" style={{ marginTop: 10 }}>
        <article className="card card-pad stack" style={{ gap: 16 }}>
          <div className="row wrap"><KindBadge kind={doc.kind} />{doc.tags.map(t => <span key={t} className="badge outline">#{t}</span>)}</div>
          <h1>{doc.title}</h1>
          {doc.question && (
            <div className="callout">
              <div className="tiny" style={{ fontWeight: 650, opacity: .8 }}>THE QUESTION</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{doc.question}</div>
            </div>
          )}
          {doc.decision && <div><h3 style={{ marginBottom: 4 }}>Decision</h3><p>{doc.decision}</p></div>}
          <div>
            {(doc.decision || doc.question) && <h3 style={{ marginBottom: 4 }}>Why</h3>}
            {doc.kind === 'file' && doc.fileName && <div className="row small muted" style={{ marginBottom: 8 }}><Icon name="file" />{doc.fileName}</div>}
            <div className={doc.kind === 'file' && /\.(json|ya?ml|[jt]sx?|py|go|sql|sh)$/i.test(doc.fileName ?? '') ? 'snippet' : 'prose'}>{doc.body}</div>
          </div>
          {doc.url && <a className="btn" style={{ alignSelf: 'flex-start' }} href={doc.url} target="_blank" rel="noreferrer"><Icon name="link" />Open link</a>}
          {!!doc.alternatives?.filter(Boolean).length && (
            <div><h3 style={{ marginBottom: 4 }}>Alternatives considered</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{doc.alternatives.filter(Boolean).map(a => <li key={a}>{a}</li>)}</ul></div>
          )}
          {!!doc.sources?.filter(s => s.label).length && (
            <div><h3 style={{ marginBottom: 4 }}>Sources</h3>
              <div className="stack-sm">{doc.sources.filter(s => s.label).map(s => <div key={s.label} className="row small"><Icon name="bookmark" size={13} />{s.url ? <a href={s.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>{s.label}</a> : s.label}</div>)}</div>
            </div>
          )}
          {doc.capturedFromThreadId && <Link className="small muted" style={{ textDecoration: 'underline' }} to={`/messages/${doc.capturedFromThreadId}`}>View the original conversation</Link>}
        </article>

        <aside className="stack">
          <div className="card card-pad stack">
            <div className="row"><Avatar user={author} size={34} /><div><div style={{ fontWeight: 600 }}>{author?.name}</div><div className="tiny muted">{author?.title} · {ago(doc.createdAt)}</div></div></div>
            <div className="tiny muted">Read {doc.views ?? 0} times{doc.tracks.length ? ` · for ${doc.tracks.join(', ')}` : ' · for everyone'}</div>
            {me.id !== doc.authorId && <button className="btn" onClick={askAuthor}><Icon name="chat" />Ask {author?.name.split(' ')[0]} about this</button>}
            {canEdit && (
              <div className="row">
                <button className="btn grow" onClick={() => setEditing(true)}><Icon name="edit" />Edit</button>
                <button className="btn danger" onClick={() => { if (confirm('Delete this document?')) { mutate(s => { s.docs = s.docs.filter(d => d.id !== doc.id) }); nav('/library') } }}><Icon name="trash" /></button>
              </div>
            )}
          </div>
          {area && (
            <Link to={`/codebase?area=${area.id}`} className="card card-pad stack-sm">
              <span className="tiny muted">CODEBASE AREA</span>
              <strong>{area.name}</strong>
              <code className="muted">{area.path}</code>
            </Link>
          )}
          {related.length > 0 && (
            <div className="card"><div className="card-head"><h3>Also in {area?.name}</h3></div>
              <div className="list">{related.map(r => <Link key={r.id} to={`/library/${r.id}`} className="list-item small">{r.title}</Link>)}</div>
            </div>
          )}
        </aside>
      </div>
      {editing && <DocEditor existing={doc} onClose={() => setEditing(false)} />}
    </div>
  )
}

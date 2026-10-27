import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore, ago } from '../../lib/store'
import { openThread } from '../../lib/actions'
import { can } from '../../lib/permissions'
import { Avatar, Empty, Icon, KindBadge } from '../../components/ui'
import { DocEditor } from './DocEditor'

export function DocDetail() {
  const { id } = useParams()
  const { state, me, mutate, user } = useStore()
  const nav = useNavigate()
  const [editing, setEditing] = useState(false)
  const countsRead = can(me, 'doc.countRead')
  const doc = state.docs.find(d => d.id === id)

  useEffect(() => {
    if (id && countsRead) mutate(s => { const d = s.docs.find(d => d.id === id); if (d) d.views = (d.views ?? 0) + 1 })
  }, [id, countsRead, mutate])

  if (!doc) return <div className="page"><Empty>Document not found. <Link to="/library">Back to library</Link></Empty></div>
  const author = user(doc.authorId)
  const area = state.areas.find(a => a.id === doc.areaId)
  const related = state.docs.filter(d => d.id !== doc.id && d.areaId && d.areaId === doc.areaId).slice(0, 4)
  const canEdit = can(me, 'doc.edit')

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

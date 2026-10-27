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
      <Link to="/library" className="text-small text-muted">← Library</Link>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] mt-2.5">
        <article className="card card-pad flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap"><KindBadge kind={doc.kind} />{doc.tags.map(t => <span key={t} className="badge outlined">#{t}</span>)}</div>
          <h1>{doc.title}</h1>
          {doc.question && (
            <div className="callout">
              <div className="text-tiny font-[650] opacity-80">THE QUESTION</div>
              <div className="text-[15px] font-semibold">{doc.question}</div>
            </div>
          )}
          {doc.decision && <div><h3 className="mb-1">Decision</h3><p>{doc.decision}</p></div>}
          <div>
            {(doc.decision || doc.question) && <h3 className="mb-1">Why</h3>}
            {doc.kind === 'file' && doc.fileName && <div className="flex items-center gap-2 text-small text-muted mb-2"><Icon name="file" />{doc.fileName}</div>}
            <div className={doc.kind === 'file' && /\.(json|ya?ml|[jt]sx?|py|go|sql|sh)$/i.test(doc.fileName ?? '') ? 'snippet' : 'prose'}>{doc.body}</div>
          </div>
          {doc.url && <a className="btn self-start" href={doc.url} target="_blank" rel="noreferrer"><Icon name="link" />Open link</a>}
          {!!doc.alternatives?.filter(Boolean).length && (
            <div><h3 className="mb-1">Alternatives considered</h3><ul className="m-0 list-disc pl-[18px]">{doc.alternatives.filter(Boolean).map(a => <li key={a}>{a}</li>)}</ul></div>
          )}
          {!!doc.sources?.filter(s => s.label).length && (
            <div><h3 className="mb-1">Sources</h3>
              <div className="flex flex-col gap-1.5">{doc.sources.filter(s => s.label).map(s => <div key={s.label} className="flex items-center gap-2 text-small"><Icon name="bookmark" size={13} />{s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.label}</a> : s.label}</div>)}</div>
            </div>
          )}
          {doc.capturedFromThreadId && <Link className="text-small text-muted underline" to={`/messages/${doc.capturedFromThreadId}`}>View the original conversation</Link>}
        </article>

        <aside className="flex flex-col gap-3">
          <div className="card card-pad flex flex-col gap-3">
            <div className="flex items-center gap-2"><Avatar user={author} size={34} /><div><div className="font-semibold">{author?.name}</div><div className="text-tiny text-muted">{author?.title} · {ago(doc.createdAt)}</div></div></div>
            <div className="text-tiny text-muted">Read {doc.views ?? 0} times{doc.tracks.length ? ` · for ${doc.tracks.join(', ')}` : ' · for everyone'}</div>
            {me.id !== doc.authorId && <button className="btn" onClick={askAuthor}><Icon name="chat" />Ask {author?.name.split(' ')[0]} about this</button>}
            {canEdit && (
              <div className="flex items-center gap-2">
                <button className="btn min-w-0 flex-1" onClick={() => setEditing(true)}><Icon name="edit" />Edit</button>
                <button className="btn danger" onClick={() => { if (confirm('Delete this document?')) { mutate(s => { s.docs = s.docs.filter(d => d.id !== doc.id) }); nav('/library') } }}><Icon name="trash" /></button>
              </div>
            )}
          </div>
          {area && (
            <Link to={`/codebase?area=${area.id}`} className="card card-pad flex flex-col gap-1.5">
              <span className="text-tiny text-muted">CODEBASE AREA</span>
              <strong>{area.name}</strong>
              <code className="text-muted">{area.path}</code>
            </Link>
          )}
          {related.length > 0 && (
            <div className="card"><div className="card-head"><h3>Also in {area?.name}</h3></div>
              <div className="list">{related.map(r => <Link key={r.id} to={`/library/${r.id}`} className="list-row text-small">{r.title}</Link>)}</div>
            </div>
          )}
        </aside>
      </div>
      {editing && <DocEditor existing={doc} onClose={() => setEditing(false)} />}
    </div>
  )
}

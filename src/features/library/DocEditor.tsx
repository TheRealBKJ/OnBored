import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, uid, now } from '../../lib/store'
import type { Doc, DocKind } from '../../lib/types'
import { Field, Icon, Modal } from '../../components/ui'
import { TRACKS } from '../../lib/tracks'

const MAX_FILE = 512 * 1024 // keeps localStorage healthy in the POC

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
      footer={<><span className="text-small mr-auto text-danger">{err}</span><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{existing ? 'Save' : 'Publish'}</button></>}>
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
          <div className="mt-1.5">{d.fileName ? <strong>{d.fileName}</strong> : 'Drop a file or click to choose'}</div>
          <div className="text-tiny">Markdown and text files are readable in-app. Others are stored by name.</div>
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
        <textarea className="textarea min-h-30" value={d.body} onChange={e => set('body', e.target.value)} />
      </Field>
      {decisionLike && (
        <>
          <Field label="Alternatives considered (one per line)">
            <textarea className="textarea min-h-15" value={(d.alternatives ?? []).join('\n')} onChange={e => set('alternatives', e.target.value.split('\n'))} />
          </Field>
          <Field label="Sources: design docs, tickets, PRs, postmortems (one per line)">
            <textarea className="textarea min-h-15" value={(d.sources ?? []).map(s => s.label).join('\n')} onChange={e => set('sources', e.target.value.split('\n').map(label => ({ label })))} />
          </Field>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
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

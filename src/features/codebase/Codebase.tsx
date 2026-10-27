import { useSearchParams } from 'react-router-dom'
import { AreaMap } from './AreaMap'
import { Scanner } from './Scanner'

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

import type { CodeArea, RepoScan, ScanFile, StarterTask } from './types'
import { now, uid } from './store'

/**
 * Read-only codebase scanner. Runs entirely in the browser: nothing is uploaded.
 * The heuristics stand in for the AI pass; swap `findTasks` for a model call later.
 */

const IGNORE_DIRS = /(^|\/)(node_modules|\.git|dist|build|out|vendor|\.next|coverage|target|__pycache__|\.venv|venv|\.idea|\.vscode)(\/|$)/
const IGNORE_FILES = /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.(js|css)|\.map)$/
const LANGS: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', go: 'Go', rs: 'Rust', java: 'Java', kt: 'Kotlin', rb: 'Ruby', php: 'PHP', cs: 'C#',
  c: 'C', h: 'C', cpp: 'C++', cc: 'C++', hpp: 'C++', swift: 'Swift', scala: 'Scala',
  css: 'CSS', scss: 'CSS', html: 'HTML', vue: 'Vue', svelte: 'Svelte', sql: 'SQL',
  md: 'Markdown', yml: 'YAML', yaml: 'YAML', json: 'JSON', toml: 'TOML', sh: 'Shell',
}
const CODE_LANGS = new Set(['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'Kotlin', 'Ruby', 'PHP', 'C#', 'C', 'C++', 'Swift', 'Scala', 'Vue', 'Svelte'])
const MAX_FILES = 4000
const MAX_READ_BYTES = 200_000

export interface RawFile { path: string; size: number; text?: string }

export function langOf(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return LANGS[ext] ?? 'Other'
}

export function shouldInclude(path: string) {
  return !IGNORE_DIRS.test(path) && !IGNORE_FILES.test(path)
}

const isTestPath = (p: string) => /(^|\/)(tests?|__tests__|spec)(\/|$)|[._-](test|spec)\.[a-z]+$|_test\.go$|^test_.*\.py$|\/test_[^/]*\.py$/i.test(p)

function baseName(p: string) {
  const f = p.split('/').pop() ?? p
  // foo.test.ts, foo_test.go, foo_test.py, foo-test.js, foo_spec.rb and test_foo.py all name foo
  return f.replace(/[._-](test|spec)(?=\.[^.]+$)/i, '').replace(/^test_/i, '').replace(/\.[^.]+$/, '')
}

function task(partial: Omit<StarterTask, 'id' | 'status' | 'createdAt' | 'source'>): StarterTask {
  return { id: uid('t'), status: 'open', createdAt: now(), source: 'ai', ...partial }
}

export function findTasks(files: RawFile[]): StarterTask[] {
  const out: StarterTask[] = []
  const code = files.filter(f => CODE_LANGS.has(langOf(f.path)))
  const testNames = new Set(code.filter(f => isTestPath(f.path)).map(f => baseName(f.path).toLowerCase()))
  const hasTests = testNames.size > 0

  // 1. TODO / FIXME comments: the clearest "someone wanted this done" signal.
  const todoRe = /(?:\/\/|#|\/\*|\*|--)\s*(TODO|FIXME|HACK|XXX)\b[:\s-]*(.*)/
  for (const f of code) {
    if (!f.text) continue
    const lines = f.text.split('\n')
    lines.forEach((line, i) => {
      const m = line.match(todoRe)
      if (!m) return
      const msg = m[2].replace(/\*\/\s*$/, '').trim()
      if (msg.length < 4) return
      const fixme = m[1] !== 'TODO'
      out.push(task({
        title: `${fixme ? 'Fix' : 'Resolve'} ${m[1]}: ${msg.length > 60 ? msg.slice(0, 57) + '...' : msg}`,
        description: `A ${m[1]} comment in ${f.path} asks for this. Read the surrounding code, confirm with the area owner it is still wanted, then do it.`,
        kind: 'todo', file: f.path, line: i + 1, snippet: line.trim().slice(0, 160),
        difficulty: fixme ? 2 : 1, estimate: fixme ? '2-4 hrs' : '1-2 hrs',
        learns: `How ${dirOf(f.path)} is structured and who owns it.`,
      }))
    })
  }

  // 2. Untested source files, when the repo already has a test convention to copy.
  if (hasTests) {
    const untested = code
      .filter(f => !isTestPath(f.path) && f.text && !testNames.has(baseName(f.path).toLowerCase()))
      .filter(f => !/(^|\/)(index|main|types?|config|constants)\.[a-z]+$/i.test(f.path))
      .map(f => ({ f, lines: f.text!.split('\n').length }))
      .filter(x => x.lines >= 20 && x.lines <= 250)
      .sort((a, b) => a.lines - b.lines)
      .slice(0, 6)
    for (const { f, lines } of untested) {
      out.push(task({
        title: `Add tests for ${f.path.split('/').pop()}`,
        description: `${f.path} (${lines} lines) has no matching test file. The repo already has tests, so copy the closest existing one's style.`,
        kind: 'tests', file: f.path, difficulty: lines > 120 ? 2 : 1, estimate: lines > 120 ? 'half day' : '1-2 hrs',
        learns: 'The test setup and what this module is actually responsible for.',
      }))
    }
  }

  // 3. Debug output left in source.
  const debugRe = /^\s*(console\.log\(|print\(|fmt\.Println\(|System\.out\.println\(|debugger;)/
  for (const f of code) {
    if (!f.text || isTestPath(f.path)) continue
    const lines = f.text.split('\n')
    const hits = lines.map((l, i) => (debugRe.test(l) ? i + 1 : 0)).filter(Boolean)
    if (hits.length >= 2 && langOf(f.path) !== 'Python') {
      out.push(task({
        title: `Replace debug output in ${f.path.split('/').pop()}`,
        description: `${hits.length} stray debug prints. Swap them for the project's logger or remove them.`,
        kind: 'cleanup', file: f.path, line: hits[0], snippet: lines[hits[0] - 1].trim().slice(0, 160),
        difficulty: 1, estimate: '30 min', learns: 'How the project logs, and a safe first PR.',
      }))
    }
  }

  // 4. Loose typing in TypeScript.
  for (const f of code) {
    if (!f.text || !/\.tsx?$/.test(f.path) || isTestPath(f.path)) continue
    const count = (f.text.match(/:\s*any\b|as any\b/g) ?? []).length
    if (count >= 3) {
      const idx = f.text.split('\n').findIndex(l => /:\s*any\b|as any\b/.test(l))
      out.push(task({
        title: `Tighten ${count} \`any\` types in ${f.path.split('/').pop()}`,
        description: 'Replace `any` with real types. Good way to learn the data shapes flowing through this file.',
        kind: 'types', file: f.path, line: idx + 1, difficulty: 2, estimate: '1-3 hrs',
        learns: 'The domain types and where data comes from.',
      }))
    }
  }

  // 5. Top-level folders with code but no README.
  const dirs = new Map<string, { code: number; readme: boolean }>()
  for (const f of files) {
    const parts = f.path.split('/')
    if (parts.length < 2) continue
    const top = parts.slice(0, Math.min(2, parts.length - 1)).join('/')
    const e = dirs.get(top) ?? { code: 0, readme: false }
    if (/readme\.md$/i.test(f.path) && f.path.split('/').length === top.split('/').length + 1) e.readme = true
    if (CODE_LANGS.has(langOf(f.path))) e.code++
    dirs.set(top, e)
  }
  const missing = [...dirs.entries()].filter(([, e]) => e.code >= 4 && !e.readme).sort((a, b) => b[1].code - a[1].code).slice(0, 3)
  for (const [dir, e] of missing) {
    out.push(task({
      title: `Write a README for ${dir}/`,
      description: `${e.code} code files and no README. Write what it does and why it exists, then have the owner review it. You learn the area and the next hire gets the doc.`,
      kind: 'docs', file: `${dir}/README.md`, difficulty: 1, estimate: '1-2 hrs',
      learns: `What ${dir} is for, from the person who owns it.`,
    }))
  }

  // Easiest first, and keep the list scannable.
  const order: Record<string, number> = { todo: 0, docs: 1, cleanup: 2, tests: 3, types: 4 }
  return out
    .sort((a, b) => a.difficulty - b.difficulty || (order[a.kind] ?? 9) - (order[b.kind] ?? 9))
    .slice(0, 30)
}

const dirOf = (p: string) => p.split('/').slice(0, -1).join('/') || 'the root'

function toScan(name: string, source: RepoScan['source'], raw: RawFile[]): RepoScan {
  const files: ScanFile[] = raw.map(f => ({
    path: f.path, size: f.size, lang: langOf(f.path), lines: f.text ? f.text.split('\n').length : 0,
  }))
  const readme = raw.find(f => /^readme\.md$/i.test(f.path))?.text
  return { id: uid('scan'), name, source, scannedAt: now(), files, findings: findTasks(raw), readme }
}

/** Scan a folder picked with <input webkitdirectory>. */
export async function scanFolder(list: FileList, onProgress?: (n: number, total: number) => void): Promise<RepoScan> {
  const all = Array.from(list)
  const root = all[0]?.webkitRelativePath.split('/')[0] ?? 'folder'
  const picked = all
    .map(f => ({ f, path: f.webkitRelativePath.split('/').slice(1).join('/') }))
    .filter(x => x.path && shouldInclude(x.path))
    .slice(0, MAX_FILES)
  const raw: RawFile[] = []
  let i = 0
  for (const { f, path } of picked) {
    const lang = langOf(path)
    const readable = lang !== 'Other' && f.size <= MAX_READ_BYTES
    raw.push({ path, size: f.size, text: readable ? await f.text() : undefined })
    if (++i % 50 === 0) onProgress?.(i, picked.length)
  }
  return toScan(root, 'folder', raw)
}

/** Scan a public GitHub repo: full tree, plus contents of up to `maxReads` source files. */
export async function scanGitHub(input: string, onProgress?: (msg: string) => void, maxReads = 60): Promise<RepoScan> {
  const m = input.trim().replace(/\.git$/, '').match(/^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+)/i)
  if (!m) throw new Error('Use the form owner/repo or a github.com URL.')
  const [, owner, repo] = m
  onProgress?.('Fetching repo info...')
  const info = await gh(`https://api.github.com/repos/${owner}/${repo}`)
  const branch = info.default_branch as string
  onProgress?.('Fetching file tree...')
  const tree = await gh(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`)
  const blobs = (tree.tree as { path: string; type: string; size?: number }[])
    .filter(t => t.type === 'blob' && shouldInclude(t.path))
    .slice(0, MAX_FILES)

  // Read the most informative files: READMEs, then small source files spread across folders.
  const readmes = blobs.filter(b => /readme\.md$/i.test(b.path) && b.path.split('/').length <= 2)
  const source = blobs
    .filter(b => CODE_LANGS.has(langOf(b.path)) && (b.size ?? 0) < 60_000)
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length || (a.size ?? 0) - (b.size ?? 0))
  const seenDirs = new Map<string, number>()
  const spread = source.filter(b => {
    const dir = b.path.split('/').slice(0, 2).join('/')
    const n = seenDirs.get(dir) ?? 0
    seenDirs.set(dir, n + 1)
    return n < 6
  })
  const toRead = [...readmes, ...spread].slice(0, maxReads)
  const texts = new Map<string, string>()
  let done = 0
  await Promise.all(toRead.map(async b => {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${b.path}`)
      if (r.ok) texts.set(b.path, await r.text())
    } catch {
      // skip unreadable file
    }
    onProgress?.(`Reading files ${++done}/${toRead.length}`)
  }))
  const raw = blobs.map(b => ({ path: b.path, size: b.size ?? 0, text: texts.get(b.path) }))
  return toScan(`${owner}/${repo}`, 'github', raw)
}

async function gh(url: string) {
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
  if (r.status === 404) throw new Error('Repo not found, or it is private.')
  if (r.status === 403) throw new Error('GitHub rate limit hit (60 requests/hour without a token). Try again later or scan a local folder.')
  if (!r.ok) throw new Error(`GitHub returned ${r.status}`)
  return r.json()
}

export interface TreeNode { name: string; path: string; children: TreeNode[]; files: number; lines: number; size: number }

export function buildTree(files: ScanFile[]): TreeNode {
  const root: TreeNode = { name: '/', path: '', children: [], files: 0, lines: 0, size: 0 }
  for (const f of files) {
    const parts = f.path.split('/')
    let node = root
    node.files++; node.lines += f.lines; node.size += f.size
    for (let i = 0; i < parts.length; i++) {
      const path = parts.slice(0, i + 1).join('/')
      let child = node.children.find(c => c.name === parts[i])
      if (!child) {
        child = { name: parts[i], path, children: [], files: 0, lines: 0, size: 0 }
        node.children.push(child)
      }
      child.files++; child.lines += f.lines; child.size += f.size
      node = child
    }
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => (b.children.length ? 1 : 0) - (a.children.length ? 1 : 0) || a.name.localeCompare(b.name))
    n.children.forEach(sort)
  }
  sort(root)
  return root
}

/** True when `file` is `dir` itself or sits somewhere under it (so `src/lib` does not match `src/library`). */
export function inFolder(file: string, dir: string) {
  const d = dir.replace(/\/+$/, '')
  return file === d || file.startsWith(d + '/')
}

/** The most specific area whose path contains `file`. */
export function areaForPath(areas: CodeArea[], file?: string) {
  if (!file) return undefined
  return areas
    .filter(a => a.path && inFolder(file, a.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.id
}

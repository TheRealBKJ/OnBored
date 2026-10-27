import { describe, expect, it } from 'vitest'
import { buildTree, findTasks, langOf, shouldInclude } from '../scanner'
import type { RawFile } from '../scanner'

const lines = (n: number, extra = '') => Array.from({ length: n }, (_, i) => `const v${i} = ${i}`).join('\n') + extra

describe('file filters', () => {
  it('detects languages and ignores vendored or generated paths', () => {
    expect(langOf('a/b.tsx')).toBe('TypeScript')
    expect(langOf('Makefile')).toBe('Other')
    expect(shouldInclude('src/app.ts')).toBe(true)
    expect(shouldInclude('node_modules/x/index.js')).toBe(false)
    expect(shouldInclude('package-lock.json')).toBe(false)
  })
})

describe('findTasks', () => {
  it('turns TODO and FIXME comments into tasks with file and line', () => {
    const tasks = findTasks([{ path: 'src/a.ts', size: 10, text: 'x\n// TODO: handle empty input\n# FIXME: wrong rounding' }])
    const todo = tasks.find(t => t.kind === 'todo' && t.title.includes('TODO'))!
    expect(todo.line).toBe(2)
    expect(todo.difficulty).toBe(1)
    expect(tasks.find(t => t.title.startsWith('Fix FIXME'))!.difficulty).toBe(2)
  })

  it('suggests tests only when the repo already has a test convention', () => {
    const src: RawFile = { path: 'src/price.ts', size: 1, text: lines(30) }
    expect(findTasks([src]).some(t => t.kind === 'tests')).toBe(false)
    const withTests = findTasks([src, { path: 'src/other.test.ts', size: 1, text: 'test()' }])
    expect(withTests.find(t => t.kind === 'tests')!.title).toBe('Add tests for price.ts')
  })

  it('flags repeated debug output, loose any types and folders without a README', () => {
    const files: RawFile[] = [
      { path: 'svc/log.ts', size: 1, text: 'console.log(1)\nconsole.log(2)' },
      { path: 'svc/any.ts', size: 1, text: 'let a: any\nlet b: any\nconst c = d as any' },
      { path: 'svc/c.ts', size: 1, text: 'x' },
      { path: 'svc/d.ts', size: 1, text: 'x' },
    ]
    const kinds = findTasks(files).map(t => t.kind)
    expect(kinds).toEqual(expect.arrayContaining(['cleanup', 'types', 'docs']))
  })

  it('orders easiest first and caps the list', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ path: `f${i}.ts`, size: 1, text: '// FIXME: thing\n// TODO: other thing' }))
    const tasks = findTasks(many)
    expect(tasks).toHaveLength(30)
    expect(tasks[0].difficulty).toBe(1)
  })
})

describe('buildTree', () => {
  it('rolls up counts and puts folders before files', () => {
    const tree = buildTree([
      { path: 'z.md', size: 1, lang: 'Markdown', lines: 1 },
      { path: 'src/a.ts', size: 2, lang: 'TypeScript', lines: 10 },
      { path: 'src/b.ts', size: 3, lang: 'TypeScript', lines: 5 },
    ])
    expect(tree.files).toBe(3)
    expect(tree.children.map(c => c.name)).toEqual(['src', 'z.md'])
    expect(tree.children[0]).toMatchObject({ files: 2, lines: 15, size: 5 })
  })
})

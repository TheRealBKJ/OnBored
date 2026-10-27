import { describe, expect, it } from 'vitest'
import { can } from '../permissions'

describe('can', () => {
  it('gives seniors authoring powers and new engineers learner powers', () => {
    expect(can({ role: 'senior' }, 'plan.edit')).toBe(true)
    expect(can({ role: 'senior' }, 'plan.checkOff')).toBe(false)
    expect(can({ role: 'new' }, 'plan.checkOff')).toBe(true)
    expect(can({ role: 'new' }, 'doc.create')).toBe(false)
  })

  it('denies everything without a user', () => {
    expect(can(undefined, 'task.pickUp')).toBe(false)
  })
})

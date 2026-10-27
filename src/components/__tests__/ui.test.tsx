import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Avatar, Difficulty, Empty, KindBadge, Modal, Progress, SourceBadge } from '../ui'
import type { User } from '../../lib/types'

const dana: User = { id: 'u', name: 'Dana Okafor', role: 'senior', title: 't', team: 't', track: 'Platform', color: '#000' }

describe('ui primitives', () => {
  it('Avatar shows initials and the full name on hover, and nothing without a user', () => {
    const { container, rerender } = render(<Avatar user={dana} />)
    expect(screen.getByTitle('Dana Okafor')).toHaveTextContent('DO')
    rerender(<Avatar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('Difficulty lights one dot per level and labels it', () => {
    const { container } = render(<Difficulty level={2} />)
    expect(screen.getByTitle('Medium')).toBeInTheDocument()
    expect(container.querySelectorAll('i.on')).toHaveLength(2)
  })

  it('Progress renders the ratio as a rounded percent width', () => {
    const { container } = render(<Progress value={0.456} />)
    expect(container.querySelector('.progress > div')).toHaveStyle({ width: '46%' })
  })

  it('badges label where a task or doc came from', () => {
    render(<><SourceBadge task={{ source: 'ai' }} /><SourceBadge task={{ source: 'senior' }} /><KindBadge kind="why" /></>)
    expect(screen.getByText('Found by scan')).toBeInTheDocument()
    expect(screen.getByText('Senior pick')).toBeInTheDocument()
    expect(screen.getByText('Captured why')).toBeInTheDocument()
  })

  it('Empty renders its message', () => {
    render(<Empty>Nothing here</Empty>)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('Modal closes on Escape, the close button and a backdrop click, but not a click inside', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal title="Hello" onClose={onClose} footer={<button>Ok</button>}>body</Modal>)
    expect(screen.getByRole('dialog', { name: 'Hello' })).toHaveTextContent('body')
    await user.click(screen.getByText('body'))
    expect(onClose).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(document.querySelector('.overlay')!)
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})

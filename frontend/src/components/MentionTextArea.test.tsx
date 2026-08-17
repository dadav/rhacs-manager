import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import {
  MentionTextArea,
  applyTextEdit,
  contentToApi,
  apiToContent,
  contentIsEmpty,
  segmentsToText,
  renderContent,
  type ComposerSegment,
} from './MentionTextArea'

// useUserSearch is called by the composer for the suggestion dropdown.
vi.mock('../api/auth', () => ({
  useUserSearch: (query: string, enabled: boolean) => ({
    data:
      enabled && ['alice', 'alice example'].some(value => value.startsWith(query.toLowerCase()))
        ? [{ id: 'u-alice', username: 'alice', full_name: 'Alice Example', display_name: 'Alice Example' }]
        : [],
  }),
}))

const mention = (): ComposerSegment => ({
  type: 'mention',
  user_id: 'u-alice',
  username: 'alice',
  display: 'Alice Example',
})

describe('segment editing', () => {
  it('preserves a mention on an unrelated trailing edit', () => {
    const segs: ComposerSegment[] = [mention(), { type: 'text', text: ' hi' }]
    const next = applyTextEdit(segs, `${segmentsToText(segs)}!`)
    expect(next.filter(s => s.type === 'mention')).toHaveLength(1)
    expect(next[next.length - 1]).toEqual({ type: 'text', text: ' hi!' })
  })

  it('demotes a mention to text when edited inside', () => {
    const segs: ComposerSegment[] = [mention()]
    // "@Alice Example" -> delete a char inside the display: no mention survives.
    const next = applyTextEdit(segs, '@Alic Example')
    expect(next.some(s => s.type === 'mention')).toBe(false)
    expect(segmentsToText(next)).toBe('@Alic Example')
  })

  it('round-trips through the API wire form', () => {
    const segs: ComposerSegment[] = [{ type: 'text', text: 'hi ' }, mention()]
    const wire = contentToApi(segs)
    expect(wire).toEqual([
      { type: 'text', text: 'hi ' },
      { type: 'mention', user_id: 'u-alice', username: 'alice' },
    ])
    const back = apiToContent([
      { type: 'text', text: 'hi ' },
      { type: 'mention', user_id: 'u-alice', username: 'alice', display_name: 'Alice Example' },
    ])
    expect(segmentsToText(back)).toBe('hi @Alice Example')
  })

  it('treats whitespace-only content as empty', () => {
    expect(contentIsEmpty([{ type: 'text', text: '   ' }])).toBe(true)
    expect(contentIsEmpty([mention()])).toBe(false)
  })
})

describe('renderContent', () => {
  it('renders structured mentions as @Full Name', () => {
    render(
      <div data-testid="out">
        {renderContent(
          [
            { type: 'text', text: 'ping ' },
            { type: 'mention', user_id: 'u-alice', username: 'alice', display_name: 'Alice Example' },
          ],
          'ignored',
        )}
      </div>,
    )
    expect(screen.getByTestId('out').textContent).toBe('ping @Alice Example')
  })

  it('falls back to legacy @[username] rendering when content is null', () => {
    render(<div data-testid="out">{renderContent(null, 'hi @[alice]')}</div>)
    expect(screen.getByTestId('out').textContent).toBe('hi @alice')
  })
})

function Harness() {
  const [segs, setSegs] = useState<ComposerSegment[]>([])
  return (
    <div>
      <MentionTextArea value={segs} onChange={setSegs} />
      <output data-testid="wire">{JSON.stringify(contentToApi(segs))}</output>
    </div>
  )
}

describe('MentionTextArea picker', () => {
  it('shows full name primary + @username secondary and inserts a mention on select', async () => {
    render(<Harness />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: '@ali' } })

    // Primary label = full name, secondary = @username.
    expect(await screen.findByText('Alice Example')).toBeTruthy()
    expect(screen.getByText('@alice')).toBeTruthy()

    // Keyboard-accessible selection.
    fireEvent.keyDown(textarea, { key: 'ArrowDown' })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    const wire = JSON.parse(screen.getByTestId('wire').textContent || '[]')
    expect(wire.some((s: { type: string; user_id?: string }) => s.type === 'mention' && s.user_id === 'u-alice')).toBe(
      true,
    )
  })

  it('keeps the picker open while searching a full name with spaces', async () => {
    render(<Harness />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: '@Alice E' } })

    expect(await screen.findByText('Alice Example')).toBeTruthy()
  })
})

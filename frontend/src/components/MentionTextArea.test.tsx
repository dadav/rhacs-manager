import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

const USERS = [
  { id: 'u-alice', username: 'alice', full_name: 'Alice Example', display_name: 'Alice Example' },
  { id: 'u-albert', username: 'albert', full_name: 'Albert Other', display_name: 'Albert Other' },
]

// useUserSearch is called by the composer for the mention picker.
vi.mock('../api/auth', () => ({
  useUserSearch: (query: string, enabled: boolean) => ({
    isLoading: false,
    data: enabled
      ? USERS.filter(u =>
          [u.username, u.display_name.toLowerCase()].some(value => value.startsWith(query.toLowerCase())),
        )
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

function wire(): { type: string; user_id?: string }[] {
  return JSON.parse(screen.getByTestId('wire').textContent || '[]')
}

async function openPicker(text = '@') {
  render(<Harness />)
  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
  fireEvent.change(textarea, { target: { value: text } })
  const dialog = await screen.findByRole('dialog')
  const search = within(dialog).getByRole('combobox') as HTMLInputElement
  await waitFor(() => expect(document.activeElement).toBe(search))
  return { textarea, dialog, search }
}

function selectedName(): string | null {
  const selected = screen.getAllByRole('option').find(o => o.getAttribute('aria-selected') === 'true')
  return selected?.querySelector('span')?.textContent ?? null
}

describe('MentionTextArea picker', () => {
  it('opens a focused search dialog on @ and inserts the picked user on Enter', async () => {
    const { search } = await openPicker()

    fireEvent.change(search, { target: { value: 'ali' } })

    // Primary label = full name, secondary = @username.
    expect(await screen.findByText('Alice Example')).toBeTruthy()
    expect(screen.getByText('@alice')).toBeTruthy()

    fireEvent.keyDown(search, { key: 'Enter' })

    expect(wire().some(s => s.type === 'mention' && s.user_id === 'u-alice')).toBe(true)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('@Alice Example ')
  })

  it('moves the selection with Tab / Shift+Tab and keeps focus in the search field', async () => {
    const { search } = await openPicker('hi @')
    fireEvent.change(search, { target: { value: 'al' } })
    await screen.findByText('Albert Other')

    expect(selectedName()).toBe('Alice Example')
    fireEvent.keyDown(search, { key: 'Tab' })
    expect(selectedName()).toBe('Albert Other')
    expect(document.activeElement).toBe(search)
    fireEvent.keyDown(search, { key: 'Tab' })
    expect(selectedName()).toBe('Albert Other')
    fireEvent.keyDown(search, { key: 'Tab', shiftKey: true })
    expect(selectedName()).toBe('Alice Example')
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(wire()).toEqual([
      { type: 'text', text: 'hi ' },
      { type: 'mention', user_id: 'u-albert', username: 'albert' },
      { type: 'text', text: ' ' },
    ])
  })

  it('cancels on Escape, keeping the typed @ and refocusing the textarea', async () => {
    const { textarea, search } = await openPicker()

    fireEvent.keyDown(search, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(textarea.value).toBe('@')
    expect(wire().some(s => s.type === 'mention')).toBe(false)
    await waitFor(() => expect(document.activeElement).toBe(textarea))
  })

  it('does not open the picker for an @ inside a word', async () => {
    render(<Harness />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'mail foo@' } })
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('finds users by full name with spaces', async () => {
    const { search } = await openPicker()
    fireEvent.change(search, { target: { value: 'Alice E' } })
    expect(await screen.findByText('Alice Example')).toBeTruthy()
  })

  it('keeps a fixed list size regardless of the result count', async () => {
    const { search } = await openPicker()
    const list = screen.getByTestId('mention-picker-list')
    expect(list).toHaveStyle({ height: '320px' })
    expect(screen.getAllByRole('option')).toHaveLength(2)

    fireEvent.change(search, { target: { value: 'nobody' } })
    expect(await screen.findByText('mentionPicker.noResults')).toBeTruthy()
    expect(screen.getByTestId('mention-picker-list')).toHaveStyle({ height: '320px' })
  })
})

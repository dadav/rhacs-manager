import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CveAliasEditor } from './CveAliasEditor'
import { CveAliasBadges } from './common/CveAliasBadges'
import { extractApiError } from '../utils/errors'

const put = vi.fn()
vi.mock('../api/client', () => ({ api: { put: (...args: unknown[]) => put(...args) } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

function editor(aliases = ['Heartbleed']) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(qc, 'invalidateQueries')
  render(<QueryClientProvider client={qc}><CveAliasEditor cveId="CVE-2014-0160" aliases={aliases} /></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'cveAliases.edit' }))
  return { invalidate }
}

beforeEach(() => { put.mockReset() })

describe('CVE alias editing', () => {
  it('saves names and refreshes every affected view', async () => {
    put.mockResolvedValue({ cve_id: 'CVE-2014-0160', aliases: ['Heartbleed', 'TLS bug'] })
    const { invalidate } = editor()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Heartbleed \n\n TLS bug ' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(put).toHaveBeenCalledWith('/cves/CVE-2014-0160/aliases', { aliases: ['Heartbleed', 'TLS bug'] })
    for (const key of ['cves', 'dashboard', 'images', 'priorities', 'escalations', 'risk-acceptances', 'remediations', 'suppression-rules', 'my-comments', 'audit-log']) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] })
    }
  })

  it('clears all aliases with an empty list', async () => {
    put.mockResolvedValue({ aliases: [] })
    editor()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '\n  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/cves/CVE-2014-0160/aliases', { aliases: [] }))
  })

  it('discards cancelled edits and restores saved names when reopened', () => {
    editor()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'discard me' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
    expect(put).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'cveAliases.edit' }))
    expect(screen.getByRole('textbox')).toHaveValue('Heartbleed')
  })

  it('preserves input and displays API errors for retry', async () => {
    put.mockRejectedValue(new Error('Saving failed'))
    editor()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(await screen.findByText('Saving failed')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Keep this')
    expect(screen.getByRole('button', { name: 'common.save' })).toBeEnabled()
  })

  it('shows localized API validation errors cleanly and saves after correction', async () => {
    const detail = 'A CVE can have at most 10 aliases.'
    const response = new Response(JSON.stringify({ detail }), { status: 422, headers: { 'Content-Type': 'application/json' } })
    put.mockRejectedValueOnce(new Error(await extractApiError(response)))
    put.mockResolvedValueOnce({ cve_id: 'CVE-2014-0160', aliases: ['Heartbleed'] })
    const { invalidate } = editor()
    const tooMany = Array.from({ length: 11 }, (_, i) => `name ${i}`).join('\n')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: tooMany } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(await screen.findByText(detail)).toBeInTheDocument()
    expect(screen.queryByText(/Value error/)).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue(tooMany)
    expect(invalidate).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Heartbleed' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(put).toHaveBeenLastCalledWith('/cves/CVE-2014-0160/aliases', { aliases: ['Heartbleed'] })
    expect(put).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cves'] })
  })

  it('prevents duplicate saves while a request is pending', async () => {
    let finish!: (value: unknown) => void
    put.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    editor()
    const save = screen.getByRole('button', { name: 'common.save' })
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByRole('textbox')).toBeDisabled())
    expect(save).toBeDisabled()
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled()
    await act(async () => finish({ aliases: ['Heartbleed'] }))
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('rejects overlong names before submitting', () => {
    editor()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x'.repeat(81) } })
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled()
    expect(screen.getByText('cveAliases.tooLong')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })
})

it('renders alias badges as plain text and renders nothing for an empty list', () => {
  const { container, rerender } = render(<CveAliasBadges aliases={['Heartbleed', '<img src=x onerror=alert(1)>']} />)
  expect(screen.getByText('Heartbleed')).toBeInTheDocument()
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  expect(container.querySelector('img')).toBeNull()
  rerender(<CveAliasBadges aliases={[]} />)
  expect(container).toBeEmptyDOMElement()
})

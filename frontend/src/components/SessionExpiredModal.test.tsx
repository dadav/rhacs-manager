import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Modal, ModalBody } from '@patternfly/react-core'
import i18n from '../i18n'
import { markSessionExpired, resetSessionExpiredForTests } from '../utils/sessionExpiry'
import { SessionExpiredModal } from './SessionExpiredModal'

describe('SessionExpiredModal', () => {
  beforeEach(async () => {
    resetSessionExpiredForTests()
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    cleanup()
    resetSessionExpiredForTests()
    window.history.replaceState(null, '', '/')
  })

  it('is hidden before the session expires', () => {
    render(<SessionExpiredModal />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Log in again' })).not.toBeInTheDocument()
  })

  it.each([
    ['de', 'Sitzung abgelaufen', 'Neu anmelden'],
    ['en', 'Session expired', 'Log in again'],
  ])('shows the %s dialog after the session expires', async (language, title, relogin) => {
    await i18n.changeLanguage(language)
    render(<SessionExpiredModal />)

    act(markSessionExpired)

    expect(await screen.findByRole('dialog', { name: title })).toBeVisible()
    expect(screen.getByRole('link', { name: relogin })).toBeVisible()
  })

  it('links to a full-page login preserving the path, query, and fragment', async () => {
    window.history.replaceState(null, '', '/cves/CVE-2026-1234?cluster=cluster-a&ns=payments#comments')
    render(<SessionExpiredModal />)

    act(markSessionExpired)

    const link = await screen.findByRole('link', { name: 'Log in again' })
    expect(link).toHaveAttribute('href', '/oauth/start?rd=%2Fcves%2FCVE-2026-1234%3Fcluster%3Dcluster-a%26ns%3Dpayments%23comments')
  })

  it('stays open without a close button after Escape, backdrop clicks, and repeated expiry', async () => {
    render(<SessionExpiredModal />)
    act(markSessionExpired)
    const dialog = await screen.findByRole('dialog', { name: 'Session expired' })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'Escape' })
    const backdrop = dialog.closest('.pf-v6-c-backdrop')
    if (!backdrop) throw new Error('Modal backdrop not found')
    fireEvent.click(backdrop)
    act(markSessionExpired)

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(dialog).toBeVisible()
  })

  it('does not let Escape close an underlying edit modal', async () => {
    const closeEditor = vi.fn()
    render(
      <>
        <Modal isOpen onClose={closeEditor} aria-label="Edit notes">
          <ModalBody><textarea aria-label="Notes" defaultValue="Unsaved text" /></ModalBody>
        </Modal>
        <SessionExpiredModal />
      </>,
    )
    act(markSessionExpired)
    const dialog = await screen.findByRole('dialog', { name: 'Session expired' })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(closeEditor).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Notes')).toHaveValue('Unsaved text')
  })
})

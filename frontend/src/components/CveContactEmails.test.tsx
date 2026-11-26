import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import i18n from '../i18n'
import type { ContactLocation } from '../types'
import { CveContactEmails } from './CveContactEmails'

function pairs(count: number, cluster = 'cluster-a'): ContactLocation[] {
  return Array.from({ length: count }, (_, index) => ({
    cluster_name: cluster,
    namespace: `ns-${String(index + 1).padStart(2, '0')}`,
  }))
}

async function hoverTooltip(email: string): Promise<HTMLElement> {
  fireEvent.mouseEnter(screen.getByRole('link', { name: email }))
  // findByRole retries past the 300 ms entry delay and finds the portal in document.body.
  return screen.findByRole('tooltip')
}

async function expectNoTooltipAfterDelay() {
  await new Promise(resolve => setTimeout(resolve, 400))
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

describe('CveContactEmails', () => {
  it('renders the placeholder without emails', () => {
    render(<CveContactEmails emails={[]} locations={{}} />)
    expect(screen.getByText('–')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it.each([
    ['missing mapping (older backend)', undefined],
    ['empty mapping', {}],
    ['empty list for the email', { 'team@example.com': [] }],
  ])('renders a plain mailto link for %s', async (_label, locations) => {
    render(<CveContactEmails emails={['team@example.com']} locations={locations} />)
    const link = screen.getByRole('link', { name: 'team@example.com' })
    expect(link).toHaveAttribute('href', 'mailto:team@example.com')

    fireEvent.mouseEnter(link)
    fireEvent.focus(link)
    await expectNoTooltipAfterDelay()
    expect(link).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the pairs of the hovered email only, with a heading and no interactive items', async () => {
    render(
      <CveContactEmails
        emails={['alpha@example.com', 'team@example.com']}
        locations={{
          'alpha@example.com': [{ cluster_name: 'cluster-a', namespace: 'frontend' }],
          'team@example.com': [
            { cluster_name: 'cluster-a', namespace: 'payments' },
            { cluster_name: 'cluster-b', namespace: 'payments' },
          ],
        }}
      />,
    )
    const link = screen.getByRole('link', { name: 'team@example.com' })
    expect(link).toHaveAttribute('href', 'mailto:team@example.com')

    const tooltip = await hoverTooltip('team@example.com')

    expect(link).toHaveAttribute('aria-describedby', tooltip.id)
    expect(tooltip).toHaveTextContent('Cluster / Namespace')
    expect(within(tooltip).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'cluster-a / payments',
      'cluster-b / payments',
    ])
    expect(tooltip).not.toHaveTextContent('frontend')
    expect(within(tooltip).queryAllByRole('button')).toHaveLength(0)
    expect(within(tooltip).queryAllByRole('link')).toHaveLength(0)
  })

  it('opens on keyboard focus and closes on Escape', async () => {
    render(<CveContactEmails emails={['team@example.com']} locations={{ 'team@example.com': pairs(1) }} />)
    const link = screen.getByRole('link', { name: 'team@example.com' })

    fireEvent.focus(link)
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('cluster-a / ns-01')

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
  })

  it('lists up to 10 pairs without a remaining count or dialog button', async () => {
    render(<CveContactEmails emails={['team@example.com']} locations={{ 'team@example.com': pairs(10) }} />)

    const tooltip = await hoverTooltip('team@example.com')

    expect(within(tooltip).getAllByRole('listitem')).toHaveLength(10)
    expect(tooltip).not.toHaveTextContent('more pair')
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument()
  })

  it('previews the first 10 of 11 pairs with the remaining count', async () => {
    render(<CveContactEmails emails={['team@example.com']} locations={{ 'team@example.com': pairs(11) }} />)

    const tooltip = await hoverTooltip('team@example.com')

    const items = within(tooltip).getAllByRole('listitem').map(item => item.textContent)
    expect(items).toHaveLength(10)
    expect(items.at(-1)).toBe('cluster-a / ns-10')
    expect(tooltip).not.toHaveTextContent('ns-11')
    expect(tooltip).toHaveTextContent('and 1 more pair')
  })

  it('shows the plural remaining count in German', async () => {
    await i18n.changeLanguage('de')
    render(<CveContactEmails emails={['team@example.com']} locations={{ 'team@example.com': pairs(13) }} />)

    const tooltip = await hoverTooltip('team@example.com')

    expect(tooltip).toHaveTextContent('und 3 weitere Paare')
    expect(screen.getByRole('button', { name: 'Alle Cluster-/Namespace-Paare für team@example.com anzeigen' })).toBeInTheDocument()
  })

  it('opens a labeled dialog with every pair and restores focus on Escape', async () => {
    render(<CveContactEmails emails={['team@example.com']} locations={{ 'team@example.com': pairs(11) }} />)
    const showAll = screen.getByRole('button', { name: 'Show all cluster/namespace pairs for team@example.com' })
    expect(showAll).toHaveTextContent('Show all pairs')

    showAll.focus()
    fireEvent.click(showAll)

    const dialog = await screen.findByRole('dialog', { name: 'Responsible clusters and namespaces' })
    expect(dialog).toHaveTextContent('team@example.com')
    const body = within(dialog).getByRole('region', { name: 'Responsible clusters and namespaces' })
    expect(body).toHaveAttribute('tabindex', '0')
    expect(within(body).getAllByRole('listitem').map(item => item.textContent)).toEqual(
      pairs(11).map(pair => `${pair.cluster_name} / ${pair.namespace}`),
    )

    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(showAll).toHaveFocus()
  })

  it('closes the dialog from the footer button and restores focus', async () => {
    render(<CveContactEmails emails={['team@example.com']} locations={{ 'team@example.com': pairs(12) }} />)
    const showAll = screen.getByRole('button', { name: /Show all/ })
    fireEvent.click(showAll)
    const dialog = await screen.findByRole('dialog')

    const closeButtons = within(dialog).getAllByRole('button', { name: 'Close' })
    fireEvent.click(closeButtons.at(-1)!)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(showAll).toHaveFocus()
  })

  it('renders the dialog from current props after a scope change', async () => {
    const { rerender } = render(
      <CveContactEmails emails={['team@example.com']} locations={{ 'team@example.com': pairs(11, 'cluster-a') }} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Show all/ }))
    await screen.findByRole('dialog')

    rerender(<CveContactEmails emails={['team@example.com']} locations={{ 'team@example.com': pairs(12, 'cluster-b') }} />)

    const items = within(screen.getByRole('dialog')).getAllByRole('listitem').map(item => item.textContent)
    expect(items).toHaveLength(12)
    expect(items.every(item => item?.startsWith('cluster-b / '))).toBe(true)
  })
})

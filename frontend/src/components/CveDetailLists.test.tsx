import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import i18n from '../i18n'
import { CveFixGuidance } from './CveFixGuidance'
import { CveEscalationStatus } from './CveEscalationStatus'
import { CveAffectedDeployments } from './CveAffectedDeployments'
import type { AffectedDeployment, ComponentPlacement, EscalationLocation } from '../types'

const placements: ComponentPlacement[] = Array.from({ length: 45 }, (_, index) => ({
  image_id: `image-${index}`, image_name: `registry/image-${index}:latest`, component_name: `package-${index}`,
  component_version: `installed-${index}`, fixed_by: `fixed-${index}`, fixable: true, source: 'java',
  location: `path-${index}/library.jar`, embedded_in: `artifact-${index}.jar`, cves_at_location: 8,
}))
const locations: EscalationLocation[] = placements.map((_, index) => ({
  cluster_name: `cluster-${index}`, namespace: `team-${index}`, level: 1,
  triggered_at: null, next_level: 2, next_level_at: '2026-12-01T12:00:00Z', stopped_reason: null,
}))
const deployments: AffectedDeployment[] = placements.map((placement, index) => ({
  deployment_id: `deployment-${index}`, deployment_name: `app-${index}`, namespace: `team-${index}`,
  cluster_name: `cluster-${index}`, image_id: placement.image_id, image_name: placement.image_name,
  first_seen: '2026-01-01T12:00:00Z',
}))

function renderLists() {
  return render(
    <MemoryRouter initialEntries={['/?cluster=eu&ns=team&ignore_thresholds=1']}>
      <CveFixGuidance placements={placements} components={[]} />
      <CveEscalationStatus locations={locations} />
      <CveAffectedDeployments deployments={deployments} />
    </MemoryRouter>,
  )
}

function table(label: string) { return screen.getByRole('grid', { name: label }) }
function rows(label: string) { return within(table(label)).getAllByRole('row').slice(1) }
function topPager(label: string) { return screen.getByLabelText(`${label} pagination, above the list`).closest<HTMLElement>('.pf-v6-c-pagination')! }
function nextPage(label: string) {
  fireEvent.click(within(topPager(label)).getByRole('button', { name: 'Go to next page' }))
}
function search(label: string, value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: `Search ${label}` }), { target: { value } })
}

beforeEach(async () => { await i18n.changeLanguage('en') })

describe('CVE detail lists', () => {
  it('paginates independently, searches the whole list, and preserves image links', () => {
    renderLists()
    for (const label of ['Where to fix', 'Escalation by location', 'Affected Deployments']) {
      expect(rows(label)).toHaveLength(20)
    }
    nextPage('Where to fix')
    expect(within(table('Where to fix')).queryByText('package-0')).not.toBeInTheDocument()
    expect(within(table('Where to fix')).getByText('package-20')).toBeInTheDocument()
    expect(within(table('Affected Deployments')).getByText('app-0')).toBeInTheDocument()
    search('Escalation by location', ' CLUSTER-44/TEAM-44 ')
    expect(rows('Escalation by location')).toHaveLength(1)
    expect(screen.getByText('cluster-44/team-44')).toBeInTheDocument()
    search('Where to fix', ' IMAGE-44: ')
    expect(rows('Where to fix')).toHaveLength(1)
    expect(within(table('Where to fix')).getByRole('link')).toHaveAttribute('href', '/images/image-44?cluster=eu&ns=team&ignore_thresholds=1')
    expect(rows('Affected Deployments')).toHaveLength(20)
    expect(screen.getAllByRole('status').map(element => element.textContent)).toEqual(['1 of 45 entries', '1 of 45 entries', '45 of 45 entries'])
  })

  it('changes page size from a later page, synchronizes both pagers and resets to page one', () => {
    renderLists()
    nextPage('Where to fix')
    const top = topPager('Where to fix')
    fireEvent.click(within(top).getByRole('button', { name: 'Rows per page for Where to fix' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '50 per page' }))
    expect(rows('Where to fix')).toHaveLength(45)
    expect(screen.queryByLabelText('Where to fix pagination, below the list')).not.toBeInTheDocument()
    fireEvent.click(within(top).getByRole('button', { name: 'Rows per page for Where to fix' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '10 per page' }))
    expect(rows('Where to fix')).toHaveLength(10)
    const bottom = screen.getByLabelText('Where to fix pagination, below the list')
    fireEvent.click(within(bottom).getByRole('button', { name: 'Go to next page' }))
    expect(within(table('Where to fix')).getByText('package-10')).toBeInTheDocument()
    expect(within(top).getByRole('button', { name: 'Go to previous page' })).toBeEnabled()
    expect(rows('Affected Deployments')).toHaveLength(20)
  })

  it('keeps a recoverable empty state and resets the page when clearing a search', () => {
    renderLists()
    nextPage('Where to fix')
    search('Where to fix', 'no-such-image')
    expect(screen.getByRole('textbox', { name: 'Search Where to fix' })).toHaveValue('no-such-image')
    expect(within(table('Where to fix')).getByText(/No matching entries/)).toBeInTheDocument()
    fireEvent.click(within(table('Where to fix')).getByRole('button', { name: 'Clear search' }))
    expect(rows('Where to fix')).toHaveLength(20)
    expect(within(table('Where to fix')).getByText('package-0')).toBeInTheDocument()
    search('Where to fix', '   ')
    expect(rows('Where to fix')).toHaveLength(20)
  })

  it.each(['package-44', 'installed-44', 'fixed-44', 'path-44', 'artifact-44'])('finds placement field %s beyond the first page', value => {
    render(<MemoryRouter><CveFixGuidance placements={placements} components={[]} /></MemoryRouter>)
    search('Where to fix', value)
    expect(rows('Where to fix')).toHaveLength(1)
    expect(screen.getByText('package-44')).toBeInTheDocument()
  })

  it.each(['app-44', 'team-44', 'cluster-44', 'image-44:'])('retains deployment search by %s', value => {
    render(<MemoryRouter><CveAffectedDeployments deployments={deployments} /></MemoryRouter>)
    search('Affected Deployments', value)
    expect(rows('Affected Deployments')).toHaveLength(1)
    expect(screen.getByText('app-44')).toBeInTheDocument()
  })

  it('clamps a disappearing page on refetch without restoring it when the data grows', () => {
    const renderLocations = (items: EscalationLocation[]) => <CveEscalationStatus locations={items} />
    const { rerender } = render(renderLocations(locations))
    nextPage('Escalation by location')
    nextPage('Escalation by location')
    expect(rows('Escalation by location')).toHaveLength(5)
    rerender(renderLocations(locations.slice(0, 21)))
    expect(rows('Escalation by location')).toHaveLength(1)
    expect(screen.getByText('cluster-20/team-20')).toBeInTheDocument()
    rerender(renderLocations(locations))
    expect(screen.getByText('cluster-20/team-20')).toBeInTheDocument()
    expect(rows('Escalation by location')).toHaveLength(20)
  })

  it('searches and paginates fallback components including translated origins', () => {
    const components = placements.map((placement, index) => ({ ...placement, origin: index === 44 ? 'red_hat' as const : 'debian' as const }))
    // The API fallback has no image or placement fields.
    const fallback = components.map(({ component_name, component_version, fixable, fixed_by, origin }) => ({ component_name, component_version, fixable, fixed_by, origin }))
    render(<MemoryRouter><CveFixGuidance placements={[]} components={fallback} /></MemoryRouter>)
    expect(rows('Where to fix')).toHaveLength(20)
    search('Where to fix', 'red hat')
    expect(rows('Where to fix')).toHaveLength(1)
    expect(screen.getByText('package-44')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders image and labeled component details together, with only the path and guidance on the right', () => {
    render(<MemoryRouter><CveFixGuidance placements={placements.slice(0, 1)} components={[]} /></MemoryRouter>)
    expect(within(table('Where to fix')).getAllByRole('columnheader')).toHaveLength(2)
    const cells = within(rows('Where to fix')[0]).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('registry/image-0:latest')
    expect(cells[0]).toHaveTextContent('package-0')
    expect(cells[0]).toHaveTextContent('installed-0')
    expect(cells[0]).toHaveTextContent('fixed-0')
    expect(cells[1]).toHaveTextContent('path-0/library.jar')
    expect(cells[1]).toHaveTextContent('artifact-0.jar')
    expect(cells[1]).toHaveTextContent('8 CVEs in this file')
  })

  it('localizes searches, counts and page-size controls in German', async () => {
    await i18n.changeLanguage('de')
    render(<MemoryRouter><CveFixGuidance placements={placements} components={[]} /></MemoryRouter>)
    const title = i18n.t('fixGuidance.title')
    expect(screen.getByRole('textbox', { name: `${title} durchsuchen` })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('45 von 45 Einträgen')
    const pager = screen.getByLabelText(`Seitennavigation für ${title}, oberhalb der Liste`).closest<HTMLElement>('.pf-v6-c-pagination')!
    expect(within(pager).getByRole('button', { name: 'Zur nächsten Seite' })).toBeInTheDocument()
    fireEvent.click(within(pager).getByRole('button', { name: `Zeilen pro Seite für ${title}` }))
    expect(screen.getByRole('menuitem', { name: '20 pro Seite' })).toBeInTheDocument()
    expect(screen.queryByText('per page')).not.toBeInTheDocument()
  })
})

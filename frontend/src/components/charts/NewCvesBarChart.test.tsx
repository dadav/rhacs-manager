import { cloneElement, type ReactElement, type ComponentProps } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NewCvesBarChart } from './NewCvesBarChart'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { date?: string }) => values?.date ? `${key} ${values.date}` : key,
    i18n: { language: 'en' },
  }),
}))

vi.mock('recharts', async importOriginal => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width: number; height: number }> }) =>
      cloneElement(children, { width: 600, height: 220 }),
    Tooltip: (props: ComponentProps<typeof actual.Tooltip>) => <actual.Tooltip {...props} defaultIndex={0} />,
  }
})

afterEach(cleanup)

describe('NewCvesBarChart', () => {
  it('shows a translated empty state for zero-filled weeks', () => {
    render(<NewCvesBarChart data={[{ date: '2026-11-09', critical: 0, important: 0, moderate: 0, low: 0 }]} />)
    expect(screen.getByRole('img', { name: 'dashboard.trend' })).toHaveTextContent('dashboard.trendEmpty')
  })

  it('renders weekly bars, severity legend and a tooltip with the total', async () => {
    const { container } = render(<NewCvesBarChart data={[
      { date: '2026-11-02', critical: 2, important: 3, moderate: 4, low: 5 },
      { date: '2026-11-09', critical: 0, important: 0, moderate: 0, low: 0 },
    ]} />)
    expect(screen.queryByText('dashboard.trendEmpty')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.recharts-bar')).toHaveLength(4)
    expect(await screen.findByText('dashboard.trendWeekOf 02.11.')).toBeInTheDocument()
    expect(screen.getByText('dashboard.trendTotal: 14')).toBeInTheDocument()
    expect(screen.getByText('09.11.')).toBeInTheDocument()
    const labels = [...container.querySelectorAll('.recharts-legend-wrapper span')]
      .map(node => node.textContent).filter(Boolean)
    expect(labels).toEqual(['severity.4', 'severity.3', 'severity.2', 'severity.1'])
  })
})

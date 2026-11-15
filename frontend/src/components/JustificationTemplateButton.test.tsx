import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JustificationTemplateButton } from './JustificationTemplateButton'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('JustificationTemplateButton', () => {
  it('inserts the template into an empty justification', () => {
    const onInsert = vi.fn()
    render(<JustificationTemplateButton justification="  " onInsert={onInsert} />)

    fireEvent.click(screen.getByRole('button', { name: 'riskAcceptance.insertTemplate' }))

    expect(onInsert).toHaveBeenCalledWith('riskAcceptance.justificationTemplate')
  })

  it('never overwrites existing text', () => {
    const onInsert = vi.fn()
    render(<JustificationTemplateButton justification="already written" onInsert={onInsert} />)

    const button = screen.getByRole('button', { name: 'riskAcceptance.insertTemplate' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onInsert).not.toHaveBeenCalled()
  })
})

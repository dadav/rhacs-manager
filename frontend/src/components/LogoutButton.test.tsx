import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import i18n from '../i18n'
import { LogoutButton } from './LogoutButton'

describe('LogoutButton', () => {
  it.each([
    ['en', 'Log out'],
    ['de', 'Abmelden'],
  ])('renders the %s logout label and tooltip', async (language, label) => {
    await i18n.changeLanguage(language)
    render(<LogoutButton />)

    const link = screen.getByRole('link', { name: label })
    expect(link).toHaveAttribute('href', '/oauth/sign_in')

    fireEvent.mouseEnter(link)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(label)
  })
})

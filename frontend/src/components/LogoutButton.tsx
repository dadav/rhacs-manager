import { Button, Tooltip } from '@patternfly/react-core'
import { SignOutAltIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'

// Ends only the RHACS Manager OAuth proxy session. `/oauth/sign_in` is the
// pinned oauth-proxy endpoint that clears its session cookie and renders the
// proxy sign-in page. Full-page link (not client navigation) so the browser
// leaves the SPA and hits the proxy directly.
const OAUTH_SIGN_IN_PATH = '/oauth/sign_in'

export function LogoutButton() {
  const { t } = useTranslation()
  const label = t('app.logout')

  return (
    <Tooltip content={label} position="bottom">
      <Button
        component="a"
        href={OAUTH_SIGN_IN_PATH}
        variant="plain"
        aria-label={label}
        style={{ color: '#e0e0e0' }}
      >
        <SignOutAltIcon />
      </Button>
    </Tooltip>
  )
}

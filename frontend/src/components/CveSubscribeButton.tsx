import { Alert, Button, Tooltip } from '@patternfly/react-core'
import { BellIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'
import { useCveSubscription, useSetCveSubscription } from '../api/subscriptions'
import { getErrorMessage } from '../utils/errors'

/** Toggle to follow a CVE ("Abonnieren"); notifications are configured in My Settings. */
export function CveSubscribeButton({ cveId }: { cveId: string }) {
  const { t } = useTranslation()
  const { data, isLoading } = useCveSubscription(cveId)
  const setSubscription = useSetCveSubscription(cveId)
  const subscribed = data?.subscribed ?? false
  const busy = isLoading || setSubscription.isPending

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Tooltip content={t(subscribed ? 'subscription.tooltipSubscribed' : 'subscription.tooltip')}>
        <Button
          variant={subscribed ? 'primary' : 'secondary'}
          size="sm"
          icon={<BellIcon />}
          isLoading={setSubscription.isPending}
          isDisabled={busy}
          aria-pressed={subscribed}
          onClick={() => setSubscription.mutate(!subscribed)}
        >
          {t(subscribed ? 'subscription.subscribed' : 'subscription.subscribe')}
        </Button>
      </Tooltip>
      {setSubscription.isError && (
        <Alert
          variant="danger"
          isInline
          isPlain
          title={t('subscription.error', { message: getErrorMessage(setSubscription.error) })}
        />
      )}
    </div>
  )
}

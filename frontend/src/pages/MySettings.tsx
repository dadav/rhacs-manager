import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  PageSection,
  Spinner,
  Switch,
  Title,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { useTranslation } from 'react-i18next'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferenceItem,
} from '../api/preferences'
import { useToast } from '../components/ToastContext'
import { getErrorMessage } from '../utils/errors'

type Channel = 'in_app' | 'email'

/** Personal notification settings. Available to every user (unlike the sec-team Settings page). */
export function MySettings() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { data, isLoading, error } = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()

  function toggle(item: NotificationPreferenceItem, channel: Channel, value: boolean) {
    update.mutate([{ ...item, [channel]: value }], {
      onSuccess: () => addToast(t('mySettings.saved')),
    })
  }

  function channelCell(item: NotificationPreferenceItem, channel: Channel) {
    const value = item[channel]
    if (value === null) {
      return <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>–</span>
    }
    return (
      <Switch
        id={`pref-${item.category}-${channel}`}
        aria-label={`${t(`mySettings.category.${item.category}`)}: ${t(`mySettings.${channel}`)}`}
        isChecked={value}
        isDisabled={update.isPending}
        onChange={(_e, checked) => toggle(item, channel, checked)}
      />
    )
  }

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('mySettings.title')}</Title>
      </PageSection>
      <PageSection>
        <Card style={{ maxWidth: 820 }}>
          <CardTitle>{t('mySettings.notificationsTitle')}</CardTitle>
          <CardBody>
            {isLoading && <Spinner aria-label={t('common.loading')} />}
            {error && <Alert variant="danger" isInline title={`${t('common.error')}: ${getErrorMessage(error)}`} />}
            {update.isError && (
              <Alert
                variant="danger"
                isInline
                title={`${t('common.error')}: ${getErrorMessage(update.error)}`}
                style={{ marginBottom: 12 }}
              />
            )}
            {data && (
              <>
                <p style={{ fontSize: 13, marginTop: 0, color: 'var(--pf-t--global--text--color--subtle)' }}>
                  {t('mySettings.intro')}
                </p>
                <Table variant="compact" aria-label={t('mySettings.notificationsTitle')}>
                  <Thead>
                    <Tr>
                      <Th>{t('mySettings.categoryColumn')}</Th>
                      <Th>{t('mySettings.in_app')}</Th>
                      <Th>{t('mySettings.email')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.items.map(item => (
                      <Tr key={item.category}>
                        <Td>
                          <div style={{ fontWeight: 600 }}>{t(`mySettings.category.${item.category}`)}</div>
                          <div style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                            {t(`mySettings.categoryHelp.${item.category}`)}
                          </div>
                        </Td>
                        <Td>{channelCell(item, 'in_app')}</Td>
                        <Td>{channelCell(item, 'email')}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                <p style={{ fontSize: 12, marginBottom: 0, color: 'var(--pf-t--global--text--color--subtle)' }}>
                  {t('mySettings.mentionsMandatory')}
                </p>
                {!data.team_notifications_active && (
                  <Alert variant="info" isInline isPlain title={t('mySettings.teamInactive')} style={{ marginTop: 12 }} />
                )}
              </>
            )}
          </CardBody>
        </Card>
      </PageSection>
    </>
  )
}

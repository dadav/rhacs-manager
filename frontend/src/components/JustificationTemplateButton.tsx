import { Button } from '@patternfly/react-core'
import { useTranslation } from 'react-i18next'

// Fills the justification with a structured skeleton. Only offered while the field is
// empty, so it can never overwrite text the user already wrote.
export function JustificationTemplateButton({
  justification,
  onInsert,
}: {
  justification: string
  onInsert: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Button
      variant="link"
      size="sm"
      isInline
      isDisabled={justification.trim() !== ''}
      onClick={() => onInsert(t('riskAcceptance.justificationTemplate'))}
      style={{ marginLeft: 12 }}
    >
      {t('riskAcceptance.insertTemplate')}
    </Button>
  )
}

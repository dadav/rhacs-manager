import { Label } from '@patternfly/react-core'
import { useTranslation } from 'react-i18next'

export function CveAliasBadges({ aliases = [] }: { aliases?: readonly string[] }) {
  const { t } = useTranslation()
  if (!aliases.length) return null
  return (
    <span role="group" aria-label={t('cveAliases.label')} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginInlineStart: 6, verticalAlign: 'middle', fontFamily: 'var(--pf-t--global--font--family--body)' }}>
      {aliases.map(alias => <Label key={alias} color="grey" isCompact>{alias}</Label>)}
    </span>
  )
}

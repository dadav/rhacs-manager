import { useEffect, useState } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export function GlobalLoadingBar() {
  const { t } = useTranslation()
  const isFetching = useIsFetching({ predicate: query => query.state.data === undefined }) > 0
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isFetching) {
      setVisible(false)
      return
    }
    const timer = setTimeout(() => setVisible(true), 150)
    return () => clearTimeout(timer)
  }, [isFetching])

  const active = isFetching && visible
  return <div className="global-loading-bar" role="progressbar" aria-label={t('common.loading')} aria-busy={active} hidden={!active} />
}

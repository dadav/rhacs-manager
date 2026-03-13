import {
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core'
import { FilterIcon } from '@patternfly/react-icons'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNamespaces } from '../../api/namespaces'
import { useScope } from '../../hooks/useScope'

const ALLE = '__alle__'

export function ScopeSelector() {
  const { t } = useTranslation()
  const { cluster, namespace, setScope } = useScope()
  const { data: nsList } = useNamespaces()

  const [clusterOpen, setClusterOpen] = useState(false)
  const [nsOpen, setNsOpen] = useState(false)

  const clusters = useMemo(() => {
    if (!nsList) return []
    return [...new Set(nsList.map(n => n.cluster_name))].sort()
  }, [nsList])

  const namespaces = useMemo(() => {
    if (!nsList) return []
    const filtered = cluster ? nsList.filter(n => n.cluster_name === cluster) : nsList
    return [...new Set(filtered.map(n => n.namespace))].sort()
  }, [nsList, cluster])

  const onClusterSelect = (_: unknown, value: string | number | undefined) => {
    const selected = value === ALLE ? undefined : String(value)
    let newNs = namespace
    if (selected && nsList) {
      const nsInCluster = nsList.filter(n => n.cluster_name === selected).map(n => n.namespace)
      if (newNs && !nsInCluster.includes(newNs)) {
        newNs = undefined
      }
    }
    setScope(selected, newNs)
    setClusterOpen(false)
  }

  const onNsSelect = (_: unknown, value: string | number | undefined) => {
    const selected = value === ALLE ? undefined : String(value)
    setScope(cluster, selected)
    setNsOpen(false)
  }

  return (
    <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>
        <FilterIcon style={{ fontSize: 11 }} />
        {t('scope.title')}
      </div>
      <Select
        isOpen={clusterOpen}
        onOpenChange={setClusterOpen}
        onSelect={onClusterSelect}
        selected={cluster || ALLE}
        isScrollable
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setClusterOpen(o => !o)}
            isExpanded={clusterOpen}
            isFullWidth
            size="sm"
          >
            {cluster || t('scope.allClusters')}
          </MenuToggle>
        )}
        popperProps={{ maxWidth: '100%' }}
      >
        <SelectList style={{ maxHeight: 300, overflowY: 'auto' }}>
          <SelectOption value={ALLE}>{t('scope.allClusters')}</SelectOption>
          {clusters.map(c => (
            <SelectOption key={c} value={c}>{c}</SelectOption>
          ))}
        </SelectList>
      </Select>
      <Select
        isOpen={nsOpen}
        onOpenChange={setNsOpen}
        onSelect={onNsSelect}
        selected={namespace || ALLE}
        isScrollable
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setNsOpen(o => !o)}
            isExpanded={nsOpen}
            isFullWidth
            size="sm"
          >
            {namespace || t('scope.allNamespaces')}
          </MenuToggle>
        )}
        popperProps={{ maxWidth: '100%' }}
      >
        <SelectList style={{ maxHeight: 300, overflowY: 'auto' }}>
          <SelectOption value={ALLE}>{t('scope.allNamespaces')}</SelectOption>
          {namespaces.map(ns => (
            <SelectOption key={ns} value={ns}>{ns}</SelectOption>
          ))}
        </SelectList>
      </Select>
    </div>
  )
}

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  Alert,
  Button,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Label,
  Popover,
  Tooltip,
} from '@patternfly/react-core'
import { EraserIcon, OutlinedQuestionCircleIcon, PauseIcon, PlayIcon, TerminalIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { ActivityEvent, ActivityEventKind, ActivityImageRef } from '../../api/activity'
import { useScope } from '../../hooks/useScope'
import { getErrorMessage } from '../../utils/errors'
import { ACTIVITY_MAX_ROWS, useActivityFeed, type ActivityFeed } from './useActivityFeed'
import './ActivityConsole.css'

export const ACTIVITY_PANEL_ID = 'activity-console-panel'
// Rows within this distance of the bottom count as "following the latest".
const NEAR_BOTTOM_PX = 24

// Decorative prefix per kind (aria-hidden): the translated label stays the accessible text.
export const ACTIVITY_KIND_GLYPHS: Record<ActivityEventKind, string> = {
  deployment_observed: '+',
  deployment_removed: '−',
  deployment_images_changed: '~',
  image_scanned: '◆',
  image_scan_updated: '◇',
}

interface ToggleProps {
  isOpen: boolean
  onToggle: () => void
  buttonRef: RefObject<HTMLButtonElement | null>
}

export function ActivityConsoleToggle({ isOpen, onToggle, buttonRef }: ToggleProps) {
  const { t } = useTranslation()
  return (
    <Tooltip content={t('activity.toggle')} position="bottom">
      <Button
        ref={buttonRef}
        variant="plain"
        aria-label={t('activity.toggle')}
        aria-expanded={isOpen}
        aria-controls={ACTIVITY_PANEL_ID}
        onClick={onToggle}
        style={{ color: '#e0e0e0' }}
      >
        <TerminalIcon />
      </Button>
    </Tooltip>
  )
}

interface DrawerProps {
  isOpen: boolean
  /** Collapse requested from inside the drawer; the caller restores focus to the toggle. */
  onClose: () => void
  userId: string | undefined
  children: ReactNode
  /** Overrides the 5-second poll interval (tests). */
  pollIntervalMs?: number
}

/** Shared bottom drawer around the routed content. The feed lives here so it survives navigation. */
export function ActivityConsoleDrawer({ isOpen, onClose, userId, children, pollIntervalMs }: DrawerProps) {
  const { t } = useTranslation()
  const { scopeParams } = useScope()
  const [paused, setPaused] = useState(false)
  const feed = useActivityFeed({
    open: isOpen,
    paused,
    userId,
    cluster: scopeParams.cluster,
    namespace: scopeParams.namespace,
    pollIntervalMs,
  })

  // Every opening starts live.
  useEffect(() => {
    if (!isOpen) setPaused(false)
  }, [isOpen])

  const panel = (
    <DrawerPanelContent
      id={ACTIVITY_PANEL_ID}
      className="activity-console"
      isResizable
      defaultSize="min(280px, 45vh)"
      minSize="min(160px, 30vh)"
      maxSize="60vh"
      increment={20}
      resizeAriaLabel={t('activity.resize')}
      aria-label={t('activity.panelLabel')}
      role="region"
    >
      <ActivityConsolePanel
        isOpen={isOpen}
        feed={feed}
        paused={paused}
        onTogglePause={() => setPaused(value => !value)}
        onClose={onClose}
        cluster={scopeParams.cluster}
        namespace={scopeParams.namespace}
      />
    </DrawerPanelContent>
  )

  return (
    <Drawer isExpanded={isOpen} isInline position="bottom" className="activity-shell">
      <DrawerContent panelContent={panel}>
        <DrawerContentBody className="activity-shell__content">{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  )
}

interface PanelProps {
  isOpen: boolean
  feed: ActivityFeed
  paused: boolean
  onTogglePause: () => void
  onClose: () => void
  cluster?: string
  namespace?: string
}

function scopeSummary(t: TFunction, cluster?: string, namespace?: string): string {
  if (cluster && namespace) return t('activity.scopeBoth', { cluster, namespace })
  if (cluster) return t('activity.scopeCluster', { cluster })
  if (namespace) return t('activity.scopeNamespace', { namespace })
  return t('activity.scopeAll')
}

/** Scope column text: only the part the sidebar selection leaves variable; null when both are fixed. */
export function rowScopeText(event: ActivityEvent, cluster?: string, namespace?: string): string | null {
  if (cluster && namespace) return null
  if (cluster) return event.namespace
  if (namespace) return event.cluster_name
  return `${event.cluster_name}/${event.namespace}`
}

type StatusState = 'paused' | 'error' | 'live' | 'stale' | 'waiting' | 'connecting'

// PatternFly color kept for semantics; the local status class sets the visible terminal color.
const STATUS_LABEL_COLORS: Record<StatusState, 'grey' | 'red' | 'green' | 'orange' | 'blue'> = {
  paused: 'grey',
  error: 'red',
  live: 'green',
  stale: 'orange',
  waiting: 'blue',
  connecting: 'grey',
}

// Precedence: paused, then error, then collector status.
function statusState(feed: ActivityFeed, paused: boolean): StatusState {
  if (paused) return 'paused'
  if (feed.error) return 'error'
  switch (feed.collectorStatus) {
    case 'live':
      return 'live'
    case 'stale':
      return 'stale'
    case 'waiting':
      return 'waiting'
    default:
      return 'connecting'
  }
}

function StatusLabel({ state }: { state: StatusState }) {
  const { t } = useTranslation()
  return (
    <Label
      variant="outline"
      color={STATUS_LABEL_COLORS[state]}
      className={`activity-console__status activity-console__status--${state}`}
    >
      {t(`activity.status.${state}`)}
    </Label>
  )
}

function ActivityConsolePanel({ isOpen, feed, paused, onTogglePause, onClose, cluster, namespace }: PanelProps) {
  const { t, i18n } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)
  const [unseen, setUnseen] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [cleared, setCleared] = useState(false)
  const state = statusState(feed, paused)
  const showScope = !(cluster && namespace)

  useEffect(() => {
    setCleared(false)
  }, [cluster, namespace])

  // PatternFly retains children during closing, so reopening may not remount them.
  useEffect(() => {
    // The heading is still offscreen during expansion; scrolling it into view shifts the page.
    if (isOpen) headingRef.current?.focus({ preventScroll: true })
  }, [isOpen])

  useLayoutEffect(() => {
    const log = logRef.current
    if (log && nearBottomRef.current) log.scrollTop = log.scrollHeight
  }, [feed.rows])

  useEffect(() => {
    if (feed.appendedSerial === 0 || feed.appendedCount === 0) return
    setAnnouncement(t('activity.newEvents', { count: feed.appendedCount }))
    if (!nearBottomRef.current) setUnseen(count => count + feed.appendedCount)
    // Only a newly accepted page announces, never a language change.
  }, [feed.appendedSerial])

  function handleScroll() {
    const log = logRef.current
    if (!log) return
    nearBottomRef.current = log.scrollHeight - log.scrollTop - log.clientHeight <= NEAR_BOTTOM_PX
    if (nearBottomRef.current) setUnseen(0)
  }

  function jumpToLatest() {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
    nearBottomRef.current = true
    setUnseen(0)
  }

  function handleClear() {
    feed.clear()
    setCleared(true)
    setUnseen(0)
    nearBottomRef.current = true
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDateTime = (iso: string) => new Date(iso).toLocaleString(i18n.language)

  let emptyText: string | null = null
  if (feed.rows.length === 0) {
    if (feed.isLoading && !cleared) emptyText = t('activity.loading')
    else if (cleared) emptyText = t('activity.emptyCleared')
    else if (feed.collectorStatus === 'waiting') emptyText = t('activity.emptyWaiting')
    else if (feed.initialLoaded) emptyText = t('activity.empty')
  }

  return (
    <>
      <DrawerHead className="activity-console__head">
        <div className="activity-console__heading-row">
          <h2 ref={headingRef} tabIndex={-1} className="activity-console__title">
            {t('activity.title')}
          </h2>
          <StatusLabel state={state} />
          <Popover aria-label={t('activity.about')} bodyContent={t('activity.samplingNote')} position="top">
            <Button
              variant="plain"
              size="sm"
              aria-label={t('activity.about')}
              className="activity-console__control activity-console__info"
              icon={<OutlinedQuestionCircleIcon />}
            />
          </Popover>
          <span className="activity-console__meta">{scopeSummary(t, cluster, namespace)}</span>
          <span className="activity-console__meta">
            {feed.lastSuccessAt
              ? t('activity.lastSuccess', { time: formatTime(feed.lastSuccessAt) })
              : t('activity.lastSuccessNever')}
          </span>
        </div>
        <DrawerActions>
          <Button
            variant="secondary"
            size="sm"
            className="activity-console__control"
            icon={paused ? <PlayIcon /> : <PauseIcon />}
            onClick={onTogglePause}
          >
            {paused ? t('activity.resume') : t('activity.pause')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="activity-console__control"
            icon={<EraserIcon />}
            onClick={handleClear}
          >
            {t('activity.clear')}
          </Button>
          <DrawerCloseButton
            onClick={onClose}
            aria-label={t('activity.close')}
            buttonProps={{ className: 'activity-console__control' }}
          />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody hasNoPadding className="activity-console__body">
        {feed.error ? (
          <Alert
            variant="danger"
            isInline
            isPlain
            title={t('activity.loadError', { message: getErrorMessage(feed.error) })}
            className="activity-console__alert"
          />
        ) : null}
        {feed.truncated ? (
          <div className="activity-console__notice">{t('activity.truncated', { count: ACTIVITY_MAX_ROWS })}</div>
        ) : null}
        <div className="activity-console__log-wrap">
          <div
            ref={logRef}
            className={`activity-console__log${showScope ? '' : ' activity-console__log--no-scope'}`}
            role="log"
            aria-live="off"
            aria-label={t('activity.logLabel')}
            // Scrollable log: focusable so keyboard users can scroll it.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            onScroll={handleScroll}
          >
            {emptyText ? <div className="activity-console__empty">{emptyText}</div> : null}
            {feed.rows.map(event => (
              <ActivityRow
                key={event.id}
                event={event}
                scopeText={rowScopeText(event, cluster, namespace)}
                formatTime={formatTime}
                formatDateTime={formatDateTime}
              />
            ))}
            {state === 'error' ? null : (
              <div className="activity-console__prompt" aria-hidden="true">
                <span className={`activity-console__cursor activity-console__cursor--${state}`}>▍</span>
              </div>
            )}
          </div>
          {unseen > 0 ? (
            <Button variant="primary" size="sm" className="activity-console__jump" onClick={jumpToLatest}>
              {t('activity.jumpToLatest', { count: unseen })}
            </Button>
          ) : null}
        </div>
        <div className="pf-v6-screen-reader" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
      </DrawerPanelBody>
    </>
  )
}

function imageLabel(t: TFunction, ref: { image_name: string | null; image_digest: string | null; image_id_v2: string | null }): string {
  if (ref.image_name) return ref.image_name
  if (ref.image_digest) return ref.image_digest.length > 19 ? `${ref.image_digest.slice(0, 19)}…` : ref.image_digest
  return ref.image_id_v2 ?? t('activity.text.unknown')
}

function imageList(t: TFunction, refs: ActivityImageRef[]): string {
  return refs.length ? refs.map(ref => imageLabel(t, ref)).join(', ') : t('activity.text.none')
}

function countText(t: TFunction, value: number | null): string {
  return value === null ? t('activity.text.unknown') : String(value)
}

/** Row description in three emphasis levels: lead (bright), body, meta (muted). */
export interface ActivityText {
  lead: string | null
  body: string
  meta: string | null
}

export function describeActivity(t: TFunction, event: ActivityEvent, formatDateTime: (iso: string) => string): ActivityText {
  switch (event.kind) {
    case 'deployment_observed':
      return {
        lead: null,
        body: t('activity.text.deploymentObserved', { name: event.details.deployment_name ?? event.details.deployment_id }),
        meta: null,
      }
    case 'deployment_removed':
      return {
        lead: null,
        body: t('activity.text.deploymentRemoved', { name: event.details.deployment_name ?? event.details.deployment_id }),
        meta: null,
      }
    case 'deployment_images_changed':
      return {
        lead: null,
        body: t('activity.text.imagesChanged', {
          name: event.details.deployment_name ?? event.details.deployment_id,
          added: imageList(t, event.details.added_images),
          removed: imageList(t, event.details.removed_images),
        }),
        meta: null,
      }
    case 'image_scanned':
    case 'image_scan_updated':
      return {
        lead: imageLabel(t, event.details),
        body: t('activity.text.scan', {
          cves: countText(t, event.details.cve_count),
          fixable: countText(t, event.details.fixable_cve_count),
          components: countText(t, event.details.component_count),
        }),
        meta: event.source_at ? t('activity.text.scanTime', { time: formatDateTime(event.source_at) }) : null,
      }
  }
}

interface RowProps {
  event: ActivityEvent
  scopeText: string | null
  formatTime: (iso: string) => string
  formatDateTime: (iso: string) => string
}

function ActivityRow({ event, scopeText, formatTime, formatDateTime }: RowProps) {
  const { t } = useTranslation()
  const text = describeActivity(t, event, formatDateTime)
  return (
    <div className="activity-console__row" data-kind={event.kind}>
      <time className="activity-console__time" dateTime={event.observed_at}>
        {formatTime(event.observed_at)}
      </time>
      <span className={`activity-console__kind activity-console__kind--${event.kind}`}>
        <span className="activity-console__glyph" aria-hidden="true">
          {ACTIVITY_KIND_GLYPHS[event.kind]}
        </span>
        <span className="activity-console__kind-label">{t(`activity.kind.${event.kind}`)}</span>
      </span>
      {scopeText === null ? null : <span className="activity-console__scope">{scopeText}</span>}
      <span className="activity-console__text">
        {text.lead === null ? null : <span className="activity-console__text-lead">{text.lead}</span>}
        {text.lead === null ? null : ' '}
        <span>{text.body}</span>
        {text.meta === null ? null : ' '}
        {text.meta === null ? null : <span className="activity-console__text-meta">· {text.meta}</span>}
      </span>
    </div>
  )
}

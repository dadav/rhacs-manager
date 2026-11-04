import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  PageSection,
  SearchInput,
  Title,
} from '@patternfly/react-core'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { getFaqCategories, parseTerms, searchFaq, splitHighlight } from '../faq/faqContent'
import { useDebounce } from '../hooks/useDebounce'

const QUERY_PARAM = 'q'
const EMPTY_IDS: ReadonlySet<string> = new Set()

function toggleId(ids: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(ids)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {splitHighlight(text, terms).map((segment, index) =>
        segment.match ? (
          <mark
            key={index}
            style={{
              background: 'var(--pf-t--global--background--color--highlight--default)',
              color: 'var(--pf-t--global--text--color--on-highlight)',
              padding: 0,
            }}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}

export function Faq() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get(QUERY_PARAM) ?? ''
  const [searchInput, setSearchInput] = useState(urlQuery)
  const debouncedInput = useDebounce(searchInput, 300)

  // The URL is the source of truth: external navigation (Back/Forward, sidebar link)
  // overrides the input. Comparing with the debounced value keeps our own writes from
  // bouncing back while the user types.
  useEffect(() => {
    if (urlQuery !== debouncedInput) setSearchInput(urlQuery)
  }, [urlQuery])

  // Idempotent write (no-op when the URL already matches), so mount and StrictMode
  // effect replay never rewrite the URL. Other params (cluster, ns, ignore_thresholds)
  // are copied unchanged.
  useEffect(() => {
    if (debouncedInput === urlQuery) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (debouncedInput) next.set(QUERY_PARAM, debouncedInput)
        else next.delete(QUERY_PARAM)
        return next
      },
      { replace: true },
    )
  }, [debouncedInput])

  const terms = useMemo(() => parseTerms(searchInput), [searchInput])
  const hasQuery = terms.length > 0
  const allCategories = getFaqCategories(i18n.language)
  const categories = useMemo(() => searchFaq(allCategories, searchInput), [allCategories, searchInput])
  const matchCount = categories.reduce((sum, category) => sum + category.entries.length, 0)

  // Without a query, entries are collapsed unless opened. With a query, matches are
  // expanded unless closed; those closes are tied to the query they were made for.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(EMPTY_IDS)
  const [searchCollapsed, setSearchCollapsed] = useState<{ query: string; ids: ReadonlySet<string> }>({
    query: '',
    ids: EMPTY_IDS,
  })
  const collapsedIds = searchCollapsed.query === searchInput ? searchCollapsed.ids : EMPTY_IDS

  const isExpanded = (id: string) => (hasQuery ? !collapsedIds.has(id) : expandedIds.has(id))
  const onToggle = (id: string) => {
    if (hasQuery) setSearchCollapsed({ query: searchInput, ids: toggleId(collapsedIds, id) })
    else setExpandedIds((prev) => toggleId(prev, id))
  }

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">
          {t('faq.title')}
        </Title>
        <Content component="p" style={{ marginTop: 8, color: 'var(--pf-t--global--text--color--subtle)' }}>
          {t('faq.intro')}
        </Content>
        <div style={{ marginTop: 16, maxWidth: 640 }}>
          <SearchInput
            value={searchInput}
            onChange={(_event, value) => setSearchInput(value)}
            onClear={() => setSearchInput('')}
            placeholder={t('faq.searchPlaceholder')}
            aria-label={t('faq.searchAriaLabel')}
            resetButtonLabel={t('faq.clearSearch')}
            resultsCount={hasQuery ? t('faq.resultsCount', { count: matchCount }) : undefined}
          />
        </div>
      </PageSection>

      <PageSection>
        {categories.length === 0 ? (
          <EmptyState headingLevel="h2" titleText={t('faq.noResults')} variant="sm">
            <EmptyStateBody>{t('faq.noResultsHint')}</EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="link" onClick={() => setSearchInput('')}>
                  {t('faq.clearSearch')}
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        ) : (
          categories.map((category) => (
            <section key={category.id} aria-labelledby={`faq-category-${category.id}`} style={{ marginBottom: 24 }}>
              <Title headingLevel="h2" size="lg" id={`faq-category-${category.id}`} style={{ marginBottom: 8 }}>
                <Highlighted text={category.title} terms={terms} />
              </Title>
              <Accordion asDefinitionList={false} headingLevel="h3" isBordered>
                {category.entries.map((entry) => (
                  <AccordionItem key={entry.id} isExpanded={isExpanded(entry.id)}>
                    <AccordionToggle id={`faq-toggle-${entry.id}`} onClick={() => onToggle(entry.id)}>
                      <Highlighted text={entry.question} terms={terms} />
                    </AccordionToggle>
                    <AccordionContent>
                      {entry.answer.map((paragraph, index) => (
                        <p key={index} style={{ marginBottom: index < entry.answer.length - 1 ? 8 : 0 }}>
                          <Highlighted text={paragraph} terms={terms} />
                        </p>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))
        )}
      </PageSection>
    </>
  )
}

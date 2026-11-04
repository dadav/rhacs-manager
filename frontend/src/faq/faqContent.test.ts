import { describe, it, expect } from 'vitest'
import de from './faq.de.json'
import en from './faq.en.json'
import { getFaqCategories, parseTerms, searchFaq, splitHighlight, type FaqCategory } from './faqContent'

const SAMPLE: FaqCategory[] = [
  {
    id: 'visibility',
    title: 'Visibility',
    entries: [
      { id: 'missing', question: 'Why is a CVE missing?', answer: ['Check the thresholds.', 'Check the namespace.'] },
      { id: 'access', question: 'How do I get access?', answer: ['Ask your cluster admin.'] },
    ],
  },
  {
    id: 'badges',
    title: 'Badges',
    entries: [{ id: 'badge', question: 'What is it for?', answer: ['Embed it in a README.'] }],
  },
]

function ids(categories: FaqCategory[]): string[] {
  return categories.flatMap((category) => category.entries.map((entry) => entry.id))
}

describe('FAQ content files', () => {
  it('have identical category and entry ids in de and en', () => {
    const shape = (doc: { categories: FaqCategory[] }) =>
      doc.categories.map((category) => ({ id: category.id, entries: category.entries.map((entry) => entry.id) }))
    expect(shape(de)).toEqual(shape(en))
  })

  it.each([
    ['de', de],
    ['en', en],
  ])('%s has unique ids and non-empty text', (_lang, doc) => {
    const categoryIds = doc.categories.map((category) => category.id)
    expect(new Set(categoryIds).size).toBe(categoryIds.length)
    const entryIds = ids(doc.categories)
    expect(new Set(entryIds).size).toBe(entryIds.length)
    for (const category of doc.categories) {
      expect(category.title.trim()).not.toBe('')
      expect(category.entries.length).toBeGreaterThan(0)
      for (const entry of category.entries) {
        expect(entry.question.trim()).not.toBe('')
        expect(entry.answer.length).toBeGreaterThan(0)
        for (const paragraph of entry.answer) expect(paragraph.trim()).not.toBe('')
      }
    }
  })

  it('selects the language by prefix and falls back to English', () => {
    expect(getFaqCategories('de')).toBe(de.categories)
    expect(getFaqCategories('de-AT')).toBe(de.categories)
    expect(getFaqCategories('en')).toBe(en.categories)
    expect(getFaqCategories('fr')).toBe(en.categories)
  })
})

describe('parseTerms', () => {
  it('splits on whitespace, drops empties, dedupes', () => {
    expect(parseTerms('  risk   risk acceptance ')).toEqual(['risk', 'acceptance'])
    expect(parseTerms('   ')).toEqual([])
  })
})

describe('searchFaq', () => {
  it('returns all categories for an empty query', () => {
    expect(searchFaq(SAMPLE, '  ')).toBe(SAMPLE)
  })

  it('matches case-insensitively in the question', () => {
    expect(ids(searchFaq(SAMPLE, 'MISSING'))).toEqual(['missing'])
  })

  it('requires every term to match', () => {
    expect(ids(searchFaq(SAMPLE, 'check namespace'))).toEqual(['missing'])
    expect(ids(searchFaq(SAMPLE, 'check readme'))).toEqual([])
  })

  it('matches answer-only text', () => {
    expect(ids(searchFaq(SAMPLE, 'cluster admin'))).toEqual(['access'])
  })

  it('matches via the category title', () => {
    expect(ids(searchFaq(SAMPLE, 'visibility'))).toEqual(['missing', 'access'])
  })

  it('drops categories without matches', () => {
    expect(searchFaq(SAMPLE, 'readme').map((category) => category.id)).toEqual(['badges'])
  })

  it('treats regex special characters literally', () => {
    expect(ids(searchFaq(SAMPLE, 'c++ ('))).toEqual([])
  })

  it('folds case for non-ASCII letters', () => {
    const german: FaqCategory[] = [
      { id: 'c', title: 'T', entries: [{ id: 'e', question: 'Änderung der Priorität', answer: ['x'] }] },
    ]
    expect(ids(searchFaq(german, 'ÄNDERUNG'))).toEqual(['e'])
    expect(ids(searchFaq(german, 'PRIORITÄT'))).toEqual(['e'])
  })
})

describe('splitHighlight', () => {
  const join = (text: string, terms: string[]) =>
    splitHighlight(text, terms)
      .map((segment) => segment.text)
      .join('')

  it('marks case-insensitive matches', () => {
    expect(splitHighlight('Risk and risk', ['RISK'])).toEqual([
      { text: 'Risk', match: true },
      { text: ' and ', match: false },
      { text: 'risk', match: true },
    ])
  })

  it('returns the text unmarked without terms', () => {
    expect(splitHighlight('plain', [])).toEqual([{ text: 'plain', match: false }])
  })

  it('prefers the longest term', () => {
    expect(splitHighlight('Risikoakzeptanz', ['Risiko', 'Risikoakzeptanz'])).toEqual([
      { text: 'Risikoakzeptanz', match: true },
    ])
  })

  it('handles regex special characters and overlapping terms', () => {
    expect(splitHighlight('use c++ (now)', ['c++', '('])).toEqual([
      { text: 'use ', match: false },
      { text: 'c++', match: true },
      { text: ' ', match: false },
      { text: '(', match: true },
      { text: 'now)', match: false },
    ])
    expect(join('abc', ['ab', 'bc'])).toBe('abc')
  })

  it('keeps segments aligned with the original string for special Unicode', () => {
    for (const text of ['İstanbul ist groß', 'Straße STRASSE', 'ǅemal']) {
      expect(join(text, ['i', 'ss', 'ǆ'])).toBe(text)
    }
    expect(splitHighlight('ÄNDERUNG', ['änderung'])).toEqual([{ text: 'ÄNDERUNG', match: true }])
  })
})

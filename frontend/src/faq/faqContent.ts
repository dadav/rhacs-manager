import de from './faq.de.json'
import en from './faq.en.json'

export interface FaqEntry {
  id: string
  question: string
  // Plain-text paragraphs; never HTML or markdown (highlighting splits raw text).
  answer: string[]
}

export interface FaqCategory {
  id: string
  title: string
  entries: FaqEntry[]
}

interface FaqDocument {
  categories: FaqCategory[]
}

const FAQ_BY_LANGUAGE: Record<'de' | 'en', FaqDocument> = { de, en }

export interface HighlightSegment {
  text: string
  match: boolean
}

/** German for any `de*` language, English otherwise (matches `fallbackLng: 'en'`). */
export function getFaqCategories(language: string): FaqCategory[] {
  return language.startsWith('de') ? FAQ_BY_LANGUAGE.de.categories : FAQ_BY_LANGUAGE.en.categories
}

/** Whitespace-separated search terms, empty strings dropped, exact duplicates removed. */
export function parseTerms(query: string): string[] {
  const terms = query.trim().split(/\s+/).filter((term) => term !== '')
  return [...new Set(terms)]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Keeps entries where every term matches (case-insensitive, `iu` regex on the original
 * text) the category title, the question, or an answer paragraph. Categories without
 * matching entries are dropped; order is preserved.
 */
export function searchFaq(categories: FaqCategory[], query: string): FaqCategory[] {
  const terms = parseTerms(query)
  if (terms.length === 0) return categories

  const matchers = terms.map((term) => new RegExp(escapeRegExp(term), 'iu'))
  const result: FaqCategory[] = []
  for (const category of categories) {
    const entries = category.entries.filter((entry) => {
      const fields = [category.title, entry.question, ...entry.answer]
      return matchers.every((matcher) => fields.some((field) => matcher.test(field)))
    })
    if (entries.length > 0) result.push({ ...category, entries })
  }
  return result
}

/**
 * Splits `text` into matched and unmatched segments using the same matching rule as
 * `searchFaq`. Joining all segment texts always reproduces `text` exactly.
 */
export function splitHighlight(text: string, terms: string[]): HighlightSegment[] {
  if (text === '') return []
  if (terms.length === 0) return [{ text, match: false }]

  const pattern = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
  // With one capture group, split() puts captured matches at odd indices.
  const parts = text.split(new RegExp(`(${pattern})`, 'giu'))
  return parts
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((segment) => segment.text !== '')
}

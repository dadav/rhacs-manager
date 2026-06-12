// Shared date/CVSS/EPSS formatting helpers.
// `lang` is the active i18n language (e.g. i18n.language); only 'de' vs anything else matters.

export function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US')
}

export function formatDateTime(iso: string | null | undefined, lang: string): string {
  if (!iso) return '–'
  return new Date(iso).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US')
}

export function formatCvss(score: number): string {
  return score.toFixed(1)
}

export function formatEpssPercent(score: number): string {
  return `${(score * 100).toFixed(1)}%`
}

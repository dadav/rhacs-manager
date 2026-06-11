const DEFAULT_ERROR_MESSAGE = 'Unbekannter Fehler'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : DEFAULT_ERROR_MESSAGE
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }

  if (Array.isArray(value)) {
    const parts = value
      .map(item => stringifyUnknown(item))
      .filter(item => item && item !== DEFAULT_ERROR_MESSAGE)

    return parts.length > 0 ? parts.join(', ') : DEFAULT_ERROR_MESSAGE
  }

  if (isRecord(value)) {
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message.trim()
    }

    if (typeof value.detail === 'string' && value.detail.trim()) {
      return value.detail.trim()
    }

    if (Array.isArray(value.detail)) {
      const parts = value.detail
        .map(item => {
          if (isRecord(item) && typeof item.msg === 'string' && item.msg.trim()) {
            return item.msg.trim()
          }
          return stringifyUnknown(item)
        })
        .filter(item => item && item !== DEFAULT_ERROR_MESSAGE)

      return parts.length > 0 ? parts.join(', ') : DEFAULT_ERROR_MESSAGE
    }

    if (typeof value.error === 'string' && value.error.trim()) {
      return value.error.trim()
    }

    try {
      return JSON.stringify(value)
    } catch {
      return DEFAULT_ERROR_MESSAGE
    }
  }

  return DEFAULT_ERROR_MESSAGE
}

export function getErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  const message = stringifyUnknown(error)
  return message === DEFAULT_ERROR_MESSAGE ? fallback : message
}

/**
 * Read a failed fetch Response and return a user-visible error message.
 * Parses the JSON body via getErrorMessage (handling FastAPI validation-error
 * arrays), falling back to "HTTP <status>" when the body is missing or unparsable.
 * Shared by api/client.ts and api/exports.ts so all fetch paths extract errors
 * the same way.
 */
export async function extractApiError(res: Response): Promise<string> {
  const fallback = `HTTP ${res.status}`
  try {
    const body = await res.json()
    return getErrorMessage(body, fallback)
  } catch {
    return fallback
  }
}

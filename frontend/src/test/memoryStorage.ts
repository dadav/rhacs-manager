// Node >= 25 ships its own global `localStorage` (undefined without --localstorage-file), which
// shadows jsdom's. Tests that need storage install this in-memory stand-in on `window` instead.

export function installMemoryStorage(): Storage {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key)
    },
    setItem: (key, value) => {
      values.set(key, String(value))
    },
  }
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  return storage
}

/** Makes every `window.localStorage` access throw, like a browser with blocked site data. */
export function installThrowingStorage(): void {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
  })
}

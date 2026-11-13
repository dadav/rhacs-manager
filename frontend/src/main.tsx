// PatternFly base styles
import '@patternfly/react-core/dist/styles/base.css'
// OpenShift Console-inspired theme overrides
import './openshift-theme.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './i18n/index'
import { App } from './App'
import { SessionExpiredModal } from './components/SessionExpiredModal'
import { ToastProvider } from './components/ToastContext'
import { SessionExpiredError, subscribeSessionExpired } from './utils/sessionExpiry'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !(error instanceof SessionExpiredError) && failureCount < 1,
      staleTime: 30_000,
    },
  },
})

subscribeSessionExpired(() => {
  void queryClient.cancelQueries()
  const defaults = queryClient.getDefaultOptions()
  // Hook-level polling intervals override these defaults.
  queryClient.setDefaultOptions({
    ...defaults,
    queries: {
      ...defaults.queries,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  })
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <App />
          <SessionExpiredModal />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)

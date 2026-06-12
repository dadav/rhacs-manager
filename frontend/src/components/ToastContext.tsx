import {
  AlertGroup,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Toast = { id: number; title: string }

type ToastContextValue = {
  addToast: (title: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((title: string) => {
    setToasts(prev => [...prev, { id: Date.now() + Math.random(), title }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <AlertGroup isToast isLiveRegion>
        {toasts.map(toast => (
          <Alert
            key={toast.id}
            variant="success"
            title={toast.title}
            timeout={5000}
            onTimeout={() => removeToast(toast.id)}
            actionClose={
              <AlertActionCloseButton onClose={() => removeToast(toast.id)} />
            }
          />
        ))}
      </AlertGroup>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

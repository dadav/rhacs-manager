import { Button } from '@patternfly/react-core'
import { useState } from 'react'
import { getErrorMessage } from '../../utils/errors'

interface InlineConfirmButtonProps {
  label: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => Promise<void>
}

export function InlineConfirmButton({
  label,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: InlineConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Button
          variant="danger"
          size="sm"
          isLoading={pending}
          onClick={async () => {
            setPending(true)
            try {
              await onConfirm()
            } catch (err) {
              const msg = getErrorMessage(err)
              setError(msg)
              setConfirming(false)
            } finally {
              setPending(false)
            }
          }}
        >
          {confirmLabel}
        </Button>
        <Button variant="link" size="sm" onClick={() => setConfirming(false)}>
          {cancelLabel}
        </Button>
        {error && <span style={{ color: '#c9190b', fontSize: 12 }}>{error}</span>}
      </div>
    )
  }

  return (
    <Button variant="link" isDanger size="sm" onClick={() => setConfirming(true)}>
      {label}
    </Button>
  )
}

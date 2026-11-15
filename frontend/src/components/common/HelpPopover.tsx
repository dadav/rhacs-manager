import { Button, Popover } from '@patternfly/react-core'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import type { ReactNode } from 'react'

// Question-mark button that opens explanatory text on demand, so cards show data first.
export function HelpPopover({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover bodyContent={<div style={{ fontSize: 13, lineHeight: 1.6 }}>{children}</div>} position="right">
      <Button variant="plain" aria-label={label} style={{ padding: '4px 6px' }}>
        <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
      </Button>
    </Popover>
  )
}

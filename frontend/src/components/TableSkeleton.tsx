import { Skeleton } from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'

// Skeleton placeholder rows only (no Table/Thead) for use inside an existing table body.
export function TableSkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, ri) => (
        <Tr key={ri}>
          {Array.from({ length: columns }, (_, ci) => (
            <Td key={ci}><Skeleton width={ci === 0 ? '60%' : '40%'} /></Td>
          ))}
        </Tr>
      ))}
    </>
  )
}

export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <Table variant="compact">
      <Thead>
        <Tr>
          {Array.from({ length: columns }, (_, i) => (
            <Th key={i}><Skeleton width="80%" /></Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {Array.from({ length: rows }, (_, ri) => (
          <Tr key={ri}>
            {Array.from({ length: columns }, (_, ci) => (
              <Td key={ci}><Skeleton width={ci === 0 ? '60%' : '40%'} /></Td>
            ))}
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}

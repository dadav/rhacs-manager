import {
  Alert,
  Button,
  FileUpload,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
} from '@patternfly/react-core'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  importExcel,
  type ImportConfirmResult,
  type ImportPreviewItem,
  type ImportPreviewResult,
} from '../api/exports'
import { getErrorMessage } from '../utils/errors'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ExcelImportModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [file, setFile] = useState<File | null>(null)
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [result, setResult] = useState<ImportConfirmResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setFile(null)
    setFilename('')
    setPreview(null)
    setResult(null)
    setError(null)
    setLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFileChange(_: unknown, selectedFile: File) {
    setFile(selectedFile)
    setFilename(selectedFile.name)
    setPreview(null)
    setResult(null)
    setError(null)

    // Auto-preview
    setLoading(true)
    try {
      const res = await importExcel(selectedFile, false)
      setPreview(res as ImportPreviewResult)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await importExcel(file, true)
      setResult(res as ImportConfirmResult)
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['cves'] })
      queryClient.invalidateQueries({ queryKey: ['risk-acceptances'] })
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const tdStyle: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #d2d2d2', fontSize: 13 }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant="large">
      <ModalHeader title={t('exports.importTitle')} />
      <ModalBody>
        {error && <Alert variant="danger" title={error} isInline style={{ marginBottom: 16 }} />}

        {result ? (
          <>
            <Alert
              variant="success"
              isInline
              title={t('exports.importSuccess', { count: result.created.length })}
              style={{ marginBottom: 16 }}
            />
            {result.failed.length > 0 && (
              <Alert
                variant="warning"
                isInline
                title={t('exports.importFailed', { count: result.failed.length })}
                style={{ marginBottom: 16 }}
              >
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.failed.map((f, i) => (
                    <li key={i}><strong>{f.cve_id}:</strong> {f.error}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </>
        ) : (
          <>
            <FileUpload
              id="excel-import-file"
              value={file ?? undefined}
              filename={filename}
              filenamePlaceholder={t('exports.importFilePlaceholder')}
              onFileInputChange={handleFileChange}
              onClearClick={() => { reset() }}
              browseButtonText={t('exports.importBrowse')}
              accept=".xlsx"
            />

            {loading && <Spinner aria-label="Laden" style={{ margin: '16px 0' }} />}

            {preview && !loading && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 14 }}>
                  <strong>{preview.total_valid}</strong> {t('exports.importValid')},{' '}
                  <strong>{preview.total_invalid}</strong> {t('exports.importInvalid')}
                </div>

                {preview.items.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #d2d2d2' }}>
                          <th style={{ ...tdStyle, fontWeight: 600 }}>CVE-ID</th>
                          <th style={{ ...tdStyle, fontWeight: 600 }}>{t('exports.importJustification')}</th>
                          <th style={{ ...tdStyle, fontWeight: 600 }}>{t('exports.importScope')}</th>
                          <th style={{ ...tdStyle, fontWeight: 600 }}>{t('exports.importRows')}</th>
                          <th style={{ ...tdStyle, fontWeight: 600 }}>{t('exports.importStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.items.map((item: ImportPreviewItem, idx: number) => (
                          <tr key={idx} style={{ background: item.valid ? 'transparent' : 'rgba(201,25,11,0.06)' }}>
                            <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{item.cve_id}</td>
                            <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.justification}
                            </td>
                            <td style={tdStyle}>{item.scope || '–'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>{item.row_count}</td>
                            <td style={tdStyle}>
                              {item.valid ? (
                                <span style={{ color: '#1e8f19' }}>{t('exports.importStatusValid')}</span>
                              ) : (
                                <span style={{ color: '#c9190b' }} title={item.errors.join('; ')}>
                                  {item.errors[0]}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {result ? (
          <Button variant="primary" onClick={handleClose}>
            {t('common.close')}
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              onClick={handleConfirm}
              isDisabled={!preview || preview.total_valid === 0 || loading}
              isLoading={loading}
            >
              {t('exports.importConfirm')}
            </Button>
            <Button variant="link" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}

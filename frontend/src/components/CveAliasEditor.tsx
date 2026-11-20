import { Alert, Button, FormGroup, Modal, ModalBody, ModalFooter, ModalHeader, TextArea } from '@patternfly/react-core'
import { PencilAltIcon } from '@patternfly/react-icons'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetCveAliases } from '../api/cveAliases'
import { getErrorMessage } from '../utils/errors'

interface EditorProps {
  cveId: string
  aliases?: string[]
}

function AliasModal({ cveId, aliases = [], onClose }: EditorProps & { onClose: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  const [text, setText] = useState(aliases.join('\n'))
  const mutation = useSetCveAliases(cveId)
  const names = text.split(/\r?\n/).map(name => name.trim()).filter(Boolean)
  const tooLong = names.some(name => [...name].length > 80)
  // The API performs authoritative Unicode-aware deduplication and validation.
  const close = () => { if (!mutation.isPending) onClose() }

  return (
    <Modal isOpen variant="small" onClose={close} aria-labelledby={`${id}-title`}>
      <ModalHeader title={t('cveAliases.edit')} description={cveId} labelId={`${id}-title`} />
      <ModalBody>
        <FormGroup label={t('cveAliases.label')} fieldId={id}>
          <TextArea id={id} value={text} onChange={(_event, value) => setText(value)} rows={6} isDisabled={mutation.isPending} aria-describedby={`${id}-help`} validated={tooLong ? 'error' : 'default'} />
          <p id={`${id}-help`}>{t('cveAliases.help')}</p>
        </FormGroup>
        {tooLong && <Alert isInline variant="danger" title={t('cveAliases.tooLong')} />}
        {mutation.isError && <Alert isInline variant="danger" title={getErrorMessage(mutation.error)} />}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" isLoading={mutation.isPending} isDisabled={mutation.isPending || tooLong} onClick={() => mutation.mutate(names, { onSuccess: onClose })}>{t('common.save')}</Button>
        <Button variant="link" isDisabled={mutation.isPending} onClick={close}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  )
}

export function CveAliasEditor(props: EditorProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="link" size="sm" icon={<PencilAltIcon />} onClick={() => setOpen(true)}>{t('cveAliases.edit')}</Button>
      {open && <AliasModal {...props} onClose={() => setOpen(false)} />}
    </>
  )
}

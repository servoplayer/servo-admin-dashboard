import { useState } from 'react'
import { DeactivateDialog, PaymentDialog } from './DeviceDialogs'

/** Owns which dialog is open so tables can trigger actions with one call. */
export default function useDeviceActions(onDone) {
  const [state, setState] = useState({ type: null, device: null })
  const close = () => setState({ type: null, device: null })
  const open = (type, device) => setState({ type, device })
  const dialogs = (
    <>
      <PaymentDialog
        mode={state.type === 'renew' ? 'renew' : 'activate'}
        device={state.type === 'renew' || state.type === 'activate' ? state.device : null}
        onClose={close}
        onDone={onDone}
      />
      <DeactivateDialog device={state.type === 'deactivate' ? state.device : null} onClose={close} onDone={onDone} />
    </>
  )
  return { open, dialogs }
}

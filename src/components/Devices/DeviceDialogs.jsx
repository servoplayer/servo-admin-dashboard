import { useEffect, useState } from 'react'
import { CalendarClock, MonitorSmartphone } from 'lucide-react'
import Modal, { ConfirmDialog } from '../ui/Modal'
import Button from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { devicesApi } from '../../lib/services'
import { invalidate } from '../../lib/resource'
import { notify } from '../../lib/notify'
import { priceValue, usePrice } from '../../lib/dashboardData'
import { formatDate, formatDeviceType, relativeDays } from '../../lib/format'

function DeviceSummary({ device }) {
  if (!device) return null
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <MonitorSmartphone size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0 text-[13px]">
        <p className="truncate font-mono font-semibold text-fg">{device.macAddress}</p>
        <p className="text-muted">
          {formatDeviceType(device.type)}
          {device.isSubscribed && device.endDate && (
            <> · expires {formatDate(device.endDate)} ({relativeDays(device.endDate)})</>
          )}
        </p>
      </div>
    </div>
  )
}

/**
 * Activation and renewal both charge a yearly subscription for a pay amount
 * the admin confirms. The amount is pre-filled with the configured activation
 * price but stays editable, since the amount paid can differ per customer.
 */
export function PaymentDialog({ mode, device, onClose, onDone }) {
  const open = Boolean(device)
  const { data: priceData } = usePrice()
  const defaultPrice = priceValue(priceData)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount(defaultPrice !== undefined && defaultPrice !== null ? String(defaultPrice) : '')
      setError('')
    }
    // Only reset when the dialog opens for a device.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, device?._id])

  const isRenew = mode === 'renew'

  const submit = async () => {
    if (amount === '' || Number.isNaN(Number(amount)) || Number(amount) < 0) {
      setError('Enter the amount the customer paid.')
      return
    }
    setSubmitting(true)
    const res = isRenew ? await devicesApi.renew(device._id, amount) : await devicesApi.activate(device._id, amount)
    setSubmitting(false)
    if (!res.ok) {
      notify.error(res.message || 'The request failed. Please try again.')
      return
    }
    notify.success(res.message || (isRenew ? 'Subscription renewed.' : 'Device activated.'))
    invalidate('devices', 'subscriptions')
    onDone?.()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      onSubmit={submit}
      title={isRenew ? 'Renew subscription' : 'Activate device'}
      description={
        isRenew
          ? 'Records a yearly renewal for this device.'
          : 'Starts a yearly subscription for this device.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting} icon={isRenew ? CalendarClock : undefined}>
            {isRenew ? 'Renew for 1 year' : 'Activate for 1 year'}
          </Button>
        </>
      }
    >
      <DeviceSummary device={device} />
      <Field
        label="Pay amount"
        required
        error={error}
        hint={defaultPrice ? `Pre-filled with the current activation price (${defaultPrice}).` : 'Amount received for this yearly subscription.'}
      >
        {(p) => (
          <Input
            {...p}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              if (error) setError('')
            }}
            placeholder="0"
            className="tabular"
          />
        )}
      </Field>
    </Modal>
  )
}

export function DeactivateDialog({ device, onClose, onDone }) {
  const [submitting, setSubmitting] = useState(false)
  const confirm = async () => {
    setSubmitting(true)
    const res = await devicesApi.deactivate(device._id)
    setSubmitting(false)
    if (!res.ok) {
      notify.error(res.message || 'Could not stop the subscription.')
      return
    }
    notify.success(res.message || 'Subscription stopped.')
    invalidate('devices', 'subscriptions')
    onDone?.()
    onClose()
  }
  return (
    <ConfirmDialog
      open={Boolean(device)}
      onClose={onClose}
      onConfirm={confirm}
      loading={submitting}
      title="Stop subscription?"
      confirmLabel="Stop subscription"
      description="This device's subscription will be stopped. You can activate it again later."
    >
      <div className="mt-4">
        <DeviceSummary device={device} />
      </div>
    </ConfirmDialog>
  )
}

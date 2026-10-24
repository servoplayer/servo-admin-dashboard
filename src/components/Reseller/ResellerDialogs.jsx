import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../ui/Button'
import Modal, { ConfirmDialog } from '../ui/Modal'
import { Field, Input, PasswordInput, Textarea } from '../ui/Field'
import { creditsApi, resellersApi } from '../../lib/services'
import { invalidate } from '../../lib/resource'
import { notify } from '../../lib/notify'
import { formatNumber } from '../../lib/format'
import { CREDITS_HINT } from '../../lib/resellers'

const EMPTY = { userName: '', email: '', password: '', subscriptionsNum: '' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values, isEdit) {
  const errors = {}
  if (!values.userName.trim()) errors.userName = 'Name is required.'
  if (!values.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (!isEdit && !values.password) errors.password = 'Password is required.'
  if (values.subscriptionsNum === '' || values.subscriptionsNum === null) errors.subscriptionsNum = 'Credits are required.'
  else if (!Number.isInteger(Number(values.subscriptionsNum)) || Number(values.subscriptionsNum) < 0)
    errors.subscriptionsNum = 'Use a whole number of 0 or more.'
  return errors
}

export function ResellerForm({ reseller, open, onClose }) {
  const isEdit = Boolean(reseller)
  const initial = useMemo(
    () =>
      reseller
        ? { userName: reseller.userName ?? '', email: reseller.email ?? '', password: '', subscriptionsNum: String(reseller.subscriptionsNum ?? '') }
        : EMPTY,
    [reseller],
  )
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(initial)
      setErrors({})
    }
  }, [open, initial])

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const submit = async () => {
    const found = validate(values, isEdit)
    setErrors(found)
    if (Object.keys(found).length) return
    setSubmitting(true)
    const body = {
      email: values.email.trim(),
      // Leaving the password blank while editing keeps the current one.
      password: values.password || undefined,
      userName: values.userName.trim(),
      subscriptionsNum: values.subscriptionsNum,
    }
    const res = isEdit ? await resellersApi.update(reseller._id, body) : await resellersApi.create(body)
    setSubmitting(false)
    if (!res.ok) {
      // Input is preserved so the admin can correct and resubmit.
      notify.error(res.message)
      return
    }
    notify.success(res.message || (isEdit ? 'Reseller updated.' : 'Reseller created.'))
    invalidate('resellers', 'stats')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      onSubmit={submit}
      title={isEdit ? 'Edit reseller' : 'New reseller'}
      description={isEdit ? `Update ${reseller.userName}'s account details and credits.` : 'Create a partner account that can activate Servo customers.'}
      footer={
        <>
          {isEdit && (
            <Button variant="ghost" className="sm:mr-auto" onClick={() => { setValues(initial); setErrors({}) }} disabled={submitting}>
              Reset changes
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting}>{isEdit ? 'Save changes' : 'Create reseller'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required error={errors.userName}>
          {(p) => <Input {...p} value={values.userName} onChange={set('userName')} autoComplete="off" placeholder="Reseller name" />}
        </Field>
        <Field label="Email" required error={errors.email}>
          {(p) => <Input {...p} type="email" value={values.email} onChange={set('email')} autoComplete="off" placeholder="name@company.com" />}
        </Field>
        <Field
          label="Password"
          required={!isEdit}
          error={errors.password}
          hint={isEdit ? 'Leave blank to keep the current password.' : 'The reseller uses this to sign in.'}
        >
          {(p) => <PasswordInput {...p} value={values.password} onChange={set('password')} autoComplete="new-password" />}
        </Field>
        <Field label="Credits" required error={errors.subscriptionsNum} hint={CREDITS_HINT}>
          {(p) => (
            <Input {...p} type="number" min="0" step="1" inputMode="numeric" value={values.subscriptionsNum} onChange={set('subscriptionsNum')} className="tabular" />
          )}
        </Field>
      </div>
    </Modal>
  )
}

export function BlockDialog({ reseller, onClose }) {
  const [busy, setBusy] = useState(false)
  const confirm = async () => {
    setBusy(true)
    const res = await resellersApi.toggleBlock(reseller._id)
    setBusy(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    notify.success(res.message || (reseller.block ? 'Reseller unblocked.' : 'Reseller blocked.'))
    invalidate('resellers', 'stats')
    onClose()
  }
  return (
    <ConfirmDialog
      open={Boolean(reseller)}
      onClose={onClose}
      onConfirm={confirm}
      loading={busy}
      tone={reseller?.block ? 'primary' : 'danger'}
      title={reseller?.block ? 'Unblock reseller?' : 'Block reseller?'}
      confirmLabel={reseller?.block ? 'Unblock' : 'Block reseller'}
      description={
        reseller?.block
          ? `${reseller?.userName} will be able to sign in and activate customers again.`
          : `${reseller?.userName} will be blocked from the reseller account until you unblock them.`
      }
    />
  )
}

const MAX_CHANGE = 10000

const newKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

/**
 * Adds or removes credits through the audited credit endpoints. Each change is
 * recorded in the credit history with who made it; a retry of the same
 * submission (same key) is never applied twice.
 */
export function CreditsDialog({ reseller, mode, onClose }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const keyRef = useRef('')
  const open = Boolean(reseller && mode)
  const balance = Number(reseller?.subscriptionsNum) || 0
  const adding = mode === 'add'

  useEffect(() => {
    if (open) {
      setAmount('')
      setNote('')
      setError('')
      keyRef.current = newKey()
    }
  }, [open, mode])

  const n = Number(amount)
  const valid = amount !== '' && Number.isInteger(n) && n > 0 && n <= MAX_CHANGE
  const next = valid ? (adding ? balance + n : balance - n) : balance

  const submit = async () => {
    if (busy) return
    if (!valid) return setError(`Enter a whole number from 1 to ${formatNumber(MAX_CHANGE)}.`)
    if (next < 0) return setError(`You can remove at most ${formatNumber(balance)} credits.`)
    setBusy(true)
    const call = adding ? creditsApi.recharge : creditsApi.deduct
    const res = await call(reseller._id, n, keyRef.current, note.trim())
    setBusy(false)
    if (!res.ok) {
      // The key is kept, so trying again cannot apply the change twice.
      notify.error(res.message)
      return
    }
    const tx = res.data?.transaction
    if (res.data?.duplicate) notify.info(res.message)
    else notify.success(`${reseller.userName} now has ${formatNumber(tx?.balanceAfter)} credits. Reference ${tx?.reference}.`)
    invalidate('resellers', 'stats', 'credit-tx')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      onSubmit={submit}
      size="sm"
      title={adding ? 'Add credits' : 'Remove credits'}
      description={`${reseller?.userName ?? ''} has ${formatNumber(balance)} credits. ${CREDITS_HINT}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant={adding ? 'primary' : 'danger'} loading={busy}>
            {adding ? 'Add credits' : 'Remove credits'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Amount" required error={error} hint={valid && next >= 0 ? `New balance: ${formatNumber(next)}` : undefined}>
          {(p) => (
            <Input
              {...p}
              type="number"
              min="1"
              max={MAX_CHANGE}
              step="1"
              inputMode="numeric"
              autoFocus
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setError('')
              }}
              className="tabular"
            />
          )}
        </Field>
        <Field label="Note" hint="Optional. Saved in the credit history.">
          {(p) => <Textarea {...p} rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </div>
    </Modal>
  )
}

/** Grants or revokes the distributor manager role (PUT /admin/distributorManager/:id). */
export function ManagerRoleDialog({ reseller, grant, onClose }) {
  const [busy, setBusy] = useState(false)
  const confirm = async () => {
    setBusy(true)
    const res = await creditsApi.setManager(reseller._id, grant)
    setBusy(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    notify.success(res.message)
    invalidate('resellers', 'managers', 'stats')
    onClose()
  }
  return (
    <ConfirmDialog
      open={Boolean(reseller)}
      onClose={onClose}
      onConfirm={confirm}
      loading={busy}
      tone={grant ? 'primary' : 'danger'}
      title={grant ? 'Make distributor manager?' : 'Remove distributor manager role?'}
      confirmLabel={grant ? 'Grant role' : 'Revoke role'}
      description={
        grant
          ? `${reseller?.userName} will sign in to the reseller portal as a distributor manager: they can view resellers and their balances, recharge them, and see the credit history. They will no longer be able to activate customers. They get no administrator access.`
          : `${reseller?.userName} goes back to being a regular reseller and loses access to recharging and the credit history.`
      }
    />
  )
}

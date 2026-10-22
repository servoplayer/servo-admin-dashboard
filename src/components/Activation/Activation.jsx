import { useEffect, useState } from 'react'
import { KeyRound, Tag } from 'lucide-react'
import { Card, CardHeader, PageHeader } from '../ui/Card'
import Button from '../ui/Button'
import { Field, Input, PasswordInput } from '../ui/Field'
import { Callout, Skeleton } from '../ui/States'
import { pricingApi } from '../../lib/services'
import { invalidate } from '../../lib/resource'
import { notify } from '../../lib/notify'
import { priceValue, usePaymentKeys, usePrice } from '../../lib/dashboardData'

function PriceCard() {
  const price = usePrice()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const saved = priceValue(price.data)

  useEffect(() => {
    if (saved !== undefined && saved !== null) setValue(String(saved))
  }, [saved])

  const submit = async (e) => {
    e.preventDefault()
    if (value === '' || Number.isNaN(Number(value)) || Number(value) <= 0) {
      setError('Enter a price greater than 0.')
      return
    }
    setSaving(true)
    const res = await pricingApi.setPrice(value)
    setSaving(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    notify.success(res.message || 'Activation price saved.')
    invalidate('price')
  }

  const dirty = value !== (saved === undefined || saved === null ? '' : String(saved))

  return (
    <Card>
      <CardHeader icon={Tag} title="Activation price" description="Yearly subscription price customers pay to activate Servo." />
      <form onSubmit={submit} noValidate className="p-4 sm:p-5">
        {price.loading ? (
          <Skeleton className="h-10 w-full max-w-xs" />
        ) : (
          <Field label="Price per year" required error={error || (price.error && !price.data ? `Couldn't load the current price: ${price.error}` : '')}>
            {(p) => (
              <Input
                {...p}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setError('')
                }}
                className="max-w-xs tabular"
              />
            )}
          </Field>
        )}
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-line pt-4">
          {dirty && !saving && <p className="mr-auto text-xs text-muted">Unsaved changes</p>}
          <Button type="submit" loading={saving} disabled={price.loading || !dirty}>Save price</Button>
        </div>
      </form>
    </Card>
  )
}

function KeysCard() {
  const keys = usePaymentKeys()
  const [publishableKey, setPublishableKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const k = keys.data?.keys
    if (k) {
      setPublishableKey(k.publishableKey ?? '')
      setSecretKey(k.secretKey ?? '')
    }
  }, [keys.data])

  const missing = keys.status === 404 || (keys.data && !(keys.data.keys?.publishableKey && keys.data.keys?.secretKey))

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!publishableKey.trim()) found.publishableKey = 'Publishable key is required.'
    if (!secretKey.trim()) found.secretKey = 'Secret key is required.'
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const res = await pricingApi.setKeys(publishableKey.trim(), secretKey.trim())
    setSaving(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    notify.success(res.message || 'Payment keys saved.')
    invalidate('keys')
  }

  return (
    <Card>
      <CardHeader icon={KeyRound} title="Payment keys" description="Payment provider keys used to charge customers for activations." />
      <form onSubmit={submit} noValidate className="space-y-4 p-4 sm:p-5">
        {missing && !keys.loading && (
          <Callout tone="danger" title="Payments are not configured">
            Customers can&apos;t pay for activations until both keys are saved.
          </Callout>
        )}
        {keys.error && keys.status !== 404 && (
          <Callout tone="warning" title="Couldn't load the saved keys">{keys.error}</Callout>
        )}
        {keys.loading ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : (
          <>
            <Field label="Publishable key" required error={errors.publishableKey}>
              {(p) => (
                <Input
                  {...p}
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
            <Field label="Secret key" required error={errors.secretKey} hint="Hidden by default. Never share this key.">
              {(p) => (
                <PasswordInput
                  {...p}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
          </>
        )}
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" loading={saving} disabled={keys.loading}>Save keys</Button>
        </div>
      </form>
    </Card>
  )
}

export default function Activation() {
  return (
    <>
      <PageHeader title="Pricing & payments" description="What customers pay for Servo and how payments are collected." />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <PriceCard />
        <KeysCard />
      </div>
    </>
  )
}

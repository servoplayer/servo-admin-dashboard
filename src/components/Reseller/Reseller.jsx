import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ban, Eye, Pencil, Plus, ShieldCheck, Users } from 'lucide-react'
import { Card, PageHeader } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal, { ConfirmDialog } from '../ui/Modal'
import { Field, Input, PasswordInput, SearchInput } from '../ui/Field'
import { EmptyState, ErrorState } from '../ui/States'
import { SkeletonRows, Table, TableMessage, Td, Th, Tr } from '../ui/Table'
import { resellersApi } from '../../lib/services'
import { invalidate, useResource } from '../../lib/resource'
import { notify } from '../../lib/notify'
import { formatDate, formatNumber } from '../../lib/format'

const EMPTY = { userName: '', email: '', password: '', subscriptionsNum: '' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values, isEdit) {
  const errors = {}
  if (!values.userName.trim()) errors.userName = 'Name is required.'
  if (!values.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (!isEdit && !values.password) errors.password = 'Password is required.'
  if (values.subscriptionsNum === '' || values.subscriptionsNum === null) errors.subscriptionsNum = 'Customer limit is required.'
  else if (!Number.isInteger(Number(values.subscriptionsNum)) || Number(values.subscriptionsNum) < 0)
    errors.subscriptionsNum = 'Use a whole number of 0 or more.'
  return errors
}

function ResellerForm({ reseller, open, onClose, onSaved }) {
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
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      onSubmit={submit}
      title={isEdit ? 'Edit reseller' : 'New reseller'}
      description={isEdit ? `Update ${reseller.userName}'s account details and customer limit.` : 'Create a partner account that can activate Servo customers.'}
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
        <Field label="Customer limit" required error={errors.subscriptionsNum} hint="Maximum number of customers this reseller can activate.">
          {(p) => (
            <Input {...p} type="number" min="0" step="1" inputMode="numeric" value={values.subscriptionsNum} onChange={set('subscriptionsNum')} className="tabular" />
          )}
        </Field>
      </div>
    </Modal>
  )
}

export default function Reseller() {
  const [params, setParams] = useSearchParams()
  const resellers = useResource('resellers', resellersApi.list)
  const [search, setSearch] = useState('')
  const [formFor, setFormFor] = useState(null) // null = closed, {} = new, reseller = edit
  const [blockTarget, setBlockTarget] = useState(null)
  const [blocking, setBlocking] = useState(false)

  // Deep link from quick actions: /layout/reseller?new=1
  useEffect(() => {
    if (params.get('new') === '1') {
      setFormFor({})
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('new')
        return next
      }, { replace: true })
    }
  }, [params, setParams])

  const all = resellers.data?.allResellers ?? []
  const q = search.trim().toLowerCase()
  const rows = q
    ? all.filter((r) => r?.userName?.toLowerCase().includes(q) || r?.email?.toLowerCase().includes(q))
    : all

  const confirmBlock = async () => {
    setBlocking(true)
    const res = await resellersApi.toggleBlock(blockTarget._id)
    setBlocking(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    notify.success(res.message || (blockTarget.block ? 'Reseller unblocked.' : 'Reseller blocked.'))
    setBlockTarget(null)
    invalidate('resellers')
  }

  return (
    <>
      <PageHeader
        title="Resellers"
        description="Partner accounts that activate Servo for their own customers."
        actions={<Button icon={Plus} onClick={() => setFormFor({})}>New reseller</Button>}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email" className="w-full sm:max-w-sm" />
          {!resellers.loading && !resellers.error && (
            <p className="text-xs text-muted tabular">
              {q ? `${rows.length} of ${formatNumber(all.length)} resellers` : `${formatNumber(all.length)} resellers`}
            </p>
          )}
        </div>
        <Table caption="Resellers" minWidth={0}>
          <thead>
            <tr>
              <Th>Reseller</Th>
              <Th align="right" className="hidden md:table-cell">Customer limit</Th>
              <Th className="hidden lg:table-cell">Created</Th>
              <Th className="hidden sm:table-cell">Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {resellers.loading ? (
              <SkeletonRows cols={5} />
            ) : resellers.error ? (
              <TableMessage cols={5}>
                <ErrorState message={resellers.error} onRetry={resellers.reload} />
              </TableMessage>
            ) : rows.length === 0 ? (
              <TableMessage cols={5}>
                {q ? (
                  <EmptyState title="No matching resellers" description="Try a different name or email." />
                ) : (
                  <EmptyState
                    icon={Users}
                    title="No resellers yet"
                    description="Create a reseller account to let partners activate customers."
                    action={<Button size="sm" icon={Plus} onClick={() => setFormFor({})}>New reseller</Button>}
                  />
                )}
              </TableMessage>
            ) : (
              rows.map((item) => (
                <Tr key={item._id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold uppercase text-brand">
                        {(item.userName || item.email || '?').charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.userName}</p>
                        <p className="truncate text-xs text-muted">{item.email}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted sm:hidden">
                          {item.block ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}
                          Limit {formatNumber(item.subscriptionsNum)}
                        </p>
                        <p className="mt-0.5 hidden text-xs text-muted sm:block md:hidden">Limit {formatNumber(item.subscriptionsNum)}</p>
                      </div>
                    </div>
                  </Td>
                  <Td align="right" className="hidden font-semibold tabular md:table-cell">{formatNumber(item.subscriptionsNum)}</Td>
                  <Td className="hidden whitespace-nowrap text-muted lg:table-cell">{formatDate(item.currentDate)}</Td>
                  <Td className="hidden sm:table-cell">
                    {item.block ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/layout/reseller/resellerCustomer/${item._id}`}
                        state={{ resellerName: item.userName }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-brand hover:bg-brand-soft"
                      >
                        <Eye size={15} aria-hidden="true" /> <span className="max-sm:sr-only">Customers</span>
                      </Link>
                      <Button size="icon-sm" variant="ghost" onClick={() => setFormFor(item)} aria-label={`Edit ${item.userName}`} title="Edit">
                        <Pencil size={15} />
                      </Button>
                      {item.block ? (
                        <Button size="sm" variant="ghost" icon={ShieldCheck} onClick={() => setBlockTarget(item)} aria-label={`Unblock ${item.userName}`}>
                          <span className="max-sm:sr-only">Unblock</span>
                        </Button>
                      ) : (
                        <Button size="sm" variant="danger-ghost" icon={Ban} onClick={() => setBlockTarget(item)} aria-label={`Block ${item.userName}`}>
                          <span className="max-sm:sr-only">Block</span>
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <ResellerForm
        open={formFor !== null}
        reseller={formFor && formFor._id ? formFor : null}
        onClose={() => setFormFor(null)}
        onSaved={() => invalidate('resellers')}
      />

      <ConfirmDialog
        open={Boolean(blockTarget)}
        onClose={() => setBlockTarget(null)}
        onConfirm={confirmBlock}
        loading={blocking}
        tone={blockTarget?.block ? 'primary' : 'danger'}
        title={blockTarget?.block ? 'Unblock reseller?' : 'Block reseller?'}
        confirmLabel={blockTarget?.block ? 'Unblock' : 'Block reseller'}
        description={
          blockTarget?.block
            ? `${blockTarget?.userName} will be able to sign in and activate customers again.`
            : `${blockTarget?.userName} will be blocked from the reseller account until you unblock them.`
        }
      />
    </>
  )
}

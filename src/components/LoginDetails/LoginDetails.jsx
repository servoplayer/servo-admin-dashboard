import { useEffect, useState } from 'react'
import { UserCog } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import Button from '../ui/Button'
import { Field, Input, PasswordInput } from '../ui/Field'
import { Skeleton } from '../ui/States'
import { useShell } from '../Layout/ShellContext'
import { authApi } from '../../lib/services'
import { notify } from '../../lib/notify'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginDetails() {
  const { admin, refreshAdmin } = useShell()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (admin) {
      setUserName(admin.userName ?? '')
      setUserEmail(admin.email ?? '')
    }
  }, [admin])

  const clearError = (key) => errors[key] && setErrors((e) => ({ ...e, [key]: undefined }))

  const handleUpdate = async (e) => {
    e.preventDefault()
    const found = {}
    if (!userName.trim()) found.userName = 'Name is required.'
    if (!userEmail.trim()) found.email = 'Email is required.'
    else if (!EMAIL_RE.test(userEmail.trim())) found.email = 'Enter a valid email address.'
    if (password !== confirmPassword) found.confirmPassword = 'Passwords do not match.'
    setErrors(found)
    if (Object.keys(found).length) return

    setIsLoading(true)
    const res = await authApi.update({
      userName: userName.trim(),
      email: userEmail.trim(),
      // Blank keeps the current password, as before.
      password: password || undefined,
    })
    setIsLoading(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    notify.success(res.message || 'Account updated.')
    setPassword('')
    setConfirmPassword('')
    refreshAdmin()
  }

  return (
    <Card>
      <CardHeader icon={UserCog} title="Login details" description="The name, email and password you use to sign in to this dashboard." />
      <form onSubmit={handleUpdate} noValidate className="space-y-4 p-4 sm:p-5">
        {!admin ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required error={errors.userName}>
              {(p) => <Input {...p} value={userName} onChange={(e) => { setUserName(e.target.value); clearError('userName') }} autoComplete="name" />}
            </Field>
            <Field label="Email" required error={errors.email}>
              {(p) => <Input {...p} type="email" value={userEmail} onChange={(e) => { setUserEmail(e.target.value); clearError('email') }} autoComplete="email" />}
            </Field>
          </div>
        )}
        <div className="border-t border-line pt-4">
          <p className="text-[13px] font-semibold text-fg">Change password</p>
          <p className="mb-3 text-xs text-muted">Leave both fields blank to keep your current password.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="New password">
              {(p) => <PasswordInput {...p} value={password} onChange={(e) => { setPassword(e.target.value); clearError('confirmPassword') }} autoComplete="new-password" />}
            </Field>
            <Field label="Confirm new password" error={errors.confirmPassword}>
              {(p) => <PasswordInput {...p} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword') }} autoComplete="new-password" />}
            </Field>
          </div>
        </div>
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" loading={isLoading} disabled={!admin}>Save changes</Button>
        </div>
      </form>
    </Card>
  )
}

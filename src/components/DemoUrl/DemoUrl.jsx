import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import Button from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Skeleton } from '../ui/States'
import { contentApi } from '../../lib/services'
import { notify } from '../../lib/notify'

const isUrl = (value) => {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function DemoUrl() {
  const [demoUrl, setDemoUrl] = useState('')
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    contentApi.getDemo({ signal: controller.signal }).then((res) => {
      if (res.aborted) return
      setLoading(false)
      if (res.ok) {
        const url = res.data?.demo?.url ?? ''
        setDemoUrl(url)
        setSaved(url)
      } else if (res.status !== 404) {
        setLoadError(res.message)
      }
    })
    return () => controller.abort()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const url = demoUrl.trim()
    if (!url) return setError('URL is required.')
    if (!isUrl(url)) return setError('Enter a full URL starting with http:// or https://')
    setIsLoading(true)
    const res = await contentApi.setDemo(url)
    setIsLoading(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    setSaved(url)
    notify.success(res.message || 'Demo URL saved.')
  }

  return (
    <Card>
      <CardHeader icon={Link2} title="Demo M3U URL" description="Default demo playlist URL for Servo." />
      <form onSubmit={handleAdd} noValidate className="space-y-4 p-4 sm:p-5">
        {loading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Field
            label="Playlist URL"
            required
            error={error || (loadError ? `Couldn't load the saved URL: ${loadError}` : '')}
          >
            {(p) => (
              <Input
                {...p}
                type="url"
                inputMode="url"
                spellCheck={false}
                value={demoUrl}
                onChange={(e) => {
                  setDemoUrl(e.target.value)
                  setError('')
                }}
                placeholder="https://example.com/playlist.m3u"
                className="font-mono text-[13px]"
              />
            )}
          </Field>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          {demoUrl.trim() !== saved && !isLoading && <p className="mr-auto text-xs text-muted">Unsaved changes</p>}
          <Button type="submit" loading={isLoading} disabled={loading || demoUrl.trim() === saved}>Save URL</Button>
        </div>
      </form>
    </Card>
  )
}

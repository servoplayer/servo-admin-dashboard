import { useEffect, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { Card, CardHeader } from '../ui/Card'
import Button from '../ui/Button'
import { ErrorState, Skeleton } from '../ui/States'
import { contentApi } from '../../lib/services'
import { notify } from '../../lib/notify'

const MODULES = {
  toolbar: [
    [{ header: [1, 2, false] }, { font: [] }, { size: [] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'clean'],
  ],
}

/** Loads and saves one footer page (`Terms_Conditions`, `Privacy_Policy`). */
export default function RichPageEditor({ page, title, description, icon }) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    contentApi.getPage(page, { signal: controller.signal }).then((res) => {
      if (res.aborted) return
      setLoading(false)
      if (res.ok) {
        setHtml(res.data?.footerContent?.content ?? '')
        setDirty(false)
      } else if (res.status === 404) {
        // Page not created yet: start from an empty editor.
        setHtml('')
      } else {
        setLoadError(res.message)
      }
    })
    return () => controller.abort()
  }, [page, version])

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const save = async () => {
    setSaving(true)
    const res = await contentApi.savePage(page, html)
    setSaving(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    setDirty(false)
    notify.success(res.message || `${title} saved.`)
  }

  return (
    <Card>
      <CardHeader
        icon={icon}
        title={title}
        description={description}
        actions={
          <>
            {dirty && !saving && <span className="text-xs font-medium text-warning">Unsaved changes</span>}
            <Button onClick={save} loading={saving} disabled={loading || Boolean(loadError) || !dirty}>Save</Button>
          </>
        }
      />
      {loading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => setVersion((v) => v + 1)} className="py-10" />
      ) : (
        <div className="servo-editor">
          <ReactQuill
            theme="snow"
            value={html}
            modules={MODULES}
            onChange={(value, _delta, source) => {
              setHtml(value)
              if (source === 'user') setDirty(true)
            }}
          />
        </div>
      )}
    </Card>
  )
}

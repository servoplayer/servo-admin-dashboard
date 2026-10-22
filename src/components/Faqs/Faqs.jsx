import { useEffect, useState } from 'react'
import { ChevronDown, HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import Button from '../ui/Button'
import Modal, { ConfirmDialog } from '../ui/Modal'
import { Field, Input, SearchInput, Textarea } from '../ui/Field'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { contentApi } from '../../lib/services'
import { notify } from '../../lib/notify'
import { cx } from '../ui/cx'

function FaqForm({ faq, open, onClose, onSaved }) {
  const isEdit = Boolean(faq?._id)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setQuestion(faq?.question ?? '')
      setAnswer(faq?.answer ?? '')
      setErrors({})
    }
  }, [open, faq])

  const submit = async () => {
    const found = {}
    if (!question.trim()) found.question = 'Question is required.'
    if (!answer.trim()) found.answer = 'Answer is required.'
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const res = isEdit
      ? await contentApi.updateFaq(faq._id, question.trim(), answer.trim())
      : await contentApi.addFaq(question.trim(), answer.trim())
    setSaving(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    notify.success(res.message || (isEdit ? 'FAQ updated.' : 'FAQ added.'))
    onSaved(res.data?.allFaq)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      onSubmit={submit}
      size="lg"
      title={isEdit ? 'Edit FAQ' : 'New FAQ'}
      description="Shown in the help section for Servo customers."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>{isEdit ? 'Save changes' : 'Add FAQ'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Question" required error={errors.question}>
          {(p) => <Input {...p} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How do I add a playlist?" />}
        </Field>
        <Field label="Answer" required error={errors.answer}>
          {(p) => <Textarea {...p} rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write a clear, short answer." />}
        </Field>
      </div>
    </Modal>
  )
}

export default function Faqs() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [openIndex, setOpenIndex] = useState(null)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null closed, {} new, faq edit
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    contentApi.getFaqs({ signal: controller.signal }).then((res) => {
      if (res.aborted) return
      setLoading(false)
      if (res.ok) setFaqs(res.data?.allFaq ?? [])
      else setError(res.message)
    })
    return () => controller.abort()
  }, [version])

  // Mutations return the full list; fall back to refetching if they don't.
  const applyList = (list) => (Array.isArray(list) ? setFaqs(list) : setVersion((v) => v + 1))

  const confirmDelete = async () => {
    setDeleteBusy(true)
    const res = await contentApi.deleteFaq(deleting._id)
    setDeleteBusy(false)
    if (!res.ok) {
      notify.error(res.message)
      return
    }
    notify.success(res.message || 'FAQ deleted.')
    setDeleting(null)
    setOpenIndex(null)
    applyList(res.data?.allFaq)
  }

  const q = search.trim().toLowerCase()
  const rows = q
    ? faqs.filter((f) => f?.question?.toLowerCase().includes(q) || f?.answer?.toLowerCase().includes(q))
    : faqs

  return (
    <Card>
      <CardHeader
        icon={HelpCircle}
        title="Frequently asked questions"
        description={loading ? 'Loading…' : `${faqs.length} question${faqs.length === 1 ? '' : 's'} published.`}
        actions={<Button icon={Plus} onClick={() => setEditing({})}>New FAQ</Button>}
      />
      {faqs.length > 5 && (
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search questions and answers" className="sm:max-w-sm" />
        </div>
      )}
      {loading ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => setVersion((v) => v + 1)} className="py-10" />
      ) : rows.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={HelpCircle}
          title={q ? 'No matching questions' : 'No FAQs yet'}
          description={q ? 'Try different keywords.' : 'Add answers to the questions customers ask most.'}
          action={!q && <Button size="sm" icon={Plus} onClick={() => setEditing({})}>New FAQ</Button>}
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((faq, index) => {
            const isOpen = openIndex === index
            const panelId = `faq-panel-${faq._id ?? index}`
            return (
              <li key={faq._id ?? index}>
                <div className="flex items-center gap-2 px-4 py-1.5 sm:px-5">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2.5 text-left"
                  >
                    <ChevronDown
                      size={17}
                      className={cx('shrink-0 text-subtle transition-transform', isOpen && 'rotate-180 text-brand')}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-fg">{faq.question}</span>
                  </button>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditing(faq)} aria-label={`Edit: ${faq.question}`} title="Edit">
                    <Pencil size={15} />
                  </Button>
                  <Button size="icon-sm" variant="danger-ghost" onClick={() => setDeleting(faq)} aria-label={`Delete: ${faq.question}`} title="Delete">
                    <Trash2 size={15} />
                  </Button>
                </div>
                {isOpen && (
                  <div id={panelId} className="px-4 pb-4 pl-12 sm:px-5 sm:pl-[52px]">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{faq.answer}</p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <FaqForm
        open={editing !== null}
        faq={editing}
        onClose={() => setEditing(null)}
        onSaved={applyList}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="Delete this FAQ?"
        confirmLabel="Delete FAQ"
        description={deleting ? `“${deleting.question}” will be removed for all customers. This can't be undone.` : ''}
      />
    </Card>
  )
}

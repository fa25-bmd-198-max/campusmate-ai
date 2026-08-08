import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { supabase } from '@/services/supabase'
import { useAuthContext } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import type { ContentType } from '@/types/database.types'

interface ReportButtonProps {
  contentType: ContentType
  contentId:   string
  /** Optional label shown alongside flag icon */
  label?:      string
  className?:  string
}

/**
 * Renders a "Report" button. Clicking opens a modal where the user
 * enters a reason; on submit it inserts a row into the `reports` table.
 * Used on NoteDetailPage, GroupDetailPage, and ProfilePage.
 */
export default function ReportButton({
  contentType,
  contentId,
  label,
  className,
}: ReportButtonProps) {
  const { user }       = useAuthContext()
  const [open,   setOpen]   = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!user || reason.trim().length < 10) {
      toast.error('Please provide a reason (at least 10 characters).')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id:  user.id,
        content_type: contentType,
        content_id:   contentId,
        reason:       reason.trim(),
      })
      if (error) throw error
      toast.success('Report submitted. Our team will review it shortly.')
      setOpen(false)
      setReason('')
    } catch {
      toast.error('Could not submit report. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving) return
    setOpen(false)
    setReason('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Report this ${contentType}`}
        className={`flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors dark:text-gray-600 dark:hover:text-red-400 ${className ?? ''}`}
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        {label ?? 'Report'}
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title={`Report ${contentType}`}
        description="Help us understand what's wrong with this content."
        persistent={saving}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button variant="danger" onClick={handleSubmit} loading={saving}
              leftIcon={<Flag className="h-4 w-4" />}>
              Submit report
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              disabled={saving}
              placeholder="Please describe what is inappropriate or problematic about this content (minimum 10 characters)…"
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 disabled:opacity-60"
            />
            <p className={`mt-1 text-right text-xs ${reason.trim().length < 10 && reason.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {reason.trim().length}/10 minimum
            </p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-600">
            False reports may result in account review.
          </p>
        </div>
      </Modal>
    </>
  )
}

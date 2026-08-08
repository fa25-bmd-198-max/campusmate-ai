import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin   from '@fullcalendar/daygrid'
import timeGridPlugin  from '@fullcalendar/timegrid'
import listPlugin      from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core'
import type { EventInput } from '@fullcalendar/core'
import {
  Plus, X, Edit2, Trash2, AlertTriangle, Clock, Calendar,
} from 'lucide-react'
import { Badge, Button, Input, Modal, Spinner } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import {
  getEvents, createEvent, updateEvent, deleteEvent,
  eventTypeColor, isAIGeneratedEvent, EVENT_TYPE_LABELS,
  type CreateEventParams,
} from '@/services/calendarService'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { CalendarEventRow, EventType } from '@/types/database.types'

// ── Query key ─────────────────────────────────────────────────
const calKey = (uid: string) => ['calendar_events', uid] as const

// ── Event type options ─────────────────────────────────────────
const EVENT_TYPES: EventType[] = ['exam', 'assignment', 'study', 'meeting', 'reminder']

// ── Colour pill for badges ────────────────────────────────────
const TYPE_BADGE_COLOR: Record<EventType, 'error' | 'warning' | 'info' | 'secondary' | 'default'> = {
  exam:       'error',
  assignment: 'warning',
  study:      'info',
  meeting:    'secondary',
  reminder:   'default',
}

// ─────────────────────────────────────────────────────────────
// Event creation / edit modal
// ─────────────────────────────────────────────────────────────
interface EventModalProps {
  open:          boolean
  onClose:       () => void
  initial?:      CalendarEventRow   // present when editing
  defaultDate?:  string             // pre-fill from calendar click
  onSaved:       (event: CalendarEventRow) => void
}

function EventModal({ open, onClose, initial, defaultDate, onSaved }: EventModalProps) {
  const { user } = useAuthContext()
  const isEdit   = !!initial

  const [title,     setTitle]     = useState(initial?.title     ?? '')
  const [eventType, setEventType] = useState<EventType>(initial?.event_type ?? 'reminder')
  const [startDate, setStartDate] = useState(
    initial?.starts_at
      ? initial.starts_at.slice(0, 10)
      : (defaultDate ?? new Date().toISOString().slice(0, 10)),
  )
  const [startTime, setStartTime] = useState(
    initial?.starts_at ? initial.starts_at.slice(11, 16) : '09:00',
  )
  const [endDate,   setEndDate]   = useState(
    initial?.ends_at ? initial.ends_at.slice(0, 10) : startDate,
  )
  const [endTime,   setEndTime]   = useState(
    initial?.ends_at ? initial.ends_at.slice(11, 16) : '10:00',
  )
  const [notes,     setNotes]     = useState(initial?.notes ?? '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const validate = (): string | null => {
    if (!title.trim())    return 'Title is required.'
    const start = new Date(`${startDate}T${startTime}`)
    const end   = new Date(`${endDate}T${endTime}`)
    if (isNaN(start.getTime())) return 'Invalid start date/time.'
    if (end <= start)           return 'End time must be after start time.'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    if (!user) return

    setSaving(true)
    setError(null)

    const startsAt = new Date(`${startDate}T${startTime}`).toISOString()
    const endsAt   = new Date(`${endDate}T${endTime}`).toISOString()

    try {
      let saved: CalendarEventRow
      if (isEdit) {
        saved = await updateEvent(initial!.id, {
          title: title.trim(), eventType, startsAt, endsAt,
          notes: notes.trim() || null, groupId: initial?.group_id ?? null,
        })
      } else {
        const params: CreateEventParams = {
          userId: user.id, title: title.trim(), eventType,
          startsAt, endsAt, notes: notes.trim() || null, groupId: null,
        }
        saved = await createEvent(params)
      }
      onSaved(saved)
      onClose()
      toast.success(isEdit ? 'Event updated' : 'Event created')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit event' : 'New event'}
      persistent={saving}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            {isEdit ? 'Save changes' : 'Create event'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Calculus exam, Study session"
          required
          disabled={saving}
        />

        {/* Event type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Event type
          </label>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEventType(t)}
                disabled={saving}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                  eventType === t
                    ? 'text-white border-transparent'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
                )}
                style={eventType === t ? { backgroundColor: eventTypeColor(t), borderColor: eventTypeColor(t) } : {}}
              >
                {EVENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Date / time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Start date</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (!endDate || e.target.value > endDate) setEndDate(e.target.value) }}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Start time</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              min={startDate} disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">End time</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            disabled={saving} placeholder="Additional details…"
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Event detail popover (click on existing event)
// ─────────────────────────────────────────────────────────────
interface EventDetailProps {
  event:    CalendarEventRow
  position: { top: number; left: number }
  onClose:  () => void
  onEdit:   () => void
  onDelete: () => void
}

function EventDetailPopover({ event, position, onClose, onEdit, onDelete }: EventDetailProps) {
  const isAI = isAIGeneratedEvent(event)

  return (
    <>
      {/* Invisible overlay to close on outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="Event details"
        className="fixed z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-modal dark:border-gray-700 dark:bg-gray-900"
        style={{ top: position.top, left: position.left }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
              {event.title}
            </p>
            <Badge color={TYPE_BADGE_COLOR[event.event_type]} size="sm" className="mt-1">
              {EVENT_TYPE_LABELS[event.event_type]}
            </Badge>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="shrink-0 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Times */}
        <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
          <p className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span>
              {new Date(event.starts_at).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              {event.ends_at && (
                <span className="text-gray-400">
                  {' – '}
                  {new Date(event.ends_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </span>
          </p>
          {event.notes && (
            <p className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="line-clamp-3">{event.notes}</span>
            </p>
          )}
        </div>

        {/* AI-plan warning */}
        {isAI && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This session was created by your study plan. Deleting it will not regenerate a replacement.
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Edit2 className="h-3.5 w-3.5" />} onClick={onEdit} className="flex-1">
            Edit
          </Button>
          <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={onDelete} className="flex-1">
            Delete
          </Button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Main CalendarPage
// ─────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()
  const calendarRef = useRef<FullCalendar | null>(null)

  // ── Data ───────────────────────────────────────────────────
  const { data: events = [], isLoading } = useQuery({
    queryKey: calKey(user?.id ?? ''),
    queryFn:  () => getEvents(user!.id),
    enabled:  !!user?.id,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calKey(user!.id) }),
  })

  // ── Local UI state ─────────────────────────────────────────
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEventRow | null>(null)
  const [defaultDate,  setDefaultDate]  = useState<string | undefined>()
  const [selectedEvent,setSelectedEvent]= useState<CalendarEventRow | null>(null)
  const [popoverPos,   setPopoverPos]   = useState({ top: 0, left: 0 })
  const [confirmDelete,setConfirmDelete]= useState<CalendarEventRow | null>(null)

  // ── Convert DB rows → FullCalendar EventInput ──────────────
  const fcEvents: EventInput[] = events.map((ev) => ({
    id:              ev.id,
    title:           ev.title,
    start:           ev.starts_at,
    end:             ev.ends_at ?? undefined,
    backgroundColor: eventTypeColor(ev.event_type),
    borderColor:     eventTypeColor(ev.event_type),
    extendedProps:   { dbRow: ev },
  }))

  // ── Handlers ───────────────────────────────────────────────
  const handleDateSelect = useCallback((info: DateSelectArg) => {
    setEditingEvent(null)
    setDefaultDate(info.startStr.slice(0, 10))
    setSelectedEvent(null)
    setModalOpen(true)
  }, [])

  const handleEventClick = useCallback((info: EventClickArg) => {
    const dbRow = info.event.extendedProps.dbRow as CalendarEventRow
    const rect  = info.el.getBoundingClientRect()
    // Position the popover below the event, constrained to viewport
    const top  = Math.min(rect.bottom + window.scrollY + 4, window.innerHeight - 280)
    const left = Math.min(rect.left + window.scrollX, window.innerWidth - 296)
    setPopoverPos({ top, left })
    setSelectedEvent(dbRow)
  }, [])

  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const dbRow = info.event.extendedProps.dbRow as CalendarEventRow
    try {
      await updateEvent(dbRow.id, { startsAt: info.event.startStr })
      queryClient.invalidateQueries({ queryKey: calKey(user!.id) })
    } catch {
      info.revert()
      toast.error('Could not move event')
    }
  }, [queryClient, user])

  const openEdit = useCallback(() => {
    if (!selectedEvent) return
    setEditingEvent(selectedEvent)
    setDefaultDate(undefined)
    setSelectedEvent(null)
    setModalOpen(true)
  }, [selectedEvent])

  const openDeleteConfirm = useCallback(() => {
    if (!selectedEvent) return
    setConfirmDelete(selectedEvent)
    setSelectedEvent(null)
  }, [selectedEvent])

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return
    await deleteMut.mutateAsync(confirmDelete.id)
    setConfirmDelete(null)
    toast.success('Event deleted')
  }

  const handleSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: calKey(user!.id) })
  }, [queryClient, user])

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="mt-0.5 text-body text-gray-500 dark:text-gray-400">
            All your exams, sessions, assignments, and meetings in one place
          </p>
        </div>
        <Button
          onClick={() => { setEditingEvent(null); setDefaultDate(undefined); setModalOpen(true) }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add event
        </Button>
      </div>

      {/* Colour legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {EVENT_TYPES.map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: eventTypeColor(t) }} />
            {EVENT_TYPE_LABELS[t]}
          </span>
        ))}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="lg" color="primary" />
        </div>
      )}

      {/* FullCalendar */}
      {!isLoading && (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200 bg-white p-2 shadow-card dark:border-gray-800 dark:bg-gray-900 [&_.fc]:h-full [&_.fc-toolbar-title]:text-gray-900 dark:[&_.fc-toolbar-title]:text-gray-100 [&_.fc-button]:bg-primary-600 [&_.fc-button]:border-primary-600 [&_.fc-button:hover]:bg-primary-700 [&_.fc-button-active]:bg-primary-800 [&_.fc-today-button]:bg-gray-100 dark:[&_.fc-today-button]:bg-gray-800 [&_.fc-today-button]:text-gray-700 dark:[&_.fc-today-button]:text-gray-300 [&_.fc-today-button]:border-gray-300 dark:[&_.fc-today-button]:border-gray-700 [&_.fc-col-header-cell]:text-gray-600 dark:[&_.fc-col-header-cell]:text-gray-400 [&_.fc-daygrid-day-number]:text-gray-600 dark:[&_.fc-daygrid-day-number]:text-gray-400 [&_.fc-day-today]:bg-primary-50 dark:[&_.fc-day-today]:bg-primary-900\/20">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left:   'prev,next today',
              center: 'title',
              right:  'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            buttonText={{
              today:        'Today',
              month:        'Month',
              week:         'Week',
              day:          'Day',
              list:         'List',
            }}
            events={fcEvents}
            selectable
            selectMirror
            editable
            dayMaxEvents={3}
            height="100%"
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          />
        </div>
      )}

      {/* Event create/edit modal */}
      {modalOpen && (
        <EventModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingEvent(null) }}
          initial={editingEvent ?? undefined}
          defaultDate={defaultDate}
          onSaved={handleSaved}
        />
      )}

      {/* Event detail popover */}
      {selectedEvent && (
        <EventDetailPopover
          event={selectedEvent}
          position={popoverPos}
          onClose={() => setSelectedEvent(null)}
          onEdit={openEdit}
          onDelete={openDeleteConfirm}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete event?"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirmed} loading={deleteMut.isPending}>
              Delete
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-body text-gray-600 dark:text-gray-400">
            <strong>"{confirmDelete?.title}"</strong> will be permanently deleted.
          </p>
          {/* 3.5.7 — AI-plan warning */}
          {confirmDelete && isAIGeneratedEvent(confirmDelete) && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This session was created by your study plan. Deleting it will not regenerate a replacement.
              </span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

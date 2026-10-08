import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createLesson,
  createUnit,
  deleteLesson,
  deleteUnit,
  getLessons,
  getNextPublishStatus,
  getUnits,
  renameLesson,
  renameUnit,
  setLessonStatus,
  setUnitStatus,
} from '../lib/curriculumRepository'
import { StatusBadge } from './StatusBadge'
import type { Id, Lesson, PublishStatus, Unit } from '../types/entities'

const NEXT_STATUS_LABEL: Record<PublishStatus, string> = {
  draft: 'اعتماد',
  reviewed: 'نشر',
  published: '',
}

interface RowActionsProps {
  status: PublishStatus
  onAdvanceStatus: () => void
  onEdit: () => void
  onDelete: () => void
}

function RowActions({ status, onAdvanceStatus, onEdit, onDelete }: RowActionsProps) {
  const next = getNextPublishStatus(status)
  return (
    <div className="flex shrink-0 gap-2">
      {next && (
        <button
          onClick={onAdvanceStatus}
          className="rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700"
        >
          {NEXT_STATUS_LABEL[status]}
        </button>
      )}
      <button
        onClick={onEdit}
        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
      >
        تعديل
      </button>
      <button
        onClick={onDelete}
        className="rounded-md bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
      >
        حذف
      </button>
    </div>
  )
}

interface LessonRowProps {
  lesson: Lesson
  onChanged: () => void
}

function LessonRow({ lesson, onChanged }: LessonRowProps) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(lesson.title)

  async function saveEdit() {
    await renameLesson(lesson.id, draftTitle.trim() || lesson.title)
    setEditing(false)
    onChanged()
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 pr-6 last:border-0">
      {editing ? (
        <input
          autoFocus
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      ) : (
        <Link to={`/admin/lessons/${lesson.id}`} className="flex-1 text-sm text-gray-800 hover:text-purple-700">
          {lesson.title}
        </Link>
      )}
      <StatusBadge status={lesson.status} />
      <RowActions
        status={lesson.status}
        onAdvanceStatus={async () => {
          const next = getNextPublishStatus(lesson.status)
          if (next) await setLessonStatus(lesson.id, next)
          onChanged()
        }}
        onEdit={() => setEditing(true)}
        onDelete={async () => {
          await deleteLesson(lesson.id)
          onChanged()
        }}
      />
    </div>
  )
}

function AddLessonForm({ unitId, onAdded, onCancel }: { unitId: Id; onAdded: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState('درس')
  const [pages, setPages] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await createLesson(unitId, { title: title.trim(), contentType, pages })
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-dashed border-gray-300 p-3">
      <input
        autoFocus
        placeholder="اسم الدرس"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <input
          placeholder="نوع المحتوى (درس/استماع/تقويم...)"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <input
          placeholder="الصفحات (مثال 12-17)"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
        >
          إضافة
        </button>
        <button onClick={onCancel} className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          إلغاء
        </button>
      </div>
    </div>
  )
}

interface UnitBlockProps {
  unit: Unit
  refreshKey: number
  onChanged: () => void
}

function UnitBlock({ unit, refreshKey, onChanged }: UnitBlockProps) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(unit.title)
  const [expanded, setExpanded] = useState(true)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [addingLesson, setAddingLesson] = useState(false)

  useEffect(() => {
    getLessons(unit.id).then(setLessons)
  }, [unit.id, refreshKey])

  async function saveEdit() {
    await renameUnit(unit.id, draftTitle.trim() || unit.title)
    setEditing(false)
    onChanged()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 p-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="طي/فتح"
        >
          {expanded ? '▼' : '◀'}
        </button>
        {editing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-semibold"
          />
        ) : (
          <span className="flex-1 font-semibold text-gray-900">{unit.title}</span>
        )}
        <StatusBadge status={unit.status} />
        <RowActions
          status={unit.status}
          onAdvanceStatus={async () => {
            const next = getNextPublishStatus(unit.status)
            if (next) await setUnitStatus(unit.id, next)
            onChanged()
          }}
          onEdit={() => setEditing(true)}
          onDelete={async () => {
            await deleteUnit(unit.id)
            onChanged()
          }}
        />
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-3 pr-10">
          {lessons.length > 0 && <div className="pt-2 text-xs font-semibold text-gray-400">الدروس</div>}
          {lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} onChanged={onChanged} />
          ))}
          {addingLesson ? (
            <AddLessonForm
              unitId={unit.id}
              onAdded={() => {
                setAddingLesson(false)
                onChanged()
              }}
              onCancel={() => setAddingLesson(false)}
            />
          ) : (
            <button
              onClick={() => setAddingLesson(true)}
              className="mt-2 text-xs font-semibold text-purple-600 hover:underline"
            >
              + إضافة درس
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AddUnitForm({ bookId, onAdded, onCancel }: { bookId: Id; onAdded: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await createUnit(bookId, title.trim())
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-4">
      <input
        autoFocus
        placeholder="اسم الوحدة"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="rounded-md bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
        >
          إضافة الوحدة
        </button>
        <button onClick={onCancel} className="rounded-md bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-700">
          إلغاء
        </button>
      </div>
    </div>
  )
}

export function CurriculumTree({ bookId }: { bookId: Id }) {
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [addingUnit, setAddingUnit] = useState(false)

  useEffect(() => {
    getUnits(bookId).then(setUnits)
  }, [bookId, refreshKey])

  function onChanged() {
    setRefreshKey((n) => n + 1)
  }

  if (units === null) {
    return <p className="text-sm text-gray-400">جارِ التحميل...</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {units.length === 0 && <p className="text-sm text-gray-500">لا توجد وحدات لهذا الكتاب بعد.</p>}
      {units.map((unit) => (
        <UnitBlock key={unit.id} unit={unit} refreshKey={refreshKey} onChanged={onChanged} />
      ))}

      {addingUnit ? (
        <AddUnitForm
          bookId={bookId}
          onAdded={() => {
            setAddingUnit(false)
            onChanged()
          }}
          onCancel={() => setAddingUnit(false)}
        />
      ) : (
        <button
          onClick={() => setAddingUnit(true)}
          className="self-start text-sm font-semibold text-purple-600 hover:underline"
        >
          + إضافة وحدة
        </button>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getBooks, getLessons, getUnits } from '../../lib/curriculumRepository'
import { getSubjects } from '../../lib/referenceDataRepository'
import { setCurrentPosition } from '../../lib/studentSubjectRepository'
import { getStudentById } from '../../lib/studentsRepository'
import type { Lesson, Student, Subject, Unit } from '../../types/entities'

export function CurrentSchoolPositionPicker() {
  const { studentId, subjectId } = useParams<{ studentId: string; subjectId: string }>()
  const navigate = useNavigate()

  const [student, setStudent] = useState<Student | null | undefined>(undefined)
  const [subject, setSubject] = useState<Subject | undefined>(undefined)
  const [publishedUnits, setPublishedUnits] = useState<Unit[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [publishedLessons, setPublishedLessons] = useState<Lesson[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!studentId || !subjectId) return
      const [s, subjects, books] = await Promise.all([getStudentById(studentId), getSubjects(), getBooks()])
      setStudent(s ?? null)
      const subj = subjects.find((x) => x.id === subjectId)
      setSubject(subj)

      const book = subj ? books.find((b) => b.subjectId === subj.id) : undefined
      if (book) {
        const units = await getUnits(book.id)
        setPublishedUnits(units.filter((u) => u.status === 'published'))
      }
    }
    load()
  }, [studentId, subjectId])

  useEffect(() => {
    if (!selectedUnitId) {
      setPublishedLessons([])
      return
    }
    getLessons(selectedUnitId).then((lessons) => setPublishedLessons(lessons.filter((l) => l.status === 'published')))
  }, [selectedUnitId])

  if (student === undefined || subject === undefined) {
    return <p className="p-6 text-gray-400">جارِ التحميل...</p>
  }

  if (!student || !subject) {
    return (
      <div className="p-6">
        <Link to="/parent" className="text-sm text-gray-500 hover:text-gray-700">
          → رجوع
        </Link>
        <p className="mt-4 text-gray-500">الطالب أو المادة غير موجودة.</p>
      </div>
    )
  }

  async function handleSave() {
    if (!selectedUnitId || !selectedLessonId) return
    setSaving(true)
    try {
      await setCurrentPosition(student!.id, subject!.id, selectedUnitId, selectedLessonId)
      navigate(`/parent/students/${student!.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <Link to={`/parent/students/${student.id}`} className="text-sm text-gray-500 hover:text-gray-700">
        → رجوع
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">أين وصل {student.name}؟</h1>

      {publishedUnits.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          لا يوجد محتوى منشور بعد لهذه المادة. تواصل مع الإدارة لاعتماد المحتوى ونشره أولًا.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">الوحدة</label>
            <select
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value)
                setSelectedLessonId('')
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">اختر الوحدة</option>
              {publishedUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">الدرس</label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              disabled={!selectedUnitId}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="">اختر الدرس</option>
              {publishedLessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
            {selectedUnitId && publishedLessons.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">لا توجد دروس منشورة في هذه الوحدة بعد.</p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={!selectedUnitId || !selectedLessonId || saving}
            className="rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
          >
            حفظ
          </button>
        </div>
      )}
    </div>
  )
}

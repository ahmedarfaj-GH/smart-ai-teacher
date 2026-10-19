import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getAcademicYears,
  getGrades,
  getSemesters,
  getStages,
  getSubjects,
} from '../../lib/referenceDataRepository'
import type { AcademicYear, Grade, Semester, Stage, Subject } from '../../types/entities'

interface ReferenceData {
  academicYear: AcademicYear
  stage: Stage
  grades: Grade[]
  semesters: Semester[]
  subjects: Subject[]
}

export function AddBookScreen() {
  const navigate = useNavigate()
  const [ref, setRef] = useState<ReferenceData | null>(null)
  const [title, setTitle] = useState('')
  const [bookType, setBookType] = useState('')
  const [part, setPart] = useState('')
  const [source, setSource] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [gradeId, setGradeId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [subjectId, setSubjectId] = useState('')

  useEffect(() => {
    async function load() {
      const [academicYears, stages, grades, semesters, subjects] = await Promise.all([
        getAcademicYears(),
        getStages(),
        getGrades(),
        getSemesters(),
        getSubjects(),
      ])
      const stage = stages.find((s) => s.id === grades[0]?.stageId)
      const academicYear = academicYears.find((y) => y.id === stage?.academicYearId)
      if (stage && academicYear) {
        setRef({ academicYear, stage, grades, semesters, subjects })
        setGradeId(grades[0].id)
        setBookType('كتاب الطالب')
        setPart('الجزء الأول')
        setSource('وزارة التعليم')
      }
    }
    load()
  }, [])

  // الفصول للصف المختار، والمواد للفصل المختار؛ وعند تغيير الأعلى نختار أول خيار في الأدنى.
  const gradeSemesters = ref?.semesters.filter((s) => s.gradeId === gradeId) ?? []
  const chosenSemesterId = gradeSemesters.some((s) => s.id === semesterId) ? semesterId : (gradeSemesters[0]?.id ?? '')
  const semesterSubjects = ref?.subjects.filter((s) => s.semesterId === chosenSemesterId) ?? []
  const chosenSubject = semesterSubjects.find((s) => s.id === subjectId) ?? semesterSubjects[0]
  const chosenGrade = ref?.grades.find((g) => g.id === gradeId)
  const chosenSemester = gradeSemesters.find((s) => s.id === chosenSemesterId)

  // اسم الكتاب يتبع اختيار الصف والفصل والمادة (يمكن تعديله).
  useEffect(() => {
    if (chosenSubject && chosenGrade && chosenSemester) {
      setTitle(`${chosenSubject.name} — ${chosenGrade.name} — ${chosenSemester.name}`)
    }
  }, [chosenSubject?.id, chosenGrade?.id, chosenSemester?.id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !ref || !chosenSubject) return
    navigate('/admin/books/new/processing', {
      state: { file, title, bookType, part, source, subjectId: chosenSubject.id },
    })
  }

  if (!ref) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <p className="text-gray-400">جارِ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
        → رجوع
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">إضافة كتاب</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <LockedField label="السنة الدراسية" value={ref.academicYear.label} />
        <LockedField label="المرحلة" value={ref.stage.name} />
        <SelectField
          label="الصف"
          value={gradeId}
          onChange={setGradeId}
          options={ref.grades.map((g) => ({ value: g.id, label: g.name }))}
        />
        <SelectField
          label="الفصل الدراسي"
          value={chosenSemesterId}
          onChange={setSemesterId}
          options={gradeSemesters.map((s) => ({ value: s.id, label: s.name }))}
        />
        <SelectField
          label="المادة"
          value={chosenSubject?.id ?? ''}
          onChange={setSubjectId}
          options={semesterSubjects.map((s) => ({ value: s.id, label: s.name }))}
        />

        <TextField label="اسم الكتاب" value={title} onChange={setTitle} />
        <TextField label="نوع الكتاب" value={bookType} onChange={setBookType} />
        <TextField label="الجزء" value={part} onChange={setPart} />
        <TextField label="المصدر" value={source} onChange={setSource} />

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">رفع ملف الكتاب (Markdown أو PDF)</label>
          <input
            type="file"
            accept=".md,application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-700"
          />
          {file && <p className="mt-1 text-xs text-gray-500">تم اختيار: {file.name}</p>}
        </div>

        <button
          type="submit"
          disabled={!file || !chosenSubject}
          className="mt-2 rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
        >
          رفع وتحليل
        </button>
      </form>
    </div>
  )
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-700">{label}</label>
      <input
        value={value}
        disabled
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  )
}

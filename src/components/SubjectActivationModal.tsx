interface SubjectActivationModalProps {
  subjectName: string
  teacherName: string
  studentName: string
  onConfirm: () => void
  onCancel: () => void
}

export function SubjectActivationModal({
  subjectName,
  teacherName,
  studentName,
  onConfirm,
  onCancel,
}: SubjectActivationModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="animate-pop-in w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-lg">
        <p className="text-gray-800">
          سيقوم المعلم {teacherName} بمساعدة {studentName} في مادة {subjectName}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            تفعيل
          </button>
        </div>
      </div>
    </div>
  )
}

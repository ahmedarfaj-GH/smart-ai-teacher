interface ActivityCardProps {
  prompt: string
  options: string[]
  markedWrongIndexes: number[]
  onSelect: (index: number) => void
}

// الخيارات التي جُرِّبت وكانت خاطئة تبقى قابلة للنقر (قد يعيد الطفل اختيارها)، وتُعلَّم بصريًا فقط.
export function ActivityCard({ prompt, options, markedWrongIndexes, onSelect }: ActivityCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
      <p className="text-xl font-bold text-gray-900">{prompt}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {options.map((option, index) => {
          const isMarkedWrong = markedWrongIndexes.includes(index)
          return (
            <button
              key={option}
              onClick={() => onSelect(index)}
              className={`min-w-24 rounded-xl border-2 px-6 py-4 text-lg font-bold transition-colors ${
                isMarkedWrong
                  ? 'border-red-200 bg-red-50 text-red-600 hover:border-red-300'
                  : 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400 hover:bg-purple-100'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

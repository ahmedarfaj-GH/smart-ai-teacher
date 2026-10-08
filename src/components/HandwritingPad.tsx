// مربع كتابة بالإصبع أو القلم (Pointer Events) على التابلت. يسلّم صورة PNG عند الضغط على "تم".
import { useRef, useState } from 'react'

interface Props {
  onSubmit: (pngDataUrl: string) => void
  disabled?: boolean
}

export function HandwritingPad({ onSubmit, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const { x, y } = position(e)
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    const { x, y } = position(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasInk(true)
  }

  function clear() {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  function submit() {
    const canvas = canvasRef.current
    if (!canvas) return
    // خلفية بيضاء حتى لا تظهر الصورة سوداء عند الإرسال (PNG شفاف).
    const flat = document.createElement('canvas')
    flat.width = canvas.width
    flat.height = canvas.height
    const ctx = flat.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, flat.width, flat.height)
    ctx.drawImage(canvas, 0, 0)
    onSubmit(flat.toDataURL('image/png'))
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        width={640}
        height={280}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
        className="w-full touch-none rounded-2xl border-2 border-dashed border-purple-300 bg-white"
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!hasInk || disabled}
          className="flex-1 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
        >
          تم
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk || disabled}
          className="rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-700 disabled:opacity-40"
        >
          مسح
        </button>
      </div>
    </div>
  )
}

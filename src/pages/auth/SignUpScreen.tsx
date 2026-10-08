import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type UserRole } from '../../context/AuthContext'

export function SignUpScreen() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('parent')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signUp({ email, password, name, role })
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    setInfo('تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده، ثم سجّل الدخول.')
    setTimeout(() => navigate('/sign-in'), 2500)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="text-2xl font-bold text-gray-900">إنشاء حساب</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input
          required
          placeholder="الاسم"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          required
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="كلمة المرور (٦ أحرف فأكثر)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <RoleOption label="ولي أمر" value="parent" current={role} onChange={setRole} />
          <RoleOption label="إدارة" value="admin" current={role} onChange={setRole} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
        >
          {submitting ? 'جارِ الإنشاء...' : 'إنشاء الحساب'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        عندك حساب؟{' '}
        <Link to="/sign-in" className="text-purple-600 hover:underline">
          سجّل الدخول
        </Link>
      </p>
    </div>
  )
}

function RoleOption({
  label,
  value,
  current,
  onChange,
}: {
  label: string
  value: UserRole
  current: UserRole
  onChange: (v: UserRole) => void
}) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
        active ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-300 text-gray-600'
      }`}
    >
      {label}
    </button>
  )
}

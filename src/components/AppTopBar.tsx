import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRole } from '../context/RoleContext'

const ROLE_LABEL = { admin: 'إدارة', parent: 'ولي أمر' } as const

export function AppTopBar() {
  const { profile, signOut } = useAuth()
  const { role, setRole } = useRole()
  const navigate = useNavigate()

  if (!profile) return null

  async function handleSignOut() {
    await signOut()
    navigate('/sign-in')
  }

  function handleBackToParent() {
    setRole('parent')
    navigate('/parent')
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="text-sm text-gray-600">
        {profile.name} <span className="text-gray-400">· {ROLE_LABEL[profile.role]}</span>
      </div>
      <div className="flex items-center gap-2">
        {profile.role === 'parent' && role === 'student' && (
          <button
            onClick={handleBackToParent}
            className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            رجوع لولي الأمر
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="rounded-full bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100"
        >
          تسجيل خروج
        </button>
      </div>
    </div>
  )
}

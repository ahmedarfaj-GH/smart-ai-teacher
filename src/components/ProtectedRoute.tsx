import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'

export function ProtectedRoute({ children, requireRole }: { children: ReactNode; requireRole?: UserRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="p-6 text-center text-gray-400">جارِ التحقق من الحساب...</div>
  }
  if (!user) {
    return <Navigate to="/sign-in" replace />
  }
  if (requireRole && profile?.role !== requireRole) {
    return <Navigate to={profile?.role === 'admin' ? '/admin' : '/parent'} replace />
  }

  return <>{children}</>
}

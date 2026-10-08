import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'

// بعد التحول إلى مصادقة حقيقية (المرحلة 8): الدور الفعلي يأتي من profiles.role في قاعدة البيانات،
// لا يُختار بحرية. التبديل المحلي الوحيد المسموح به هو ولي الأمر ↔ الطالب (تسليم الجهاز للطفل)،
// لأن الطالب لا يملك حسابًا مستقلاً (راجع المرحلة 8 في plan.md).
export type ViewMode = 'admin' | 'parent' | 'student'

interface RoleContextValue {
  role: ViewMode
  setRole: (role: ViewMode) => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('parent')

  useEffect(() => {
    if (profile) setViewMode(profile.role)
  }, [profile])

  function setRole(next: ViewMode) {
    if (profile?.role !== 'parent') return
    if (next === 'parent' || next === 'student') setViewMode(next)
  }

  return <RoleContext.Provider value={{ role: viewMode, setRole }}>{children}</RoleContext.Provider>
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within a RoleProvider')
  return ctx
}

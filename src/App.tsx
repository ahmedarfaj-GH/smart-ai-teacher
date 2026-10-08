import { Navigate, Route, Routes } from 'react-router-dom'
import { AppTopBar } from './components/AppTopBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { SignInScreen } from './pages/auth/SignInScreen'
import { SignUpScreen } from './pages/auth/SignUpScreen'
import { VoiceTestScreen } from './pages/dev/VoiceTestScreen'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AddBookScreen } from './pages/admin/AddBookScreen'
import { BookProcessingScreen } from './pages/admin/BookProcessingScreen'
import { CurriculumReviewScreen } from './pages/admin/CurriculumReviewScreen'
import { LessonDetailsScreen } from './pages/admin/LessonDetailsScreen'
import { TeacherManagementScreen } from './pages/admin/TeacherManagementScreen'
import { ParentDashboard } from './pages/parent/ParentDashboard'
import { StudentProfileForParent } from './pages/parent/StudentProfileForParent'
import { CurrentSchoolPositionPicker } from './pages/parent/CurrentSchoolPositionPicker'
import { BaselineAssessmentIntro } from './pages/parent/BaselineAssessmentIntro'
import { ParentProgressScreen } from './pages/parent/ParentProgressScreen'
import { StudentHome } from './pages/student/StudentHome'
import { TeacherSessionScreen } from './pages/student/TeacherSessionScreen'
import { SessionSummaryScreen } from './pages/student/SessionSummaryScreen'

function HomeRedirect() {
  const { profile } = useAuth()
  if (!profile) return null
  return <Navigate to={profile.role === 'admin' ? '/admin' : '/parent'} replace />
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/sign-in" element={<SignInScreen />} />
        <Route path="/sign-up" element={<SignUpScreen />} />
        <Route path="/voice-test" element={<VoiceTestScreen />} />

        <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requireRole="admin">
              <AppTopBar />
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/books/new" element={<AddBookScreen />} />
                <Route path="/books/new/processing" element={<BookProcessingScreen />} />
                <Route path="/books/:bookId" element={<CurriculumReviewScreen />} />
                <Route path="/lessons/:lessonId" element={<LessonDetailsScreen />} />
                <Route path="/teachers" element={<TeacherManagementScreen />} />
              </Routes>
            </ProtectedRoute>
          }
        />

        <Route
          path="/parent/*"
          element={
            <ProtectedRoute requireRole="parent">
              <AppTopBar />
              <Routes>
                <Route path="/" element={<ParentDashboard />} />
                <Route path="/students/:studentId" element={<StudentProfileForParent />} />
                <Route
                  path="/students/:studentId/subjects/:subjectId/position"
                  element={<CurrentSchoolPositionPicker />}
                />
                <Route
                  path="/students/:studentId/subjects/:subjectId/baseline"
                  element={<BaselineAssessmentIntro />}
                />
                <Route
                  path="/students/:studentId/subjects/:subjectId/progress"
                  element={<ParentProgressScreen />}
                />
              </Routes>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/*"
          element={
            <ProtectedRoute requireRole="parent">
              <AppTopBar />
              <Routes>
                <Route path="/:studentId" element={<StudentHome />} />
                <Route path="/:studentId/session" element={<TeacherSessionScreen />} />
                <Route path="/:studentId/session-summary" element={<SessionSummaryScreen />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}

export default App

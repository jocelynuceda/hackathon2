import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthBoundary } from './auth/AuthBoundary'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { useAuth } from './auth/useAuth'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NewsDetailDialog } from './pages/NewsDetailDialog'
import { NewsFeedPage } from './pages/NewsFeedPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { WantedListPage } from './pages/WantedListPage'
import { WantedDetailPage } from './pages/WantedDetailPage'

function RootRedirect() {
  const { status } = useAuth()
  return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route element={<AuthBoundary />}>
        <Route index element={<RootRedirect />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="wanted" element={<WantedListPage />} />
            <Route path="news" element={<NewsFeedPage />}>
              <Route path=":id" element={<NewsDetailDialog />} />
            </Route>
            <Route path="wanted/:id" element={<WantedDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App

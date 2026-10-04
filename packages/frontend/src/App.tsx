import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ToastHost } from '@/components/ui/ToastHost'
import { Spinner } from '@/components/ui/Feedback'
import { useAuthStore } from '@/stores/authStore'

const LoginActivity = lazy(() => import('@/activities/auth/LoginActivity'))
const RegisterActivity = lazy(() => import('@/activities/auth/RegisterActivity'))
const DashboardActivity = lazy(() => import('@/activities/dashboard/DashboardActivity'))
const TemplatesActivity = lazy(() => import('@/activities/templates/TemplatesActivity'))
const BrandHubActivity = lazy(() => import('@/activities/brand/BrandHubActivity'))
const SocialActivity = lazy(() => import('@/activities/social/SocialActivity'))
const BillingActivity = lazy(() => import('@/activities/billing/BillingActivity'))
const ProfileActivity = lazy(() => import('@/activities/profile/ProfileActivity'))
const WorkspaceActivity = lazy(() => import('@/activities/workspace/WorkspaceActivity'))
const EditorActivity = lazy(() => import('@/activities/editor/EditorActivity'))
const SharedViewActivity = lazy(() => import('@/activities/share/SharedViewActivity'))

function Loading() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}>
      <Spinner size={26} />
    </div>
  )
}

function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const booting = useAuthStore((s) => s.booting)
  const location = useLocation()
  if (booting) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

export default function App() {
  const boot = useAuthStore((s) => s.boot)
  useEffect(() => {
    void boot()
  }, [boot])

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginActivity />} />
          <Route path="/register" element={<RegisterActivity />} />
          <Route path="/s/:token" element={<SharedViewActivity />} />
          <Route element={<RequireAuth />}>
            <Route path="/editor/:projectId" element={<EditorActivity />} />
            <Route element={<AppShell />}>
              <Route index element={<DashboardActivity />} />
              <Route path="templates" element={<TemplatesActivity />} />
              <Route path="brand" element={<BrandHubActivity />} />
              <Route path="social" element={<SocialActivity />} />
              <Route path="billing" element={<BillingActivity />} />
              <Route path="profile" element={<ProfileActivity />} />
              <Route path="workspace" element={<WorkspaceActivity />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ToastHost />
    </BrowserRouter>
  )
}

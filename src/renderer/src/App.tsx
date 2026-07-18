import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import PlotsPage from './pages/PlotsPage'
import PlotDetailPage from './pages/PlotDetailPage'
import BuyersPage from './pages/BuyersPage'
import BuyerDetailPage from './pages/BuyerDetailPage'
import SearchPage from './pages/SearchPage'
import BackupPage from './pages/BackupPage'
import SettingsPage from './pages/SettingsPage'
import AuditPage from './pages/AuditPage'
import ToastContainer from './components/ToastContainer'

function App(): React.ReactElement {
  const { session, user, setSession, clearSession, setFirstRun } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [isFirst, setIsFirst] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        // Check first run
        const first = await window.api.auth.isFirstRun()
        setIsFirst(first)
        setFirstRun(first)

        // Validate existing session
        if (session && !first) {
          const result = await window.api.auth.validateSession(session)
          if (!result.valid) {
            clearSession()
          }
        }
      } catch (err) {
        console.error('Init error:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%', background: '#060907',
        flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '48px', height: '48px',
          border: '2px solid #1e3028',
          borderTopColor: '#2fd44f',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (isFirst) {
    return (
      <>
        <SetupPage onComplete={() => { setIsFirst(false); setFirstRun(false) }} />
        <ToastContainer />
      </>
    )
  }

  if (!session || !user) {
    return (
      <>
        <LoginPage onLogin={(s, u) => setSession(s, u)} />
        <ToastContainer />
      </>
    )
  }

  return (
    <>
      <AppShell user={user} session={session} onLogout={clearSession}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/plots" element={<PlotsPage />} />
          <Route path="/plots/:id" element={<PlotDetailPage />} />
          <Route path="/buyers" element={<BuyersPage />} />
          <Route path="/buyers/:id" element={<BuyerDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
      <ToastContainer />
    </>
  )
}

export default App

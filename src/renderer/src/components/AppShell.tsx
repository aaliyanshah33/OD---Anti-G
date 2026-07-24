import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { User } from '../types'
import {
  LayoutDashboard, FolderOpen, MapPin, Users,
  Search, Shield, Settings, Database,
  Minus, Square, X, ChevronLeft, Menu, SunMedium, Moon, LogOut
} from 'lucide-react'

interface AppShellProps {
  user: User
  session: string
  onLogout: () => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
  children: React.ReactNode
}

function AppShell({ user, session, onLogout, theme, toggleTheme, children }: AppShellProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await window.api.auth.logout(session)
    } finally {
      setLoggingOut(false)
      setShowLogoutConfirm(false)
      onLogout()
      navigate('/')
    }
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderOpen, label: 'Projects' },
    { to: '/plots', icon: MapPin, label: 'All Plots' },
    { to: '/buyers', icon: Users, label: 'Buyers' },
    { to: '/search', icon: Search, label: 'Search' },
  ]

  const adminItems = [
    { to: '/audit', icon: Shield, label: 'Audit Log' },
    { to: '/backup', icon: Database, label: 'Backup' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  const initials = user.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.username.slice(0, 2).toUpperCase()

  const roleLabel = user.role === 'master' ? 'Admin' : 'Staff'

  return (
    <div className="app-root">
      {/* Custom Title Bar */}
      <div className="title-bar">
        <div className="title-bar-left">
          <button className="title-bar-btn" onClick={() => setCollapsed(c => !c)} title="Toggle sidebar">
            {collapsed ? <Menu size={14} /> : <ChevronLeft size={14} />}
          </button>
          <div className="title-bar-brand">
            <span className="dot" />
            OD · Inventory System
          </div>
        </div>
        <div className="title-bar-center">
          Optional Developers — Inventory Maintenance System
        </div>
        <div className="title-bar-controls">
          <button className="title-bar-btn" onClick={toggleTheme} title="Switch theme">
            {theme === 'dark' ? <SunMedium size={14} /> : <Moon size={14} />}
          </button>
          <button className="title-bar-btn" onClick={() => window.api.window.minimize()}>
            <Minus size={12} />
          </button>
          <button className="title-bar-btn maximize" onClick={() => window.api.window.maximize()}>
            <Square size={11} />
          </button>
          <button className="title-bar-btn close" onClick={() => window.api.window.close()}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="app-body">
        {/* Sidebar */}
        <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
          <div className="sidebar-logo">
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(47,212,79,0.1)', borderRadius: '50%',
              border: '1.5px solid rgba(47,212,79,0.3)'
            }}>
              <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="14" stroke="#2fd44f" strokeWidth="1.5" fill="none" opacity="0.9" />
                <ellipse cx="20" cy="20" rx="8" ry="14" stroke="#2fd44f" strokeWidth="1.5" fill="none" opacity="0.7" />
                <ellipse cx="20" cy="20" rx="14" ry="8" stroke="#2fd44f" strokeWidth="1.5" fill="none" opacity="0.5" />
              </svg>
            </div>
            <span className="sidebar-logo-text">OPTIONAL DEV</span>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-section-label">Main</div>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={16} />
                <span className="nav-label">{label}</span>
              </NavLink>
            ))}

            {user.role === 'master' && (
              <>
                <div className="sidebar-section-label">Admin</div>
                {adminItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <Icon size={16} />
                    <span className="nav-label">{label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          <div className="sidebar-footer">
            <div className="user-card" onClick={() => setShowLogoutConfirm(true)} title="Account">
              <div className="user-avatar">{initials}</div>
              <div className="user-info">
                <div className="user-name">{user.fullName || user.username}</div>
                <div className="user-role">{roleLabel}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="page-content">
          {children}
        </main>
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ color: 'var(--green)' }}><LogOut size={20} /></div>
                <span className="modal-title">Log Out</span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowLogoutConfirm(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 4 }}>
                Are you sure you want to log out of your account?
              </p>
              <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                {user.fullName || user.username} · {roleLabel}
              </p>
              <div className="modal-footer" style={{ padding: '20px 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)} disabled={loggingOut}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleLogout} disabled={loggingOut} style={{ gap: 8 }}>
                  {loggingOut ? 'Logging out...' : <><LogOut size={15} /> Log Out</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppShell

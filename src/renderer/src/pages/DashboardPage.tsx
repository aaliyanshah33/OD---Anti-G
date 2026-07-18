import React, { useEffect, useState } from 'react'
import { FolderOpen, MapPin, Users, ArrowLeftRight, FileText, Activity, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import type { DashboardStats } from '../types'

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'User logged in', LOGIN_FAILED: 'Failed login attempt',
  LOGOUT: 'User logged out', PROJECT_CREATE: 'Project created',
  PROJECT_UPDATE: 'Project updated', PROJECT_DELETE: 'Project deleted',
  PLOT_CREATE: 'Plot added', PLOT_UPDATE: 'Plot updated',
  BUYER_CREATE: 'Buyer added', BUYER_UPDATE: 'Buyer updated',
  OWNERSHIP_TRANSFER: 'Ownership transferred',
  DOCUMENT_UPLOAD: 'Document uploaded', DOCUMENT_DOWNLOAD: 'Document downloaded',
  PAYMENT_RECORD: 'Payment recorded', EXPORT_PDF: 'PDF exported',
  EXPORT_EXCEL: 'Excel exported', BACKUP_CREATE: 'Backup created',
  SETTINGS_UPDATE: 'Settings updated', USER_CREATE: 'User created',
  SEARCH: 'Search performed'
}

export default function DashboardPage(): React.ReactElement {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await window.api.audit.getDashboardStats()
      setStats(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStats() }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const statCards = [
    { label: 'Projects', value: stats?.totalProjects ?? 0, icon: FolderOpen, color: '#2fd44f' },
    { label: 'Total Plots', value: stats?.totalPlots ?? 0, icon: MapPin, color: '#3b82f6' },
    { label: 'Buyers', value: stats?.totalBuyers ?? 0, icon: Users, color: '#8b5cf6' },
    { label: 'Transfers', value: stats?.totalTransfers ?? 0, icon: ArrowLeftRight, color: '#f59e0b' },
    { label: 'Documents', value: stats?.totalDocuments ?? 0, icon: FileText, color: '#ec4899' },
  ]

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            {greeting}
          </div>
          <h1 className="page-title">{user?.fullName || user?.username}</h1>
          <p className="page-subtitle">Here's what's happening in your inventory system</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadStats} disabled={loading}>
          <RefreshCw size={13} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid-4 stagger-children" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 28 }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card animate-page-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">{s.label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                background: `${s.color}18`,
                border: `1px solid ${s.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.color
              }}>
                <s.icon size={15} />
              </div>
            </div>
            <div className="stat-value">
              {loading ? <div className="skeleton" style={{ width: 60, height: 32 }} /> : s.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={15} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Recent Activity</span>
        </div>

        {loading ? (
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />
            ))}
          </div>
        ) : (
          <div>
            {(stats?.recentActivity ?? []).length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Activity size={24} /></div>
                <div className="empty-title">No activity yet</div>
                <div className="empty-desc">Activity will appear here as you use the system</div>
              </div>
            ) : (
              (stats?.recentActivity ?? []).map((log, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderBottom: i < (stats?.recentActivity.length ?? 0) - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: log.action.includes('FAIL') ? '#ef4444' :
                        log.action.includes('CREATE') || log.action.includes('TRANSFER') ? 'var(--green)' : 'var(--muted-2)'
                    }} />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                        {ACTION_LABELS[log.action] || log.action}
                      </div>
                      {log.details && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{log.details}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {log.username && <span style={{ color: 'var(--green-dim)', fontWeight: 600 }}>{log.username} · </span>}
                      {new Date(log.created_at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

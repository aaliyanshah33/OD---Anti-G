import React, { useEffect, useState } from 'react'
import { Database, Download, Plus, CheckCircle, HardDrive } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import MasterPasswordModal from '../components/MasterPasswordModal'

export default function BackupPage(): React.ReactElement {
  const { user } = useAuthStore()
  const [backups, setBackups] = useState<{ id: string; backup_path: string; backup_size: number; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [masterModal, setMasterModal] = useState<{ action: () => void; label: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try { setBackups(await window.api.backup.list()) }
    catch { toast.error('Failed to load backups') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = () => {
    setMasterModal({
      label: 'Create encrypted database backup',
      action: async () => {
        setMasterModal(null)
        setCreating(true)
        try {
          const result = await window.api.backup.create(user!.id)
          if (result.success) { toast.success('Backup created successfully'); load() }
          else toast.error(result.error || 'Backup failed')
        } catch { toast.error('Backup failed') }
        finally { setCreating(false) }
      }
    })
  }

  const handleExportUsb = () => {
    setMasterModal({
      label: 'Export backup to USB/external drive',
      action: async () => {
        setMasterModal(null)
        try {
          const result = await window.api.backup.exportToUsb(user!.id)
          if (result.success) toast.success('Backup exported successfully')
          else toast.error(result.error || 'Export failed')
        } catch { toast.error('Export failed') }
      }
    })
  }

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Backup & Restore</h1>
          <p className="page-subtitle">Protect your data with encrypted backups</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportUsb}><Download size={15} /> Export to USB</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            <Plus size={15} /> {creating ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 28 }}>
        {[{ label: 'Total Backups', value: backups.length, icon: Database, color: 'var(--green-bright)' },
          { label: 'Latest Backup', value: backups[0] ? new Date(backups[0].created_at).toLocaleDateString('en-PK') : 'Never', icon: CheckCircle, color: '#3b82f6' },
          { label: 'Encryption', value: 'AES-256', icon: HardDrive, color: '#8b5cf6' }
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="stat-label">{s.label}</span>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 8 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Backup File</th><th>Size</th><th>Created</th></tr></thead>
          <tbody>
            {loading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={3}><div className="skeleton" style={{ height: 20 }} /></td></tr>) : backups.map(b => (
              <tr key={b.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.backup_path.split('/').pop()}</td>
                <td>{b.backup_size ? `${(b.backup_size / 1024).toFixed(0)} KB` : '—'}</td>
                <td>{new Date(b.created_at).toLocaleString('en-PK')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && backups.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><Database size={24} /></div>
            <div className="empty-title">No backups yet</div>
            <div className="empty-desc">Create your first backup to protect your data</div>
          </div>
        )}
      </div>

      {masterModal && <MasterPasswordModal action={masterModal.label} onConfirm={masterModal.action} onCancel={() => setMasterModal(null)} />}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Settings, Users, Plus, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import MasterPasswordModal from '../components/MasterPasswordModal'

interface StaffUser { id: string; username: string; full_name: string; role: string; is_active: number; last_login: string }

export default function SettingsPage(): React.ReactElement {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [masterModal, setMasterModal] = useState<{ action: () => void; label: string } | null>(null)
  const [form, setForm] = useState({ username: '', fullName: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const [u, s] = await Promise.all([window.api.auth.getUsers(), window.api.settings.getAll()])
      setUsers(u as StaffUser[])
      setSettings(s as Record<string, string>)
    } catch { toast.error('Failed to load settings') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await window.api.auth.createUser({ username: form.username, password: form.password, fullName: form.fullName })
      if (result.success) { toast.success('Staff user created'); setShowAddUser(false); setForm({ username: '', fullName: '', password: '' }); load() }
      else toast.error(result.error || 'Failed')
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleToggle = (u: StaffUser) => {
    setMasterModal({
      label: `${u.is_active ? 'Disable' : 'Enable'} user: ${u.username}`,
      action: async () => {
        setMasterModal(null)
        try {
          await window.api.auth.toggleUser({ userId: u.id, isActive: !u.is_active })
          toast.success(`User ${u.is_active ? 'disabled' : 'enabled'}`)
          load()
        } catch { toast.error('Failed') }
      }
    })
  }

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage users and system configuration</p>
        </div>
      </div>

      {/* User Management */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} style={{ color: 'var(--green)' }} />
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>User Management</span>
            <span className="section-count">{users.length}</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddUser(true)}><Plus size={13} /> Add Staff</button>
        </div>
        <table className="table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Last Login</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.full_name}</strong></td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.username}</td>
                <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                <td>{u.last_login ? new Date(u.last_login).toLocaleDateString('en-PK') : 'Never'}</td>
                <td><span style={{ fontSize: 12, color: u.is_active ? 'var(--green)' : 'var(--danger)', fontWeight: 600 }}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
                <td>
                  {u.role !== 'master' && (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleToggle(u)} title={u.is_active ? 'Disable' : 'Enable'}>
                      {u.is_active ? <ToggleRight size={16} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={16} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* System Info */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={15} style={{ color: 'var(--green)' }} /> System Information
        </div>
        {[['Company', settings.company_name || 'Optional Developers'],
          ['System', 'Inventory Maintenance System v1.0'],
          ['Platform', 'Electron (Offline Desktop)'],
          ['Database', 'SQLite — Encrypted'],
          ['Setup', settings.setup_complete === 'true' ? '✓ Complete' : 'Pending']
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--text-3)' }}>{k}</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Staff User</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddUser(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddUser}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddUser(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {masterModal && <MasterPasswordModal action={masterModal.label} onConfirm={masterModal.action} onCancel={() => setMasterModal(null)} />}
    </div>
  )
}

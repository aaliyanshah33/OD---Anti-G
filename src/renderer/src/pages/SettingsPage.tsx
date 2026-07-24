import React, { useEffect, useState } from 'react'
import { Settings, Users, Plus, ToggleLeft, ToggleRight, X, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import MasterPasswordModal from '../components/MasterPasswordModal'
import { validatePasswordStrength, PASSWORD_REQUIREMENTS_TEXT, PASSWORD_MIN_LENGTH } from '../../../shared/passwordPolicy'

interface StaffUser { id: string; username: string; full_name: string; role: string; is_active: number; last_login: string }

export default function SettingsPage(): React.ReactElement {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [masterModal, setMasterModal] = useState<{ action: () => void; label: string } | null>(null)
  const [form, setForm] = useState({ username: '', fullName: '', password: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [passwordError, setPasswordError] = useState('')
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
    const passwordCheck = validatePasswordStrength(form.password)
    if (!passwordCheck.valid) {
      toast.error(passwordCheck.error || PASSWORD_REQUIREMENTS_TEXT)
      return
    }
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

  const openChangePassword = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordError('')
    setShowCurrent(false)
    setShowNew(false)
    setShowChangePassword(true)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (!passwordForm.currentPassword) {
      setPasswordError('Enter your current password')
      return
    }
    const passwordCheck = validatePasswordStrength(passwordForm.newPassword)
    if (!passwordCheck.valid) {
      setPasswordError(passwordCheck.error || PASSWORD_REQUIREMENTS_TEXT)
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from the current password')
      return
    }
    if (!user?.id) {
      setPasswordError('Session expired. Please log in again.')
      return
    }

    setSaving(true)
    try {
      const result = await window.api.auth.changePassword({
        userId: user.id,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      if (result.success) {
        toast.success('Password changed successfully')
        setShowChangePassword(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setPasswordError(result.error || 'Failed to change password')
        // Clear current password on failure so they re-enter it
        if (result.error?.toLowerCase().includes('current password')) {
          setPasswordForm(f => ({ ...f, currentPassword: '' }))
        }
      }
    } catch {
      setPasswordError('Password change failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage users and system configuration</p>
        </div>
      </div>

      {/* Account Security */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={15} style={{ color: 'var(--green)' }} />
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Account Security</span>
          </div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Change Password</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
              You must enter your current password before setting a new one.
              {user?.role === 'master' ? ' This updates the master account credentials.' : ''}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={openChangePassword} style={{ flexShrink: 0 }}>
            <KeyRound size={13} /> Change Password
          </button>
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
                <td><span className={`badge badge-${u.role}`}>{u.role === 'master' ? 'Admin' : u.role}</span></td>
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

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ color: 'var(--green)' }}><KeyRound size={18} /></div>
                <span className="modal-title">Change Password</span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowChangePassword(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>
                Enter your current password to verify your identity, then choose a new password.
              </p>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      className="form-input"
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      autoFocus
                      required
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(s => !s)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)'
                      }}
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      className="form-input"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder={PASSWORD_REQUIREMENTS_TEXT}
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(s => !s)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)'
                      }}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                  />
                </div>

                {passwordError && (
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 'var(--radius)', padding: '10px 14px',
                    color: '#ef4444', fontSize: 12, marginBottom: 12
                  }}>
                    {passwordError}
                  </div>
                )}

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowChangePassword(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
                  <input
                    type="password"
                    className="form-input"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={PASSWORD_REQUIREMENTS_TEXT}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{PASSWORD_REQUIREMENTS_TEXT}</p>
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

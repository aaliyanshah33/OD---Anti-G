import React, { useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'

interface MasterPasswordModalProps {
  onConfirm: () => void
  onCancel: () => void
  action?: string
}

export default function MasterPasswordModal({ onConfirm, onCancel, action }: MasterPasswordModalProps): React.ReactElement {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await window.api.auth.verifyMasterPassword(password)
      if (result.valid) {
        onConfirm()
      } else {
        setError('Incorrect master password. Access denied.')
        setPassword('')
      }
    } catch {
      setError('Verification failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: '#f59e0b' }}><ShieldAlert size={20} /></div>
            <span className="modal-title">Master Authorization Required</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {action && (
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
              This action requires master password authorization:<br />
              <strong style={{ color: 'var(--text)' }}>{action}</strong>
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Master Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter master password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            {error && (
              <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {error}
              </div>
            )}
            <div className="modal-footer" style={{ padding: '16px 0 0' }}>
              <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !password}>
                {loading ? 'Verifying...' : 'Authorize'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

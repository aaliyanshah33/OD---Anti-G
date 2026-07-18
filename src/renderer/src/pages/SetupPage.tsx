import React, { useState } from 'react'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { toast } from '../stores/toastStore'

interface SetupPageProps {
  onComplete: () => void
}

export default function SetupPage({ onComplete }: SetupPageProps): React.ReactElement {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.fullName.trim()) e.fullName = 'Full name is required'
    if (!form.username.trim() || form.username.length < 3) e.username = 'Username must be at least 3 characters'
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const result = await window.api.auth.setupMaster({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim()
      })
      if (result.success) {
        toast.success('Master account created successfully!')
        onComplete()
      } else {
        toast.error(result.error || 'Setup failed')
      }
    } catch (err) {
      toast.error('Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--black)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="30" stroke="#2fd44f" strokeWidth="1.5" fill="none" opacity="0.9" />
            <ellipse cx="40" cy="40" rx="16" ry="30" stroke="#2fd44f" strokeWidth="1.5" fill="none" opacity="0.7" />
            <ellipse cx="40" cy="40" rx="30" ry="16" stroke="#2fd44f" strokeWidth="1.5" fill="none" opacity="0.5" />
            <circle cx="40" cy="40" r="4" fill="#2fd44f" opacity="0.8" />
          </svg>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 6 }}>
          Optional Developers
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.5px' }}>
          Inventory Management System
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>First-Time Setup — Create Your Master Account</p>
      </div>

      {/* Setup card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ color: 'var(--green)' }}><ShieldCheck size={20} /></div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Master Administrator Setup</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>This account controls all sensitive operations</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Muhammad Ali"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              autoFocus
            />
            {errors.fullName && <span style={{ color: '#ef4444', fontSize: 11 }}>{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. admin"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
            />
            {errors.username && <span style={{ color: '#ef4444', fontSize: 11 }}>{errors.username}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Master Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)'
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span style={{ color: '#ef4444', fontSize: 11 }}>{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
            />
            {errors.confirmPassword && <span style={{ color: '#ef4444', fontSize: 11 }}>{errors.confirmPassword}</span>}
          </div>

          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 'var(--radius)', padding: '12px 14px',
            fontSize: 12, color: '#f59e0b', marginBottom: 20, lineHeight: 1.5
          }}>
            ⚠️ Store your master password securely. It cannot be recovered without the backup recovery phrase.
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Creating Account...' : 'Create Master Account & Start'}
          </button>
        </form>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { toast } from '../stores/toastStore'
import odLogo from '../assets/od-logo.png'
import { validatePasswordStrength, PASSWORD_REQUIREMENTS_TEXT, PASSWORD_MIN_LENGTH } from '../../../shared/passwordPolicy'

interface SetupPageProps {
  onComplete: () => void
}

export default function SetupPage({ onComplete }: SetupPageProps): React.ReactElement {
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
    const passwordCheck = validatePasswordStrength(form.password)
    if (!passwordCheck.valid) e.password = passwordCheck.error || PASSWORD_REQUIREMENTS_TEXT
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
    } catch {
      toast.error('Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-screen__grid" aria-hidden />

      <div className="auth-screen__inner" style={{ maxWidth: 460 }}>
        <div className="auth-brand">
          <img
            className="auth-brand__logo auth-brand__logo--lg"
            src={odLogo}
            alt="Optional Developers — Opt Optional Options, Priority Is Our Option"
            draggable={false}
          />
          <h1 className="auth-brand__title auth-brand__title--lg">Inventory Management System</h1>
          <p className="auth-brand__subtitle">First-time setup — create your Admin account</p>
        </div>

        <div className="auth-card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(47,212,79,0.12)', border: '1px solid rgba(47,212,79,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-bright)'
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="auth-card__title" style={{ marginBottom: 2 }}>Admin Account Setup</div>
              <div className="auth-card__desc" style={{ marginBottom: 0 }}>This account controls all sensitive operations</div>
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
              {errors.fullName && <span style={{ color: '#ff8a8a', fontSize: 11 }}>{errors.fullName}</span>}
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
              {errors.username && <span style={{ color: '#ff8a8a', fontSize: 11 }}>{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Master Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder={PASSWORD_REQUIREMENTS_TEXT}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingRight: 44 }}
                  minLength={PASSWORD_MIN_LENGTH}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)'
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span style={{ color: '#ff8a8a', fontSize: 11 }}>{errors.password}</span>}
              {!errors.password && (
                <span style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4, display: 'block' }}>
                  {PASSWORD_REQUIREMENTS_TEXT}
                </span>
              )}
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
              {errors.confirmPassword && <span style={{ color: '#ff8a8a', fontSize: 11 }}>{errors.confirmPassword}</span>}
            </div>

            <div style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.28)',
              borderRadius: 'var(--radius)', padding: '12px 14px',
              fontSize: 12, color: '#fbbf24', marginBottom: 20, lineHeight: 1.5
            }}>
              Store your master password securely. It cannot be recovered without the backup recovery phrase.
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Creating Account...' : 'Create Admin Account & Start'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          All rights are reserved to Optional Developers.
        </div>
      </div>
    </div>
  )
}

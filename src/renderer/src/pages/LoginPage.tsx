import React, { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import type { User } from '../types'
import { toast } from '../stores/toastStore'
import odLogo from '../assets/od-logo.png'

interface LoginPageProps {
  onLogin: (session: string, user: User) => void
}

export default function LoginPage({ onLogin }: LoginPageProps): React.ReactElement {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.password) return
    setLoading(true)
    setError('')
    try {
      const result = await window.api.auth.login({ username: form.username, password: form.password })
      if (result.success) {
        toast.success(`Welcome back, ${result.user.fullName || result.user.username}!`)
        onLogin(result.session, result.user)
      } else {
        setAttempts(a => a + 1)
        setError(result.error || 'Invalid credentials')
        setForm(f => ({ ...f, password: '' }))
      }
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-screen__grid" aria-hidden />

      <div className="auth-screen__inner">
        <div className="auth-brand">
          <img
            className="auth-brand__logo"
            src={odLogo}
            alt="Optional Developers — Opt Optional Options, Priority Is Our Option"
            draggable={false}
          />
          <h1 className="auth-brand__title">Inventory System</h1>
          <p className="auth-brand__subtitle" style={{ marginTop: 8 }}>Secure offline inventory management</p>
        </div>

        <div className="auth-card">
          <h2 className="auth-card__title">Sign In</h2>
          <p className="auth-card__desc">Enter your credentials to access the system</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoFocus
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: 44 }}
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
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)',
                borderRadius: 'var(--radius)', padding: '10px 14px',
                color: '#ff8a8a', fontSize: 12, marginBottom: 16, lineHeight: 1.45
              }}>
                {error}{attempts >= 3 && ' — Contact the Admin if you are locked out.'}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !form.username || !form.password}
              style={{ width: '100%', padding: '12px', gap: 8 }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</>
              ) : (
                <><LogIn size={16} /> Sign In</>
              )}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          <div className="auth-footer__meta">Secure · Offline · Encrypted</div>
          <div>All rights are reserved to Optional Developers.</div>
        </div>
      </div>
    </div>
  )
}

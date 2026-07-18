import React, { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import type { User } from '../types'
import { toast } from '../stores/toastStore'

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
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--black)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }}>
      {/* Background grid effect */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(var(--green) 1px, transparent 1px), linear-gradient(90deg, var(--green) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <svg width="60" height="60" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="30" stroke="#2fd44f" strokeWidth="1.5" fill="none" opacity="0.9" />
              <ellipse cx="40" cy="40" rx="16" ry="30" stroke="#2fd44f" strokeWidth="1.5" fill="none" opacity="0.7" />
              <ellipse cx="40" cy="40" rx="30" ry="16" stroke="#2fd44f" strokeWidth="1.5" fill="none" opacity="0.5" />
              <circle cx="40" cy="40" r="4" fill="#2fd44f" />
            </svg>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 6 }}>
            Optional Developers
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            Inventory System
          </h1>
        </div>

        {/* Login card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(47,212,79,0.04)'
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Sign In</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Enter your credentials to access the system</p>

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
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius)', padding: '10px 14px',
                color: '#ef4444', fontSize: 12, marginBottom: 16
              }}>
                {error}{attempts >= 3 && ' — Contact the Master Administrator if you are locked out.'}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !form.username || !form.password}
              style={{ width: '100%', padding: '11px', gap: 8 }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</>
              ) : (
                <><LogIn size={16} /> Sign In</>
              )}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-3)' }}>
          🔒 Secure · Offline · Encrypted
        </div>
      </div>
    </div>
  )
}

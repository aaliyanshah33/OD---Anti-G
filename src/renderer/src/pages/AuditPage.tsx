import React, { useEffect, useState } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import type { AuditLog } from '../types'
import { toast } from '../stores/toastStore'

const ACTION_COLOR: Record<string, string> = {
  LOGIN: 'var(--green)', LOGIN_FAILED: 'var(--danger)', LOGOUT: 'var(--text-3)',
  OWNERSHIP_TRANSFER: 'var(--sold)', DOCUMENT_DOWNLOAD: '#f59e0b',
  EXPORT_PDF: '#f59e0b', EXPORT_EXCEL: '#f59e0b',
  PROJECT_DELETE: 'var(--danger)', PLOT_DELETE: 'var(--danger)', BUYER_DELETE: 'var(--danger)'
}

export default function AuditPage(): React.ReactElement {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; total: number; corruptedAt: number | null } | null>(null)
  const [verifying, setVerifying] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setLogs(await window.api.audit.getLogs({ limit: 100, offset: 0 })) }
    catch { toast.error('Failed to load audit log') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleVerify = async () => {
    setVerifying(true)
    try { setVerifyResult(await window.api.audit.verify()) }
    catch { toast.error('Verification failed') }
    finally { setVerifying(false) }
  }

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Tamper-evident hash-chained activity log</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleVerify} disabled={verifying}>
            {verifying ? <><div className="spinner" style={{ width: 13, height: 13 }} /> Verifying...</> : <><Shield size={14} /> Verify Integrity</>}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={load}><RefreshCw size={14} /></button>
        </div>
      </div>

      {verifyResult && (
        <div style={{
          padding: '14px 18px', borderRadius: 'var(--radius)', marginBottom: 20,
          background: verifyResult.valid ? 'rgba(47,212,79,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${verifyResult.valid ? 'rgba(47,212,79,0.3)' : 'rgba(239,68,68,0.3)'}`,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          {verifyResult.valid
            ? <><CheckCircle size={16} style={{ color: 'var(--green)' }} /><span style={{ color: 'var(--green)', fontWeight: 600 }}>Audit log verified — {verifyResult.total} entries, chain intact</span></>
            : <><AlertTriangle size={16} style={{ color: '#ef4444' }} /><span style={{ color: '#ef4444', fontWeight: 600 }}>TAMPERING DETECTED at entry #{verifyResult.corruptedAt}</span></>}
        </div>
      )}

      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>#</th><th>Action</th><th>Details</th><th>User</th><th>Time</th><th>Hash</th></tr></thead>
          <tbody>
            {loading ? [...Array(10)].map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: 20 }} /></td></tr>)
            : logs.map(log => (
              <tr key={log.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)' }}>{log.id}</td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACTION_COLOR[log.action] || 'var(--text-3)', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{log.action}</span>
                  </span>
                </td>
                <td style={{ maxWidth: 220, fontSize: 12 }} className="truncate">{log.details || '—'}</td>
                <td style={{ fontSize: 12 }}>{log.username || '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-3)' }} title={log.entry_hash}>
                  {log.entry_hash.slice(0, 8)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && logs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><Shield size={24} /></div>
            <div className="empty-title">No audit entries yet</div>
          </div>
        )}
      </div>
    </div>
  )
}

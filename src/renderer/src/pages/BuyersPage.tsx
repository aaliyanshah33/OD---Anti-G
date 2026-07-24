import React, { useEffect, useState } from 'react'
import { Plus, Users, Search, X, Upload, Image as ImageIcon, Contact2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Buyer } from '../types'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'

const emptyForm = {
  fullName: '',
  fatherHusbandName: '',
  cnic: '',
  phonePrimary: '',
  phoneSecondary: '',
  email: '',
  address: '',
  city: '',
  notes: '',
  photoPath: '',
  idDocumentPath: ''
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

function isImagePath(path: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(path)
}

export default function BuyersPage(): React.ReactElement {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    try { setBuyers(await window.api.buyers.getAll()) }
    catch { toast.error('Failed to load buyers') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = buyers.filter(b =>
    !query || b.full_name.toLowerCase().includes(query.toLowerCase()) ||
    (b.cnic && b.cnic.includes(query)) || (b.phone_primary && b.phone_primary.includes(query))
  )

  const pickAttachment = async (kind: 'photo' | 'id') => {
    const result = await window.api.buyers.selectAttachment(kind)
    if (result?.success && result.path) {
      setForm(f => kind === 'photo'
        ? { ...f, photoPath: result.path }
        : { ...f, idDocumentPath: result.path })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim()) return
    if (!form.photoPath) {
      toast.error('Attach buyer photo to complete the profile')
      return
    }
    if (!form.idDocumentPath) {
      toast.error('Attach CNIC / Passport front to complete the profile')
      return
    }
    setSaving(true)
    try {
      const result = await window.api.buyers.create({ ...form, userId: user!.id })
      if (result?.success === false) {
        toast.error(result.error || 'Failed to create buyer')
      } else {
        toast.success('Buyer profile created')
        setShowModal(false)
        setForm(emptyForm)
        load()
      }
    } catch { toast.error('Failed to create buyer') }
    finally { setSaving(false) }
  }

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Buyers</h1>
          <p className="page-subtitle">Manage buyer profiles and their purchase history</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowModal(true) }}>
          <Plus size={16} /> New Buyer
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: 20, maxWidth: 420 }}>
        <Search size={15} />
        <input placeholder="Search by name, CNIC or phone..." value={query} onChange={e => setQuery(e.target.value)} />
        {query && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }} onClick={() => setQuery('')}><X size={14} /></button>}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Users size={28} /></div>
          <div className="empty-title">{query ? 'No buyers match' : 'No buyers yet'}</div>
          <div className="empty-desc">{query ? 'Try a different search term' : 'Add your first buyer profile'}</div>
          {!query && (
            <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowModal(true) }} style={{ marginTop: 8 }}>
              <Plus size={14} /> Add Buyer
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Buyer</th><th>CNIC</th><th>Phone</th><th>City</th><th>Plots</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/buyers/${b.id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {b.photo_path && isImagePath(b.photo_path) ? (
                        <img
                          src={`file://${b.photo_path}`}
                          alt={b.full_name}
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--green-dim)', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'var(--green-glow)', border: '1.5px solid var(--green-dim)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: 'var(--green-bright)', flexShrink: 0
                        }}>
                          {initials(b.full_name)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{b.full_name}</div>
                        {b.father_husband_name && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>S/o {b.father_husband_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{b.cnic || '—'}</td>
                  <td>{b.phone_primary || '—'}</td>
                  <td>{b.city || '—'}</td>
                  <td>
                    <span className="badge badge-master">{b.plot_count ?? 0} plots</span>
                  </td>
                  <td>{new Date(b.created_at).toLocaleDateString('en-PK')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New Buyer Profile</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required autoFocus placeholder="e.g. Muhammad Ali" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Father / Husband Name</label>
                    <input className="form-input" value={form.fatherHusbandName} onChange={e => setForm(f => ({ ...f, fatherHusbandName: e.target.value }))} placeholder="S/o or W/o" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">CNIC</label>
                    <input className="form-input" value={form.cnic} onChange={e => setForm(f => ({ ...f, cnic: e.target.value }))} placeholder="42101-1234567-8" maxLength={15} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Phone</label>
                    <input className="form-input" value={form.phonePrimary} onChange={e => setForm(f => ({ ...f, phonePrimary: e.target.value }))} placeholder="0300-1234567" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Secondary Phone</label>
                    <input className="form-input" value={form.phoneSecondary} onChange={e => setForm(f => ({ ...f, phoneSecondary: e.target.value }))} placeholder="Optional" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Optional" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Karachi" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea className="form-textarea" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} placeholder="Full postal address" />
                </div>

                <div style={{
                  margin: '8px 0 16px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                    Required attachments
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>
                    Attach the buyer&apos;s photo and CNIC / Passport front to complete the profile.
                  </p>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Buyer Photo *</label>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => pickAttachment('photo')} style={{ gap: 8 }}>
                        <ImageIcon size={14} /> {form.photoPath ? 'Change Photo' : 'Attach Photo'}
                      </button>
                      {form.photoPath && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isImagePath(form.photoPath) && (
                            <img src={`file://${form.photoPath}`} alt="Buyer photo" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
                          )}
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{fileName(form.photoPath)}</span>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">CNIC / Passport Front *</label>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => pickAttachment('id')} style={{ gap: 8 }}>
                        <Contact2 size={14} /> {form.idDocumentPath ? 'Change ID Document' : 'Attach ID Document'}
                      </button>
                      {form.idDocumentPath && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isImagePath(form.idDocumentPath) ? (
                            <img src={`file://${form.idDocumentPath}`} alt="ID document" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
                          ) : (
                            <div style={{ width: 56, height: 56, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
                              <Upload size={18} />
                            </div>
                          )}
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{fileName(form.idDocumentPath)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || !form.photoPath || !form.idDocumentPath}
                  >
                    {saving ? 'Saving...' : 'Create Buyer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

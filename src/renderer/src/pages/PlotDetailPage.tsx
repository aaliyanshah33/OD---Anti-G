import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, Upload, FileText, DollarSign, Clock, Download, Eye, Plus, X } from 'lucide-react'
import type { Plot, OwnershipRecord, Document, Payment } from '../types'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import MasterPasswordModal from '../components/MasterPasswordModal'

const DOC_TYPES = ['Sale Letter', 'Transfer Letter', 'Possession Letter', 'CNIC Copy', 'Receipt', 'Deed', 'Agreement', 'Other']
const PAYMENT_METHODS = ['Cash', 'Cheque', 'Bank Transfer', 'Online', 'Other']
const TRANSFER_TYPES = ['Sale', 'Transfer', 'Gift', 'Inheritance']

export default function PlotDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [plot, setPlot] = useState<Plot | null>(null)
  const [ownership, setOwnership] = useState<OwnershipRecord[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [buyers, setBuyers] = useState<{ id: string; full_name: string; cnic: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ownership' | 'documents' | 'payments'>('ownership')
  const [masterModal, setMasterModal] = useState<{ action: () => void; label: string } | null>(null)
  
  // Transfer modal
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferForm, setTransferForm] = useState({ buyerId: '', transferDate: new Date().toISOString().split('T')[0], transferPrice: '', transferType: 'Sale', notes: '' })
  
  // Payment modal
  const [showPayment, setShowPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ buyerId: '', amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', referenceNumber: '', notes: '' })
  
  // Document modal
  const [showDocUpload, setShowDocUpload] = useState(false)
  const [docForm, setDocForm] = useState({ docType: 'Sale Letter', filePath: '', originalName: '', mimeType: '' })
  
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [plt, own, docs, pays, buyerList] = await Promise.all([
        window.api.plots.getById(id),
        window.api.ownership.getByPlot(id),
        window.api.documents.getByPlot(id),
        window.api.payments.getByPlot(id),
        window.api.buyers.getAll()
      ])
      setPlot(plt)
      setOwnership(own)
      setDocuments(docs)
      setPayments(pays)
      setBuyers(buyerList)
    } catch { toast.error('Failed to load plot') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleTransfer = () => {
    if (!transferForm.buyerId) { toast.error('Select a buyer'); return }
    setMasterModal({
      label: 'Transfer ownership of this plot',
      action: async () => {
        setMasterModal(null)
        setSaving(true)
        try {
          await window.api.ownership.transfer({
            plotId: id!, buyerId: transferForm.buyerId,
            transferDate: transferForm.transferDate, transferPrice: +transferForm.transferPrice,
            transferType: transferForm.transferType, notes: transferForm.notes, authorizedBy: user!.id
          })
          toast.success('Ownership transferred successfully')
          setShowTransfer(false)
          load()
        } catch { toast.error('Transfer failed') }
        finally { setSaving(false) }
      }
    })
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.amount) return
    setSaving(true)
    try {
      const latestOwner = ownership[ownership.length - 1]
      await window.api.payments.create({
        plotId: id!, buyerId: latestOwner?.buyer_id || paymentForm.buyerId,
        amount: +paymentForm.amount, paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod, referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes, userId: user!.id
      })
      toast.success('Payment recorded')
      setShowPayment(false)
      load()
    } catch { toast.error('Failed to record payment') }
    finally { setSaving(false) }
  }

  const handlePickFile = async () => {
    const result = await window.api.documents.openFilePicker()
    if (!result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      const name = path.split(/[\\/]/).pop() || 'document'
      const ext = name.split('.').pop()?.toLowerCase() || ''
      const mimeMap: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      setDocForm(f => ({ ...f, filePath: path, originalName: name, mimeType: mimeMap[ext] || 'application/octet-stream' }))
    }
  }

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docForm.filePath) { toast.error('Select a file first'); return }
    setSaving(true)
    try {
      await window.api.documents.upload({ plotId: id!, docType: docForm.docType, userId: user!.id, filePath: docForm.filePath, originalName: docForm.originalName, mimeType: docForm.mimeType })
      toast.success('Document uploaded and encrypted')
      setShowDocUpload(false)
      setDocForm({ docType: 'Sale Letter', filePath: '', originalName: '', mimeType: '' })
      load()
    } catch { toast.error('Upload failed') }
    finally { setSaving(false) }
  }

  const handleViewDoc = (doc: Document) => {
    setMasterModal({
      label: `View document: ${doc.original_name}`,
      action: async () => {
        setMasterModal(null)
        try {
          const result = await window.api.documents.getContent({ docId: doc.id, userId: user!.id })
          if (result.success) {
            const blob = new Blob([Uint8Array.from(atob(result.data), c => c.charCodeAt(0))], { type: result.mimeType })
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
          }
        } catch { toast.error('Failed to load document') }
      }
    })
  }

  const statusColor: Record<string, string> = { Available: 'var(--available)', Reserved: 'var(--reserved)', Sold: 'var(--sold)', Transferred: 'var(--transferred)' }

  if (loading) return <div className="animate-page-in"><div className="skeleton" style={{ height: 100, borderRadius: 12 }} /></div>
  if (!plot) return <div>Plot not found</div>

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">Plot {plot.plot_number}</h1>
            <p className="page-subtitle">
              {plot.block && `Block ${plot.block} · `}{plot.street && `${plot.street} · `}
              {plot.size_marla > 0 && `${plot.size_marla} Marla · `}
              {plot.plot_type}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`badge badge-${plot.status.toLowerCase()}`} style={{ alignSelf: 'center', fontSize: 12, padding: '4px 14px' }}>{plot.status}</span>
          {user?.role === 'master' && (
            <button className="btn btn-primary" onClick={() => setShowTransfer(true)}>
              <ArrowLeftRight size={15} /> Transfer Ownership
            </button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Listed Price</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-bright)' }}>{plot.price > 0 ? `PKR ${(plot.price / 1000000).toFixed(1)}M` : 'N/A'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Paid</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: totalPaid > 0 ? '#3b82f6' : 'var(--text-3)' }}>{totalPaid > 0 ? `PKR ${(totalPaid / 1000).toFixed(0)}K` : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ownership Records</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{ownership.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Documents</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{documents.length}</div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {([{ key: 'ownership', label: 'Ownership History', icon: Clock }, { key: 'documents', label: 'Documents', icon: FileText }, { key: 'payments', label: 'Payments', icon: DollarSign }] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ gap: 6 }}
          >
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'ownership' && (
        <div>
          {ownership.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Clock size={24} /></div>
              <div className="empty-title">No ownership records</div>
              <div className="empty-desc">Transfer ownership to add the first owner</div>
            </div>
          ) : (
            <div className="timeline">
              {ownership.map((rec, i) => (
                <div key={rec.id} className="timeline-item">
                  <div className="timeline-badge">#{rec.sequence_number}</div>
                  <div className="timeline-body">
                    <div className="timeline-date">{new Date(rec.transfer_date).toLocaleDateString('en-PK', { dateStyle: 'medium' })} · {rec.transfer_type}</div>
                    <div className="timeline-name">{rec.buyer_name}</div>
                    <div className="timeline-detail">
                      CNIC: {rec.cnic} · {rec.transfer_price > 0 ? `PKR ${rec.transfer_price.toLocaleString()}` : 'Price not specified'}
                      {rec.authorized_by_username && ` · Authorized by ${rec.authorized_by_username}`}
                    </div>
                    {rec.notes && <div className="timeline-detail" style={{ marginTop: 4, fontStyle: 'italic' }}>{rec.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => setShowDocUpload(true)}><Upload size={14} /> Upload Document</button>
          </div>
          {documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><FileText size={24} /></div>
              <div className="empty-title">No documents</div>
              <div className="empty-desc">Upload sale letters, CNIC copies, deeds and more</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Type</th><th>File Name</th><th>Size</th><th>Uploaded</th><th>By</th><th></th></tr></thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id}>
                      <td><span className="badge badge-master">{doc.doc_type}</span></td>
                      <td><strong>{doc.original_name}</strong></td>
                      <td>{doc.file_size > 0 ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}</td>
                      <td>{new Date(doc.created_at).toLocaleDateString('en-PK')}</td>
                      <td>{doc.uploaded_by_username || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleViewDoc(doc)} title="View"><Eye size={13} /></button>
                          {user?.role === 'master' && (
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setMasterModal({ label: `Download ${doc.original_name}`, action: async () => { setMasterModal(null); await window.api.documents.download({ docId: doc.id, userId: user.id }) } })} title="Download"><Download size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Total Paid: <strong style={{ color: 'var(--green-bright)' }}>PKR {totalPaid.toLocaleString()}</strong></div>
            <button className="btn btn-primary" onClick={() => setShowPayment(true)}><Plus size={14} /> Record Payment</button>
          </div>
          {payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><DollarSign size={24} /></div>
              <div className="empty-title">No payments</div>
              <div className="empty-desc">Record payments against this plot</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Ref</th><th>Buyer</th><th>Notes</th></tr></thead>
                <tbody>
                  {payments.map(pay => (
                    <tr key={pay.id}>
                      <td>{new Date(pay.payment_date).toLocaleDateString('en-PK')}</td>
                      <td><strong style={{ color: 'var(--green-bright)' }}>PKR {pay.amount.toLocaleString()}</strong></td>
                      <td>{pay.payment_method}</td>
                      <td>{pay.reference_number || '—'}</td>
                      <td>{pay.buyer_name || '—'}</td>
                      <td style={{ maxWidth: 200 }} className="truncate">{pay.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="modal-overlay" onClick={() => setShowTransfer(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Transfer Ownership</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTransfer(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">New Owner (Buyer) *</label>
                <select className="form-select" value={transferForm.buyerId} onChange={e => setTransferForm(f => ({ ...f, buyerId: e.target.value }))}>
                  <option value="">— Select Buyer —</option>
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.full_name} ({b.cnic})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Transfer Date *</label>
                  <input type="date" className="form-input" value={transferForm.transferDate} onChange={e => setTransferForm(f => ({ ...f, transferDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Transfer Type</label>
                  <select className="form-select" value={transferForm.transferType} onChange={e => setTransferForm(f => ({ ...f, transferType: e.target.value }))}>
                    {TRANSFER_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Transfer Price (PKR)</label>
                <input type="number" className="form-input" value={transferForm.transferPrice} onChange={e => setTransferForm(f => ({ ...f, transferPrice: e.target.value }))} placeholder="0" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={transferForm.notes} onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12, color: '#f59e0b', marginBottom: 4 }}>
                ⚠️ This will permanently append a new ownership record. Previous owners are preserved forever.
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowTransfer(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleTransfer} disabled={!transferForm.buyerId}>Transfer (Requires Master Password)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Record Payment</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPayment(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handlePayment}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount (PKR) *</label>
                    <input type="number" className="form-input" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min="0" required autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={paymentForm.paymentDate} onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={paymentForm.paymentMethod} onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                      {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference / Cheque No.</label>
                    <input className="form-input" value={paymentForm.referenceNumber} onChange={e => setPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="Optional" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocUpload && (
        <div className="modal-overlay" onClick={() => setShowDocUpload(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Upload Document</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDocUpload(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleDocUpload}>
                <div className="form-group">
                  <label className="form-label">Document Type</label>
                  <select className="form-select" value={docForm.docType} onChange={e => setDocForm(f => ({ ...f, docType: e.target.value }))}>
                    {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">File</label>
                  <div
                    onClick={handlePickFile}
                    style={{
                      border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
                      padding: '20px', textAlign: 'center', cursor: 'pointer',
                      transition: 'var(--transition)', color: 'var(--text-3)', fontSize: 13
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green-dim)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {docForm.originalName ? (
                      <><FileText size={20} style={{ color: 'var(--green)', marginBottom: 6 }} /><div style={{ color: 'var(--text)', fontWeight: 600 }}>{docForm.originalName}</div></>
                    ) : (
                      <><Upload size={20} style={{ marginBottom: 6 }} /><div>Click to select file (PDF, JPG, PNG)</div></>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDocUpload(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !docForm.filePath}>{saving ? 'Encrypting & Uploading...' : 'Upload & Encrypt'}</button>
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

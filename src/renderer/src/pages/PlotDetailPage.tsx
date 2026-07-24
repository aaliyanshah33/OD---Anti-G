import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, Upload, FileText, DollarSign, Clock, Download, Eye, Plus, X, Pencil } from 'lucide-react'
import type { Plot, OwnershipRecord, Document, Payment } from '../types'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import MasterPasswordModal from '../components/MasterPasswordModal'
import { DEFAULT_PLOT_OWNER } from '../../../shared/plotOwnership'

const DOC_TYPES = ['Sale Letter', 'Transfer Letter', 'Possession Letter', 'CNIC Copy', 'Receipt', 'Deed', 'Agreement', 'Other']
const PAYMENT_METHODS = ['Cash', 'Cheque', 'Bank Transfer', 'Online', 'Other']
const TRANSFER_TYPES = ['Sale', 'Transfer', 'Gift', 'Inheritance']

const MIME_FROM_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

function fileMetaFromPath(path: string): { originalName: string; mimeType: string } {
  const originalName = path.split(/[\\/]/).pop() || 'document'
  const ext = originalName.split('.').pop()?.toLowerCase() || ''
  return { originalName, mimeType: MIME_FROM_EXT[ext] || 'application/octet-stream' }
}

interface DocPreviewState {
  title: string
  mimeType: string
  dataUrl: string
}

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
  
  // Document upload / update
  const [showDocUpload, setShowDocUpload] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [docForm, setDocForm] = useState({ docType: 'Sale Letter', filePath: '', originalName: '', mimeType: '' })
  const [docPreview, setDocPreview] = useState<DocPreviewState | null>(null)
  
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
      const meta = fileMetaFromPath(path)
      setDocForm(f => ({ ...f, filePath: path, ...meta }))
    }
  }

  const resetDocForm = () => {
    setDocForm({ docType: 'Sale Letter', filePath: '', originalName: '', mimeType: '' })
    setEditingDoc(null)
    setShowDocUpload(false)
  }

  const openUploadDoc = () => {
    setEditingDoc(null)
    setDocForm({ docType: 'Sale Letter', filePath: '', originalName: '', mimeType: '' })
    setShowDocUpload(true)
  }

  const openEditDoc = (doc: Document) => {
    setMasterModal({
      label: `Update document: ${doc.original_name}`,
      action: () => {
        setMasterModal(null)
        setEditingDoc(doc)
        setDocForm({ docType: doc.doc_type, filePath: '', originalName: '', mimeType: '' })
        setShowDocUpload(true)
      }
    })
  }

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDoc && !docForm.filePath) { toast.error('Select a file first'); return }
    if (editingDoc && !docForm.filePath && docForm.docType === editingDoc.doc_type) {
      toast.error('Change the document type or select a new file to update')
      return
    }
    setSaving(true)
    try {
      if (editingDoc) {
        const result = await window.api.documents.update({
          docId: editingDoc.id,
          docType: docForm.docType,
          userId: user!.id,
          filePath: docForm.filePath || undefined,
          originalName: docForm.originalName || undefined,
          mimeType: docForm.mimeType || undefined
        })
        if (result?.success === false) {
          toast.error(result.error || 'Update failed')
        } else {
          toast.success('Document updated')
          resetDocForm()
          load()
        }
      } else {
        await window.api.documents.upload({
          plotId: id!,
          docType: docForm.docType,
          userId: user!.id,
          filePath: docForm.filePath,
          originalName: docForm.originalName,
          mimeType: docForm.mimeType
        })
        toast.success('Document uploaded and encrypted')
        resetDocForm()
        load()
      }
    } catch { toast.error(editingDoc ? 'Update failed' : 'Upload failed') }
    finally { setSaving(false) }
  }

  const handleViewDoc = (doc: Document) => {
    setMasterModal({
      label: `Preview document: ${doc.original_name}`,
      action: async () => {
        setMasterModal(null)
        try {
          const result = await window.api.documents.getContent({ docId: doc.id, userId: user!.id })
          if (!result.success) {
            toast.error(result.error || 'Failed to load document')
            return
          }
          const mimeType = result.mimeType || 'application/octet-stream'
          setDocPreview({
            title: result.originalName || doc.original_name,
            mimeType,
            dataUrl: `data:${mimeType};base64,${result.data}`
          })
        } catch { toast.error('Failed to load document') }
      }
    })
  }

  const handleDownloadDoc = (doc: Document) => {
    setMasterModal({
      label: `Download ${doc.original_name}`,
      action: async () => {
        setMasterModal(null)
        try {
          const result = await window.api.documents.download({ docId: doc.id, userId: user!.id })
          if (result?.canceled) return
          if (result?.success) toast.success(`Saved as original format: ${doc.original_name}`)
          else toast.error(result?.error || 'Download failed')
        } catch { toast.error('Download failed') }
      }
    })
  }

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
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-badge">#0</div>
                <div className="timeline-body">
                  <div className="timeline-date">Default ownership · Developer held</div>
                  <div className="timeline-name">{DEFAULT_PLOT_OWNER}</div>
                  <div className="timeline-detail">
                    This plot has not been sold or transferred. Ownership remains with {DEFAULT_PLOT_OWNER}.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="timeline">
              {ownership.map((rec) => (
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
            <button className="btn btn-primary" onClick={openUploadDoc}><Upload size={14} /> Upload Document</button>
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
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleViewDoc(doc)} title="Preview"><Eye size={13} /></button>
                          {user?.role === 'master' && (
                            <>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditDoc(doc)} title="Update"><Pencil size={13} /></button>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDownloadDoc(doc)} title="Download"><Download size={13} /></button>
                            </>
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

      {/* Document Upload / Update Modal */}
      {showDocUpload && (
        <div className="modal-overlay" onClick={resetDocForm}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingDoc ? 'Update Document' : 'Upload Document'}</span>
              <button className="btn btn-ghost btn-icon" onClick={resetDocForm}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleDocUpload}>
                {editingDoc && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>
                    Updating <strong style={{ color: 'var(--text)' }}>{editingDoc.original_name}</strong>.
                    You can change the type and/or replace the file. The replacement keeps the original format (PDF, JPG, etc.).
                  </p>
                )}
                <div className="form-group">
                  <label className="form-label">Document Type</label>
                  <select className="form-select" value={docForm.docType} onChange={e => setDocForm(f => ({ ...f, docType: e.target.value }))}>
                    {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{editingDoc ? 'Replace File (optional)' : 'File'}</label>
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
                    ) : editingDoc ? (
                      <><Upload size={20} style={{ marginBottom: 6 }} /><div>Click to choose a new file, or leave empty to keep the current file</div></>
                    ) : (
                      <><Upload size={20} style={{ marginBottom: 6 }} /><div>Click to select file (PDF, JPG, PNG)</div></>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={resetDocForm}>Cancel</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || (!editingDoc && !docForm.filePath)}
                  >
                    {saving
                      ? (editingDoc ? 'Updating...' : 'Encrypting & Uploading...')
                      : (editingDoc ? 'Update Document' : 'Upload & Encrypt')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* In-app document preview */}
      {docPreview && (
        <div className="modal-overlay" onClick={() => setDocPreview(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 900, width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <span className="modal-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                Preview — {docPreview.title}
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => setDocPreview(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', minHeight: 360, background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
              {docPreview.mimeType.startsWith('image/') ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                  <img
                    src={docPreview.dataUrl}
                    alt={docPreview.title}
                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
                  />
                </div>
              ) : docPreview.mimeType === 'application/pdf' ? (
                <iframe
                  title={docPreview.title}
                  src={docPreview.dataUrl}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8, background: '#fff' }}
                />
              ) : (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-icon"><FileText size={28} /></div>
                  <div className="empty-title">Preview not available for this file type</div>
                  <div className="empty-desc">Download the file to open it in an external application.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {masterModal && <MasterPasswordModal action={masterModal.label} onConfirm={masterModal.action} onCancel={() => setMasterModal(null)} />}
    </div>
  )
}

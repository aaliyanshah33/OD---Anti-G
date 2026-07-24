import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, MapPin, Grid, List, Filter, X, Edit2, Trash2, ArrowLeftRight } from 'lucide-react'
import type { Project, Plot } from '../types'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import MasterPasswordModal from '../components/MasterPasswordModal'
import { getPlotOwnerDisplayName } from '../../../shared/plotOwnership'

const STATUS_OPTIONS = ['Available', 'Reserved', 'Sold', 'Transferred']
const PLOT_TYPES = ['Residential', 'Commercial', 'Industrial', 'Mixed']

export default function ProjectDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [plots, setPlots] = useState<Plot[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterStatus, setFilterStatus] = useState<string>('All')
  const [showModal, setShowModal] = useState(false)
  const [editPlot, setEditPlot] = useState<Plot | null>(null)
  const [masterModal, setMasterModal] = useState<{ action: () => void; label: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    plotNumber: '', block: '', street: '',
    sizeMarla: '', sizeSqft: '', widthFt: '', lengthFt: '', plotType: 'Residential',
    price: '', status: 'Available', notes: ''
  })

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [proj, pls] = await Promise.all([
        window.api.projects.getById(id),
        window.api.plots.getByProject(id)
      ])
      setProject(proj)
      setPlots(pls)
    } catch { toast.error('Failed to load project') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const filteredPlots = filterStatus === 'All' ? plots : plots.filter(p => p.status === filterStatus)

  const openCreate = () => {
    setEditPlot(null)
    setForm({ plotNumber: '', block: '', street: '', sizeMarla: '', sizeSqft: '', widthFt: '', lengthFt: '', plotType: 'Residential', price: '', status: 'Available', notes: '' })
    setShowModal(true)
  }

  const openEdit = (plot: Plot) => {
    if (user?.role !== 'master') { toast.error('Master password required to edit'); return }
    setMasterModal({
      label: `Edit plot ${plot.plot_number}`,
      action: () => {
        setMasterModal(null)
        setEditPlot(plot)
        setForm({
          plotNumber: plot.plot_number, block: plot.block, street: plot.street,
          sizeMarla: String(plot.size_marla), sizeSqft: String(plot.size_sqft),
          widthFt: String(plot.width_ft ?? ''), lengthFt: String(plot.length_ft ?? ''),
          plotType: plot.plot_type, price: String(plot.price), status: plot.status, notes: plot.notes
        })
        setShowModal(true)
      }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.plotNumber.trim()) return
    setSaving(true)
    try {
      const data = { ...form, projectId: id!, sizeMarla: +form.sizeMarla, sizeSqft: +form.sizeSqft, widthFt: +form.widthFt, lengthFt: +form.lengthFt, price: +form.price, userId: user!.id }
      if (editPlot) {
        await window.api.plots.update({ id: editPlot.id, data, userId: user!.id })
        toast.success('Plot updated')
      } else {
        await window.api.plots.create(data)
        toast.success('Plot added')
      }
      setShowModal(false)
      load()
    } catch { toast.error('Failed to save plot') }
    finally { setSaving(false) }
  }

  const handleDelete = (plot: Plot) => {
    setMasterModal({
      label: `Delete plot ${plot.plot_number}`,
      action: async () => {
        try {
          await window.api.plots.delete({ id: plot.id, userId: user!.id })
          toast.success('Plot deleted')
          load()
        } catch { toast.error('Failed to delete plot') }
        setMasterModal(null)
      }
    })
  }

  const statusColor: Record<string, string> = {
    Available: 'var(--available)', Reserved: 'var(--reserved)',
    Sold: 'var(--sold)', Transferred: 'var(--transferred)'
  }

  if (loading) return <div className="animate-page-in"><div className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 20 }} /></div>
  if (!project) return <div>Project not found</div>

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/projects')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.theme_color }} />
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Project</span>
            </div>
            <h1 className="page-title">{project.name}</h1>
            {project.location && (
              <p className="page-subtitle"><MapPin size={12} style={{ display: 'inline' }} /> {project.location}</p>
            )}
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Plot
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[{ label: 'Total', value: plots.length, color: 'var(--text-2)' },
          { label: 'Available', value: project.available_plots, color: 'var(--available)' },
          { label: 'Reserved', value: project.reserved_plots, color: 'var(--reserved)' },
          { label: 'Sold', value: project.sold_plots, color: 'var(--sold)' },
          { label: 'Transferred', value: project.transferred_plots, color: 'var(--transferred)' }
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilterStatus(filterStatus === s.label ? 'All' : s.label)}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-full)',
              background: filterStatus === s.label ? `${s.color}20` : 'var(--surface)',
              border: `1px solid ${filterStatus === s.label ? `${s.color}50` : 'var(--border)'}`,
              color: s.color, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800 }}>{s.value}</span>
            <span>{s.label}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className={`btn btn-icon ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('grid')}><Grid size={15} /></button>
          <button className={`btn btn-icon ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('list')}><List size={15} /></button>
        </div>
      </div>

      {/* Plots */}
      {filteredPlots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><MapPin size={28} /></div>
          <div className="empty-title">No plots</div>
          <div className="empty-desc">{filterStatus !== 'All' ? `No ${filterStatus} plots` : 'Add your first plot'}</div>
          {filterStatus !== 'All' ? <button className="btn btn-secondary btn-sm" onClick={() => setFilterStatus('All')}>Show All</button> : <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Plot</button>}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="plot-grid">
          {filteredPlots.map(plot => (
            <div
              key={plot.id}
              className={`plot-cell ${plot.status.toLowerCase()}`}
              onClick={() => navigate(`/plots/${plot.id}`)}
              title={`Plot ${plot.plot_number} — ${plot.status} — ${getPlotOwnerDisplayName(plot.current_owner_name)}`}
            >
              <div className="plot-number">{plot.plot_number}</div>
              {plot.block && <div className="plot-block">Block {plot.block}</div>}
              {plot.size_marla > 0 && <div className="plot-size">{plot.size_marla}M</div>}
              <div style={{ position: 'absolute', bottom: 4, right: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[plot.status] }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Plot No.</th>
                <th>Block</th>
                <th>Street</th>
                <th>Size</th>
                <th>Type</th>
                <th>Price</th>
                <th>Status</th>
                <th>Owner</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPlots.map(plot => (
                <tr key={plot.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/plots/${plot.id}`)}>
                  <td><strong>{plot.plot_number}</strong></td>
                  <td>{plot.block || '—'}</td>
                  <td>{plot.street || '—'}</td>
                  <td>{plot.size_marla > 0 ? `${plot.size_marla} Marla` : '—'}</td>
                  <td>{plot.plot_type}</td>
                  <td>{plot.price > 0 ? `PKR ${plot.price.toLocaleString()}` : '—'}</td>
                  <td>
                    <span className={`badge badge-${plot.status.toLowerCase()}`}>{plot.status}</span>
                  </td>
                  <td>{getPlotOwnerDisplayName(plot.current_owner_name)}</td>
                  <td onClick={e => e.stopPropagation()} style={{ width: 80 }}>
                    {user?.role === 'master' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(plot)}><Edit2 size={12} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(plot)}><Trash2 size={12} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plot Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editPlot ? 'Edit Plot' : 'Add New Plot'}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Plot Number *</label>
                    <input className="form-input" value={form.plotNumber} onChange={e => setForm(f => ({ ...f, plotNumber: e.target.value }))} placeholder="e.g. A-01" required autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Block</label>
                    <input className="form-input" value={form.block} onChange={e => setForm(f => ({ ...f, block: e.target.value }))} placeholder="e.g. A" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Street</label>
                    <input className="form-input" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="e.g. Street 5" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Size (Marla)</label>
                    <input type="number" className="form-input" value={form.sizeMarla} onChange={e => setForm(f => ({ ...f, sizeMarla: e.target.value }))} placeholder="5" min="0" step="0.5" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Size (Sq.Ft)</label>
                    <input type="number" className="form-input" value={form.sizeSqft} onChange={e => setForm(f => ({ ...f, sizeSqft: e.target.value }))} placeholder="1125" min="0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Width (Ft)</label>
                    <input type="number" className="form-input" value={form.widthFt} onChange={e => setForm(f => ({ ...f, widthFt: e.target.value }))} placeholder="25" min="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Length (Ft)</label>
                    <input type="number" className="form-input" value={form.lengthFt} onChange={e => setForm(f => ({ ...f, lengthFt: e.target.value }))} placeholder="45" min="0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Plot Type</label>
                    <select className="form-select" value={form.plotType} onChange={e => setForm(f => ({ ...f, plotType: e.target.value }))}>
                      {PLOT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price (PKR)</label>
                    <input type="number" className="form-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="5000000" min="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editPlot ? 'Update Plot' : 'Add Plot'}</button>
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

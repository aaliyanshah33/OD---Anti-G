import React, { useEffect, useState } from 'react'
import { Plus, MapPin, FolderOpen, MoreVertical, Edit2, Trash2, X } from 'lucide-react'
import type { Project } from '../types'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import MasterPasswordModal from '../components/MasterPasswordModal'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#2fd44f', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6']

export default function ProjectsPage(): React.ReactElement {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [masterModal, setMasterModal] = useState<{ action: () => void; label: string } | null>(null)
  const [form, setForm] = useState({ name: '', location: '', description: '', themeColor: '#2fd44f', logoPath: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setProjects(await window.api.projects.getAll()) }
    catch { toast.error('Failed to load projects') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditProject(null)
    setForm({ name: '', location: '', description: '', themeColor: '#2fd44f', logoPath: '' })
    setShowModal(true)
  }

  const openEdit = (p: Project) => {
    setEditProject(p)
    setForm({ name: p.name, location: p.location, description: p.description, themeColor: p.theme_color, logoPath: p.logo_path || '' })
    setShowModal(true)
  }

  const handleLogoPick = async () => {
    const result = await window.api.projects.selectLogo()
    if (result?.success && result.path) {
      setForm(f => ({ ...f, logoPath: result.path }))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editProject) {
        await window.api.projects.update({ id: editProject.id, data: form, userId: user!.id })
        toast.success('Project updated')
      } else {
        await window.api.projects.create({ ...form, userId: user!.id })
        toast.success('Project created')
      }
      setShowModal(false)
      load()
    } catch { toast.error('Failed to save project') }
    finally { setSaving(false) }
  }

  const handleDelete = (p: Project) => {
    setMasterModal({
      label: `Delete project "${p.name}"`,
      action: async () => {
        try {
          await window.api.projects.delete({ id: p.id, userId: user!.id })
          toast.success('Project deleted')
          load()
        } catch { toast.error('Failed to delete') }
        setMasterModal(null)
      }
    })
  }

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage housing projects and their plot inventories</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="grid-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FolderOpen size={28} /></div>
          <div className="empty-title">No projects yet</div>
          <div className="empty-desc">Create your first housing project to get started</div>
          <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}><Plus size={15} /> Create Project</button>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map(p => (
            <div
              key={p.id}
              className="card-glow hover-lift"
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <div onClick={() => navigate(`/projects/${p.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 14,
                    background: p.logo_path ? 'transparent' : `${p.theme_color}20`,
                    border: p.logo_path ? '1px solid var(--border)' : `2px solid ${p.theme_color}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: p.theme_color, flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {p.logo_path ? (
                      <img src={`file://${p.logo_path}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <FolderOpen size={18} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }} className="truncate">{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} /> {p.location || 'No location'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Total', value: p.total_plots, color: 'var(--text-2)' },
                    { label: 'Avail', value: p.available_plots, color: 'var(--available)' },
                    { label: 'Sold', value: p.sold_plots, color: 'var(--sold)' },
                    { label: 'Res', value: p.reserved_plots, color: 'var(--reserved)' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
                      padding: '6px 4px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {p.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }} className="truncate">{p.description}</p>
                )}
              </div>

              {user?.role === 'master' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)} style={{ flex: 1 }}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editProject ? 'Edit Project' : 'New Project'}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Green Valley Phase 1" required autoFocus />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City/Area" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Theme Color</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {COLORS.map(c => (
                        <div
                          key={c}
                          onClick={() => setForm(f => ({ ...f, themeColor: c }))}
                          style={{
                            width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                            border: form.themeColor === c ? `3px solid white` : '3px solid transparent',
                            boxShadow: form.themeColor === c ? `0 0 8px ${c}80` : 'none'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Project Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogoPick}>
                      {form.logoPath ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    {form.logoPath && (
                      <div style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={`file://${form.logoPath}`} alt="Project logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                    Upload a logo or image so this project can be identified quickly in the dashboard.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={3} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editProject ? 'Update Project' : 'Create Project'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {masterModal && (
        <MasterPasswordModal
          action={masterModal.label}
          onConfirm={masterModal.action}
          onCancel={() => setMasterModal(null)}
        />
      )}
    </div>
  )
}

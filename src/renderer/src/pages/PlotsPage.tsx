import React, { useEffect, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Plot, Project } from '../types'
import { toast } from '../stores/toastStore'
import { getPlotOwnerDisplayName } from '../../../shared/plotOwnership'

export default function PlotsPage(): React.ReactElement {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterProject, setFilterProject] = useState('All')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const projs = await window.api.projects.getAll()
        setProjects(projs)
        const allPlots: Plot[] = []
        for (const p of projs) {
          const pp = await window.api.plots.getByProject(p.id)
          allPlots.push(...pp)
        }
        setPlots(allPlots)
      } catch { toast.error('Failed to load plots') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const filtered = plots.filter(p => {
    const ownerName = getPlotOwnerDisplayName(p.current_owner_name)
    const q = query.toLowerCase()
    const matchQ = !query
      || p.plot_number.toLowerCase().includes(q)
      || (p.block && p.block.toLowerCase().includes(q))
      || ownerName.toLowerCase().includes(q)
    const matchS = filterStatus === 'All' || p.status === filterStatus
    const matchP = filterProject === 'All' || p.project_id === filterProject
    return matchQ && matchS && matchP
  })

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Plots</h1>
          <p className="page-subtitle">View and filter plots across all projects</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={14} />
          <input placeholder="Plot number, block, owner..." value={query} onChange={e => setQuery(e.target.value)} />
          {query && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }} onClick={() => setQuery('')}><X size={13} /></button>}
        </div>
        <select className="form-select" style={{ width: 160 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="All">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          {['All', 'Available', 'Reserved', 'Sold', 'Transferred'].map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>{filtered.length} plots</span>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Plot</th><th>Block</th><th>Project</th><th>Size</th><th>Price</th><th>Status</th><th>Owner</th></tr></thead>
            <tbody>
              {filtered.map(p => {
                const proj = projects.find(pr => pr.id === p.project_id)
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/plots/${p.id}`)}>
                    <td><strong>{p.plot_number}</strong></td>
                    <td>{p.block || '—'}</td>
                    <td style={{ color: 'var(--text-2)' }}>{proj?.name || '—'}</td>
                    <td>{p.size_marla > 0 ? `${p.size_marla} M` : '—'}</td>
                    <td>{p.price > 0 ? `PKR ${(p.price/1000000).toFixed(1)}M` : '—'}</td>
                    <td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
                    <td>{getPlotOwnerDisplayName(p.current_owner_name)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><MapPin size={24} /></div>
              <div className="empty-title">No plots match</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

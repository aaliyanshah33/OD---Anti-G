import React, { useState, useRef } from 'react'
import { Search, Users, MapPin, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function SearchPage(): React.ReactElement {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ buyers: unknown[]; plots: unknown[]; projects: unknown[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleSearch = async (q: string) => {
    setQuery(q)
    clearTimeout(timerRef.current)
    if (q.trim().length < 2) { setResults(null); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await window.api.search.global({ query: q, userId: user!.id })
        setResults(r)
      } catch { } finally { setLoading(false) }
    }, 300)
  }

  const total = (results?.buyers.length ?? 0) + (results?.plots.length ?? 0) + (results?.projects.length ?? 0)

  return (
    <div className="animate-page-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Universal Search</h1>
          <p className="page-subtitle">Search across all buyers, plots and projects instantly</p>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: 28, maxWidth: 560 }}>
        <Search size={16} style={{ color: 'var(--green)' }} />
        <input
          placeholder="Search by name, CNIC, plot number, phone..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          autoFocus
          style={{ fontSize: 15 }}
        />
        {loading && <div className="spinner" style={{ flexShrink: 0 }} />}
      </div>

      {results && query.length >= 2 && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20, fontWeight: 500 }}>
          {total === 0 ? 'No results found' : `${total} result${total !== 1 ? 's' : ''} found`}
        </div>
      )}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Buyers */}
          {results.buyers.length > 0 && (
            <div>
              <div className="section-header"><span className="section-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Users size={15} style={{ color: 'var(--green)' }} />Buyers</span><span className="section-count">{results.buyers.length}</span></div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Name</th><th>CNIC</th><th>Phone</th><th>City</th></tr></thead>
                  <tbody>
                    {(results.buyers as { id: string; full_name: string; cnic: string; phone_primary: string; city: string }[]).map(b => (
                      <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/buyers/${b.id}`)}>
                        <td><strong>{b.full_name}</strong></td>
                        <td>{b.cnic}</td>
                        <td>{b.phone_primary}</td>
                        <td>{b.city}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Plots */}
          {results.plots.length > 0 && (
            <div>
              <div className="section-header"><span className="section-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={15} style={{ color: 'var(--green)' }} />Plots</span><span className="section-count">{results.plots.length}</span></div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Plot No.</th><th>Block</th><th>Project</th><th>Status</th></tr></thead>
                  <tbody>
                    {(results.plots as { id: string; plot_number: string; block: string; project_name: string; status: string }[]).map(p => (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/plots/${p.id}`)}>
                        <td><strong>{p.plot_number}</strong></td>
                        <td>{p.block || '—'}</td>
                        <td>{p.project_name}</td>
                        <td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <div className="section-header"><span className="section-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><FolderOpen size={15} style={{ color: 'var(--green)' }} />Projects</span><span className="section-count">{results.projects.length}</span></div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(results.projects as { id: string; name: string; location: string }[]).map(p => (
                  <div key={p.id} className="card-glow hover-lift" style={{ cursor: 'pointer', minWidth: 200 }} onClick={() => navigate(`/projects/${p.id}`)}>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}><MapPin size={11} style={{ display: 'inline' }} /> {p.location}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!results && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon" style={{ width: 72, height: 72 }}><Search size={32} /></div>
          <div className="empty-title">Search the entire system</div>
          <div className="empty-desc">Type at least 2 characters to search buyers, plots, and projects</div>
        </div>
      )}
    </div>
  )
}

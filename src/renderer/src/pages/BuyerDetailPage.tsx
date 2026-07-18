import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Mail, CreditCard, Home } from 'lucide-react'
import type { Buyer, OwnershipRecord } from '../types'
import { toast } from '../stores/toastStore'

export default function BuyerDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [ownerships, setOwnerships] = useState<OwnershipRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const [b, own] = await Promise.all([window.api.buyers.getById(id), window.api.ownership.getByBuyer(id)])
        setBuyer(b)
        setOwnerships(own)
      } catch { toast.error('Failed to load buyer') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  if (loading) return <div className="animate-page-in"><div className="skeleton" style={{ height: 100, borderRadius: 12 }} /></div>
  if (!buyer) return <div>Buyer not found</div>

  const initials = buyer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="animate-page-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/buyers')}><ArrowLeft size={16} /></button>
        <h1 className="page-title">Buyer Profile</h1>
      </div>

      <div className="grid-2">
        {/* Profile card */}
        <div className="card-glow">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--green-glow)', border: '2px solid var(--green-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: 'var(--green-bright)'
            }}>{initials}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{buyer.full_name}</div>
              {buyer.father_husband_name && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>S/o — W/o {buyer.father_husband_name}</div>}
            </div>
          </div>

          {[{ icon: CreditCard, label: 'CNIC', value: buyer.cnic },
            { icon: Phone, label: 'Phone', value: buyer.phone_primary },
            { icon: Phone, label: 'Alt Phone', value: buyer.phone_secondary },
            { icon: Mail, label: 'Email', value: buyer.email },
            { icon: MapPin, label: 'City', value: buyer.city },
            { icon: Home, label: 'Address', value: buyer.address },
          ].filter(item => item.value).map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ color: 'var(--text-3)', marginTop: 1 }}><item.icon size={14} /></div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{item.value}</div>
              </div>
            </div>
          ))}
          {buyer.notes && (
            <div style={{ marginTop: 12, padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-3)' }}>
              {buyer.notes}
            </div>
          )}
        </div>

        {/* Ownership history */}
        <div>
          <div className="section-header">
            <span className="section-title">Owned Plots</span>
            <span className="section-count">{ownerships.length}</span>
          </div>
          {ownerships.length === 0 ? (
            <div className="empty-state"><div className="empty-icon"><MapPin size={22} /></div><div className="empty-title">No plots yet</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ownerships.map(o => (
                <div
                  key={o.id}
                  className="card-glow hover-lift"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/plots/${o.plot_id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ color: 'var(--text)', fontSize: 14 }}>Plot {o.plot_number}</strong>
                    <span className={`badge badge-${o.status?.toLowerCase()}`}>{o.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {o.project_name} · Block {o.block} · {o.size_marla} Marla
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    {o.transfer_type} on {new Date(o.transfer_date).toLocaleDateString('en-PK')}
                    {o.transfer_price > 0 && ` · PKR ${o.transfer_price.toLocaleString()}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { fmtDateWithDay } from '@/lib/dateUtils'

type Status = 'warming' | 'dm_sent' | 'replied' | 'call_booked' | 'proposal_sent' | 'closed_won' | 'closed_lost'

type Prospect = {
  id: string; name: string; url: string; followers: string; niche: string;
  status: Status; notes: string; dateAdded: string; commentCount: number;
}

const STATUS_LABELS: Record<Status, string> = {
  warming: 'Warming', dm_sent: 'DM Sent', replied: 'Replied',
  call_booked: 'Call Booked', proposal_sent: 'Proposal Sent',
  closed_won: 'Closed Won', closed_lost: 'Closed Lost',
}

const STATUS_COLORS: Record<Status, string> = {
  warming: '#8a7340', dm_sent: '#7a8fbc', replied: '#f26419',
  call_booked: '#9b7fd4', proposal_sent: '#c4a842',
  closed_won: '#5d9c70', closed_lost: '#c0504d',
}

const STATUSES = Object.keys(STATUS_LABELS) as Status[]
const BG = 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=2560&q=80'

export default function Outreach() {
  const [dms, setDms] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem('bl-outreach-dms') || '0') } catch { return 0 }
  })
  const [comments, setComments] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem('bl-outreach-comments') || '0') } catch { return 0 }
  })
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [prospects, setProspects] = useState<Prospect[]>(() => {
    try { return JSON.parse(localStorage.getItem('bl-outreach-prospects') || '[]') } catch { return [] }
  })
  const [showAdd, setShowAdd] = useState(false)
  const [newP, setNewP] = useState({ name: '', url: '', followers: '', niche: '', notes: '' })

  useEffect(() => { localStorage.setItem('bl-outreach-prospects', JSON.stringify(prospects)) }, [prospects])
  useEffect(() => { localStorage.setItem('bl-outreach-dms', JSON.stringify(dms)) }, [dms])
  useEffect(() => { localStorage.setItem('bl-outreach-comments', JSON.stringify(comments)) }, [comments])

  const addProspect = () => {
    if (!newP.name) return
    const p: Prospect = {
      ...newP,
      id: Date.now().toString(),
      status: 'warming',
      dateAdded: new Date().toLocaleDateString(),
      commentCount: 0,
    }
    setProspects(prev => [p, ...prev])
    setNewP({ name: '', url: '', followers: '', niche: '', notes: '' })
    setShowAdd(false)
  }

  const updateStatus = (id: string, status: Status) => {
    setProspects(prev => prev.map(p => {
      if (p.id !== id) return p
      if (status === 'dm_sent' && p.status === 'warming') setDms(d => d + 1)
      return { ...p, status }
    }))
  }

  const deleteProspect = (id: string) => {
    setProspects(prev => prev.filter(p => p.id !== id))
  }

  const logComment = (id: string) => {
    setProspects(prev => prev.map(p =>
      p.id === id ? { ...p, commentCount: p.commentCount + 1 } : p
    ))
    setComments(c => c + 1)
  }

  const filtered = filter === 'all' ? prospects : prospects.filter(p => p.status === filter)
  const warmingCount = prospects.filter(p => p.status === 'warming').length

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.25rem', fontWeight: '700', color: 'var(--color-text)' }}>Outreach</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginTop: '0.25rem' }}>Prospect pipeline and daily activity</p>
            </div>
          </div>

          {/* Daily counters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'DMs Sent Today', value: dms, target: 10 },
              { label: 'Comments Today', value: comments, target: 10 },
            ].map((c, i) => (
              <div key={i} className="card" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>{c.label}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', fontWeight: '700', color: c.value >= c.target ? '#5d9c70' : '#c0504d', lineHeight: 1 }}>
                    {c.value}<span style={{ fontSize: '1rem', color: 'var(--color-text-placeholder)' }}>/{c.target}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => i === 0 ? setDms(d => Math.max(0, d - 1)) : setComments(d => Math.max(0, d - 1))}
                    style={{ flex: 1, padding: '0.375rem', border: '1px solid var(--color-border-subtle)', background: 'transparent', color: 'var(--color-text-dim)', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem' }}>−</button>
                  <button onClick={() => i === 0 ? setDms(d => d + 1) : setComments(d => d + 1)}
                    style={{ flex: 1, padding: '0.375rem', border: '1px solid #f2641944', background: '#f2641911', color: '#f26419', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem' }}>+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-text)' }}>Prospect Pipeline</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-placeholder)' }}>{prospects.length} total</div>
              <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Prospect</button>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' as const, marginBottom: '1.25rem' }}>
            {(['all', ...STATUSES] as const).map(s => {
              const count = s === 'all' ? prospects.length : prospects.filter(p => p.status === s).length
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '5px', border: '1px solid',
                  borderColor: filter === s ? '#f2641955' : 'var(--color-border-subtle)',
                  background: filter === s ? '#f2641911' : 'transparent',
                  color: filter === s ? '#f26419' : 'var(--color-text-placeholder)',
                  fontSize: '0.65rem', cursor: 'pointer', letterSpacing: '0.08em',
                }}>
                  {s === 'all' ? 'All' : STATUS_LABELS[s]} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
                </button>
              )
            })}
          </div>

          {/* Add prospect form */}
          {showAdd && (
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>New Prospect</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input placeholder="Name" className="input-dark" value={newP.name} onChange={e => setNewP(p => ({ ...p, name: e.target.value }))} />
                <input placeholder="LinkedIn URL" className="input-dark" value={newP.url} onChange={e => setNewP(p => ({ ...p, url: e.target.value }))} />
                <input placeholder="Followers (e.g. 2,400)" className="input-dark" value={newP.followers} onChange={e => setNewP(p => ({ ...p, followers: e.target.value }))} />
                <input placeholder="Niche (e.g. SaaS founder)" className="input-dark" value={newP.niche} onChange={e => setNewP(p => ({ ...p, niche: e.target.value }))} />
              </div>
              <textarea placeholder="Notes..." className="input-dark" style={{ resize: 'vertical', minHeight: '60px', marginBottom: '0.75rem' }} value={newP.notes} onChange={e => setNewP(p => ({ ...p, notes: e.target.value }))} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={addProspect} className="btn-primary">Add to Pipeline</button>
                <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Prospect list */}
          {filtered.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginBottom: '1rem' }}>No prospects yet. Start building your pipeline.</div>
              <button onClick={() => setShowAdd(true)} className="btn-primary">Add First Prospect</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {filtered.map(p => (
                <div key={p.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>{p.name}</span>
                        {p.followers && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>{p.followers} followers</span>}
                        {p.niche && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>· {p.niche}</span>}
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: '#f26419', textDecoration: 'none' }}>LinkedIn ↗</a>
                        )}
                      </div>
                      {p.notes && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', lineHeight: 1.4, marginBottom: '0.375rem' }}>{p.notes}</div>}
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>Added {fmtDateWithDay(p.dateAdded)}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                      <button onClick={() => deleteProspect(p.id)} style={{ background: '#8b3a3a15', border: '1px solid #8b3a3a33', color: '#c0504d', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.65rem', cursor: 'pointer', letterSpacing: '0.04em', alignSelf: 'flex-end' }}>Delete</button>
                      <select
                        value={p.status}
                        onChange={e => updateStatus(p.id, e.target.value as Status)}
                        style={{
                          background: `${STATUS_COLORS[p.status]}22`,
                          border: `1px solid ${STATUS_COLORS[p.status]}44`,
                          color: STATUS_COLORS[p.status],
                          borderRadius: '5px', padding: '0.3rem 0.5rem',
                          fontSize: '0.65rem', cursor: 'pointer',
                          letterSpacing: '0.06em', fontFamily: 'var(--font-dm-sans)',
                        }}
                      >
                        {STATUSES.map(s => <option key={s} value={s} style={{ background: 'var(--color-card)', color: 'var(--color-text)' }}>{STATUS_LABELS[s]}</option>)}
                      </select>

                      {/* Comment counter for Warming prospects */}
                      {p.status === 'warming' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>
                            <span style={{ color: p.commentCount > 0 ? '#f26419' : 'var(--color-text-placeholder)', fontFamily: 'var(--font-playfair)', fontSize: '0.8rem', fontWeight: '600' }}>{p.commentCount}</span>
                            {' '}comment{p.commentCount !== 1 ? 's' : ''}
                          </div>
                          <button
                            onClick={() => logComment(p.id)}
                            style={{
                              padding: '0.2rem 0.5rem', borderRadius: '4px',
                              border: '1px solid #f2641944', background: '#f2641911',
                              color: '#f26419', cursor: 'pointer',
                              fontSize: '0.6rem', letterSpacing: '0.06em',
                              fontFamily: 'var(--font-dm-sans)',
                            }}
                          >
                            + Comment
                          </button>
                        </div>
                      )}
                    </div>
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

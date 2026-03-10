'use client'
import { useState, useEffect } from 'react'

type Category = { id: string; name: string; color: string; custom?: boolean }
type Block = { id: string; title: string; categoryId: string; date: string; start: string; end: string; notes: string }

const DEFAULT_CATS: Category[] = [
  { id: 'focus', name: 'Focus', color: '#f26419' },
  { id: 'meeting', name: 'Meeting', color: '#7a8fbc' },
  { id: 'exercise', name: 'Exercise', color: '#c0504d' },
  { id: 'study', name: 'Study', color: '#9b7fd4' },
  { id: 'outreach', name: 'Outreach', color: '#5d9c70' },
  { id: 'content', name: 'Content Creation', color: '#c4a842' },
  { id: 'finance', name: 'Finance', color: '#8a8a94' },
  { id: 'personal', name: 'Personal', color: '#7a9fbc' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 12 AM to 11 PM
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const BG = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=2560&q=80'

const PALETTE = ['#f26419', '#5d9c70', '#c0504d', '#9b7fd4', '#7a8fbc', '#c4a842', '#8a8a94', '#e07b5d', '#5b9bd4', '#b07fe0']

function getMonWeekDates(refDate: Date): Date[] {
  const d = new Date(refDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mon)
    date.setDate(mon.getDate() + i)
    return date
  })
}

function fmt(d: Date) { return d.toISOString().split('T')[0] }

export default function Calendar() {
  const [view, setView] = useState<'week' | 'day'>('week')
  const [refDate, setRefDate] = useState(new Date())
  const [categories, setCategories] = useState<Category[]>(() => {
    try { return JSON.parse(localStorage.getItem('bl-cal-categories') || 'null') || DEFAULT_CATS } catch { return DEFAULT_CATS }
  })
  const [blocks, setBlocks] = useState<Block[]>(() => {
    try { return JSON.parse(localStorage.getItem('bl-cal-blocks') || '[]') } catch { return [] }
  })
  const [showModal, setShowModal] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const [newBlock, setNewBlock] = useState({ title: '', categoryId: 'focus', date: '', start: '09:00', end: '10:00', notes: '' })
  const [newCat, setNewCat] = useState({ name: '', color: '#f26419' })

  useEffect(() => { localStorage.setItem('bl-cal-categories', JSON.stringify(categories)) }, [categories])
  useEffect(() => { localStorage.setItem('bl-cal-blocks', JSON.stringify(blocks)) }, [blocks])

  const weekDates = getMonWeekDates(refDate)
  const today = fmt(new Date())

  const goBack = () => {
    const d = new Date(refDate)
    d.setDate(d.getDate() - (view === 'week' ? 7 : 1))
    setRefDate(d)
  }
  const goForward = () => {
    const d = new Date(refDate)
    d.setDate(d.getDate() + (view === 'week' ? 7 : 1))
    setRefDate(d)
  }
  const goToday = () => setRefDate(new Date())

  const openModal = (date: string, hour: number) => {
    const h = hour.toString().padStart(2, '0')
    setNewBlock(p => ({ ...p, date, start: `${h}:00`, end: `${(hour + 1).toString().padStart(2, '0')}:00` }))
    setShowModal(true)
  }

  const addBlock = () => {
    if (!newBlock.title) return
    setBlocks(p => [{ ...newBlock, id: Date.now().toString() }, ...p])
    setShowModal(false)
    setNewBlock({ title: '', categoryId: 'focus', date: '', start: '09:00', end: '10:00', notes: '' })
  }

  const addCategory = () => {
    if (!newCat.name.trim()) return
    const cat: Category = { id: Date.now().toString(), name: newCat.name.trim(), color: newCat.color, custom: true }
    setCategories(p => [...p, cat])
    setNewCat({ name: '', color: '#f26419' })
    setShowAddCat(false)
  }

  const removeCategory = (id: string) => {
    setCategories(p => p.filter(c => c.id !== id))
  }

  const deleteBlock = (id: string) => {
    setBlocks(p => p.filter(b => b.id !== id))
  }

  const getBlocksForSlot = (date: string, hour: number) => {
    return blocks.filter(b => {
      if (b.date !== date) return false
      const startH = parseInt(b.start.split(':')[0])
      return startH === hour
    })
  }

  const getCat = (id: string) => categories.find(c => c.id === id) || categories[0]

  const weekLabel = view === 'week'
    ? `${weekDates[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} to ${weekDates[6].toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : refDate.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '1300px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', fontWeight: '700', color: 'var(--color-text)' }}>Calendar</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {(['week', 'day'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)} style={{
                    padding: '0.375rem 0.75rem', borderRadius: '5px', border: '1px solid',
                    borderColor: view === v ? '#f2641955' : 'var(--color-border-subtle)',
                    background: view === v ? '#f2641911' : 'transparent',
                    color: view === v ? '#f26419' : 'var(--color-text-placeholder)',
                    fontSize: '0.65rem', cursor: 'pointer', textTransform: 'capitalize' as const, letterSpacing: '0.08em',
                  }}>{v}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <button onClick={goBack} style={{ background: 'transparent', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-dim)', borderRadius: '4px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>←</button>
                <button onClick={goToday} style={{ background: 'transparent', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-dim)', borderRadius: '4px', padding: '0.3rem 0.625rem', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.08em' }}>Today</button>
                <button onClick={goForward} style={{ background: 'transparent', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-dim)', borderRadius: '4px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>→</button>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{weekLabel}</div>
            </div>
          </div>

          {/* Category legend + manage */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const, marginBottom: '1.25rem', alignItems: 'center' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: cat.color }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>{cat.name}</span>
                {cat.custom && (
                  <button onClick={() => removeCategory(cat.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.65rem', padding: '0 0.1rem', lineHeight: 1 }}>×</button>
                )}
              </div>
            ))}
            <button onClick={() => setShowAddCat(true)} style={{
              background: 'transparent', border: '1px dashed var(--color-border)',
              color: 'var(--color-text-placeholder)', borderRadius: '4px',
              padding: '0.15rem 0.5rem', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.06em',
            }}>+ Category</button>
          </div>

          {/* Add custom category form */}
          {showAddCat && (
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>New Category</div>
              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <input placeholder="Category name" className="input-dark" style={{ flex: 1 }} value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} />
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', maxWidth: '240px' }}>
                  {PALETTE.map(c => (
                    <button key={c} onClick={() => setNewCat(p => ({ ...p, color: c }))} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: newCat.color === c ? '2px solid var(--color-text)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
                  ))}
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: newCat.color, flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={addCategory} className="btn-primary">Add Category</button>
                <button onClick={() => setShowAddCat(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Week grid */}
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Day headers - Mon to Sun */}
            <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div />
              {weekDates.map((d, i) => {
                const isToday = fmt(d) === today
                return (
                  <div key={i} style={{ padding: '0.75rem 0.5rem', textAlign: 'center' as const, borderLeft: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ fontSize: '0.6rem', color: isToday ? '#f26419' : 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{WEEK_DAYS[i]}</div>
                    <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', fontWeight: isToday ? '700' : '400', color: isToday ? '#f26419' : 'var(--color-text-muted)' }}>{d.getDate()}</div>
                  </div>
                )
              })}
            </div>

            {/* Time rows */}
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {HOURS.map(hour => (
                <div key={hour} style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: '1px solid var(--color-border-subtle)', minHeight: '44px' }}>
                  <div style={{ padding: '0.375rem 0.5rem 0', fontSize: '0.6rem', color: 'var(--color-text-placeholder)', textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {hour === 0 ? '12AM' : hour > 12 ? `${hour - 12}PM` : hour === 12 ? '12PM' : `${hour}AM`}
                  </div>
                  {weekDates.map((d, di) => {
                    const dateStr = fmt(d)
                    const slotBlocks = getBlocksForSlot(dateStr, hour)
                    return (
                      <div key={di} onClick={() => openModal(dateStr, hour)}
                        style={{ borderLeft: '1px solid var(--color-border-subtle)', padding: '2px', cursor: 'pointer', position: 'relative', minHeight: '44px' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f2641908'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        {slotBlocks.map(b => {
                          const cat = getCat(b.categoryId)
                          return (
                            <div key={b.id} onClick={e => e.stopPropagation()} style={{ background: `${cat.color}22`, border: `1px solid ${cat.color}44`, borderRadius: '3px', padding: '2px 4px', marginBottom: '1px', position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '0.6rem', color: cat.color, fontWeight: '500', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis', flex: 1 }}>{b.title}</div>
                                <button onClick={e => { e.stopPropagation(); deleteBlock(b.id) }} style={{ background: 'transparent', border: 'none', color: cat.color, cursor: 'pointer', fontSize: '0.7rem', padding: '0 0 0 2px', lineHeight: 1, opacity: 0.7, flexShrink: 0 }}>×</button>
                              </div>
                              <div style={{ fontSize: '0.55rem', color: 'var(--color-text-dim)' }}>{b.start} to {b.end}</div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Add Block Modal */}
          {showModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
              <div className="card" style={{ padding: '1.5rem', width: '420px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: getCat(newBlock.categoryId).color }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>New Block</span>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                </div>

                <input placeholder="Block title..." className="input-dark" style={{ marginBottom: '0.75rem' }} value={newBlock.title} onChange={e => setNewBlock(p => ({ ...p, title: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addBlock()} />

                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Category</div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' as const }}>
                    {categories.map(cat => (
                      <button key={cat.id} onClick={() => setNewBlock(p => ({ ...p, categoryId: cat.id }))} style={{
                        padding: '0.25rem 0.625rem', borderRadius: '4px', border: '1px solid',
                        borderColor: newBlock.categoryId === cat.id ? cat.color : 'var(--color-border-subtle)',
                        background: newBlock.categoryId === cat.id ? `${cat.color}22` : 'transparent',
                        color: newBlock.categoryId === cat.id ? cat.color : 'var(--color-text-placeholder)',
                        fontSize: '0.65rem', cursor: 'pointer',
                      }}>{cat.name}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Date</label>
                    <input type="date" className="input-dark" value={newBlock.date} onChange={e => setNewBlock(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Start</label>
                    <input type="time" className="input-dark" value={newBlock.start} onChange={e => setNewBlock(p => ({ ...p, start: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>End</label>
                    <input type="time" className="input-dark" value={newBlock.end} onChange={e => setNewBlock(p => ({ ...p, end: e.target.value }))} />
                  </div>
                </div>

                <textarea placeholder="Optional notes..." className="input-dark" style={{ resize: 'vertical', minHeight: '60px', marginBottom: '0.875rem' }} value={newBlock.notes} onChange={e => setNewBlock(p => ({ ...p, notes: e.target.value }))} />

                <button onClick={addBlock} className="btn-primary" style={{ width: '100%', padding: '0.625rem' }}>Create Block</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

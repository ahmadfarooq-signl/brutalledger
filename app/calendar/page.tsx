'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

type Category = { id: string; name: string; color: string; custom?: boolean }
type Block = { id: string; title: string; categoryId: string; date: string; start: string; end: string; notes: string }
type GEvent = { id: string; summary: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; description?: string }

const DEFAULT_CATS: Category[] = [
  { id: 'focus', name: 'Focus', color: '#f26419' },
  { id: 'meeting', name: 'Meeting', color: '#7a8fbc' },
  { id: 'exercise', name: 'Exercise', color: '#c0504d' },
  { id: 'outreach', name: 'Outreach', color: '#5d9c70' },
  { id: 'content', name: 'Content Creation', color: '#c4a842' },
  { id: 'finance', name: 'Finance', color: '#8a8a94' },
  { id: 'personal', name: 'Personal', color: '#7a9fbc' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const BG = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=2560&q=80'
const PALETTE = ['#f26419', '#5d9c70', '#c0504d', '#9b7fd4', '#7a8fbc', '#c4a842', '#8a8a94', '#e07b5d', '#5b9bd4', '#b07fe0']
const GCAL_COLOR = '#4285F4'

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

function getEventHour(ev: GEvent): number {
  const dt = ev.start.dateTime
  if (!dt) return -1
  return new Date(dt).getHours()
}

function getEventDate(ev: GEvent): string {
  if (ev.start.dateTime) return ev.start.dateTime.split('T')[0]
  return ev.start.date || ''
}

function fmtEvTime(dt: string): string {
  const d = new Date(dt)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function Calendar() {
  const { data: session, status } = useSession()
  const [view, setView] = useState<'week' | 'day'>('week')
  const [refDate, setRefDate] = useState(new Date())
  const [categories, setCategories] = useState<Category[]>(() => {
    try { return JSON.parse(localStorage.getItem('bl-cal-categories') || 'null') || DEFAULT_CATS } catch { return DEFAULT_CATS }
  })
  const [blocks, setBlocks] = useState<Block[]>(() => {
    try { return JSON.parse(localStorage.getItem('bl-cal-blocks') || '[]') } catch { return [] }
  })
  const [gEvents, setGEvents] = useState<GEvent[]>([])
  const [gLoading, setGLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const [syncToGoogle, setSyncToGoogle] = useState(false)
  const [newBlock, setNewBlock] = useState({ title: '', categoryId: 'focus', date: '', start: '09:00', end: '10:00', notes: '' })
  const [newCat, setNewCat] = useState({ name: '', color: '#f26419' })

  useEffect(() => { localStorage.setItem('bl-cal-categories', JSON.stringify(categories)) }, [categories])
  useEffect(() => { localStorage.setItem('bl-cal-blocks', JSON.stringify(blocks)) }, [blocks])

  const weekDates = getMonWeekDates(refDate)
  const today = fmt(new Date())

  // Fetch Google Calendar events for the visible week
  const fetchGEvents = useCallback(async (dates: Date[]) => {
    if (!session?.access_token) return
    setGLoading(true)
    try {
      const timeMin = new Date(dates[0])
      timeMin.setHours(0, 0, 0, 0)
      const timeMax = new Date(dates[6])
      timeMax.setHours(23, 59, 59, 999)
      const res = await fetch(`/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`)
      const data = await res.json()
      setGEvents(data.events || [])
    } catch {
      // silently fail
    } finally {
      setGLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    if (session?.access_token) fetchGEvents(weekDates)
  }, [session?.access_token, refDate]) // eslint-disable-line

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

  const addBlock = async () => {
    if (!newBlock.title) return
    setBlocks(p => [{ ...newBlock, id: Date.now().toString() }, ...p])

    if (syncToGoogle && session?.access_token) {
      try {
        await fetch('/api/calendar/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBlock),
        })
        // Re-fetch to show the new Google event
        await fetchGEvents(weekDates)
      } catch {
        // silently fail if Google sync fails
      }
    }

    setShowModal(false)
    setNewBlock({ title: '', categoryId: 'focus', date: '', start: '09:00', end: '10:00', notes: '' })
    setSyncToGoogle(false)
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
      return parseInt(b.start.split(':')[0]) === hour
    })
  }

  const getGEventsForSlot = (date: string, hour: number) => {
    return gEvents.filter(ev => {
      return getEventDate(ev) === date && getEventHour(ev) === hour
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

              {/* Google Calendar connect */}
              {status === 'loading' ? null : session ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {gLoading && <span style={{ fontSize: '0.6rem', color: GCAL_COLOR }}>syncing...</span>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: `${GCAL_COLOR}15`, border: `1px solid ${GCAL_COLOR}33`, borderRadius: '5px', padding: '0.25rem 0.625rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: GCAL_COLOR }} />
                    <span style={{ fontSize: '0.6rem', color: GCAL_COLOR }}>Google Calendar</span>
                    <button onClick={() => signOut({ redirect: false })} style={{ background: 'transparent', border: 'none', color: GCAL_COLOR, cursor: 'pointer', fontSize: '0.6rem', padding: '0 0 0 4px', opacity: 0.7 }}>disconnect</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.3rem 0.75rem', borderRadius: '5px', border: `1px solid ${GCAL_COLOR}55`, background: `${GCAL_COLOR}11`, color: GCAL_COLOR, fontSize: '0.65rem', cursor: 'pointer' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={GCAL_COLOR}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Connect Google Calendar
                </button>
              )}
            </div>
          </div>

          {/* Category legend */}
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
            {session && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: GCAL_COLOR }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>Google</span>
              </div>
            )}
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
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={addCategory} className="btn-primary">Add Category</button>
                <button onClick={() => setShowAddCat(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Calendar grid */}
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Day headers */}
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
                    const slotGEvents = getGEventsForSlot(dateStr, hour)
                    return (
                      <div key={di} onClick={() => openModal(dateStr, hour)}
                        style={{ borderLeft: '1px solid var(--color-border-subtle)', padding: '2px', cursor: 'pointer', position: 'relative', minHeight: '44px' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f2641908'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

                        {/* Local blocks */}
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

                        {/* Google Calendar events */}
                        {slotGEvents.map(ev => (
                          <div key={ev.id} onClick={e => e.stopPropagation()} style={{ background: `${GCAL_COLOR}18`, border: `1px solid ${GCAL_COLOR}44`, borderRadius: '3px', padding: '2px 4px', marginBottom: '1px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <svg width="7" height="7" viewBox="0 0 24 24" fill={GCAL_COLOR} style={{ flexShrink: 0 }}><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z"/></svg>
                              <div style={{ fontSize: '0.6rem', color: GCAL_COLOR, fontWeight: '500', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis', flex: 1 }}>{ev.summary}</div>
                            </div>
                            {ev.start.dateTime && ev.end.dateTime && (
                              <div style={{ fontSize: '0.55rem', color: 'var(--color-text-dim)' }}>{fmtEvTime(ev.start.dateTime)} to {fmtEvTime(ev.end.dateTime)}</div>
                            )}
                          </div>
                        ))}
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

                {/* Sync to Google Calendar toggle */}
                {session && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem', padding: '0.625rem', background: `${GCAL_COLOR}0d`, borderRadius: '5px', border: `1px solid ${GCAL_COLOR}22` }}>
                    <input type="checkbox" id="sync-google" checked={syncToGoogle} onChange={e => setSyncToGoogle(e.target.checked)} style={{ cursor: 'pointer' }} />
                    <label htmlFor="sync-google" style={{ fontSize: '0.72rem', color: GCAL_COLOR, cursor: 'pointer' }}>Also add to Google Calendar</label>
                  </div>
                )}

                <button onClick={addBlock} className="btn-primary" style={{ width: '100%', padding: '0.625rem' }}>Create Block</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

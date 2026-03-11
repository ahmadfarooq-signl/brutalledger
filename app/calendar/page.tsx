'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { supabase } from '@/lib/supabase'

type Category = { id: string; name: string; color: string; custom?: boolean }
type Block    = { id: string; title: string; categoryId: string; date: string; start: string; end: string; notes: string }
type GEvent   = { id: string; summary: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string } }

// Unified event for rendering
type RenderEv = { id: string; title: string; startMins: number; endMins: number; color: string; isGoogle: boolean }
// After layout calculation
type LayoutEv = RenderEv & { col: number; totalCols: number }

// ─── Constants ───────────────────────────────────────────────────────────────
const PX_PER_MIN = 1          // 1px = 1 minute → 1440px total
const TOTAL_H    = 24 * 60    // 1440px
const GUTTER_W   = 56         // time label column width

const DEFAULT_CATS: Category[] = [
  { id: 'prayer',   name: 'Prayer',   color: '#a0845c' },
  { id: 'focus',    name: 'Focus',    color: '#f26419' },
  { id: 'exercise', name: 'Exercise', color: '#5d9c70' },
  { id: 'outreach', name: 'Outreach', color: '#e07b5d' },
  { id: 'content',  name: 'Content',  color: '#c4a842' },
  { id: 'finance',  name: 'Finance',  color: '#7a8fbc' },
  { id: 'personal', name: 'Personal', color: '#9b7fd4' },
  { id: 'meeting',  name: 'Meeting',  color: '#8a8a94' },
]

const WEEK_DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const PALETTE    = ['#f26419','#5d9c70','#c0504d','#9b7fd4','#7a8fbc','#c4a842','#8a8a94','#e07b5d','#5b9bd4','#a0845c']
const GCAL_COLOR = '#4285F4'
const BG         = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=2560&q=80'
const HOURS      = Array.from({ length: 24 }, (_, i) => i)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(d: Date) { return d.toISOString().split('T')[0] }

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function minsToTime(m: number) {
  const h = Math.floor(m / 60), min = m % 60
  return `${h.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`
}

function fmtHour(h: number) {
  if (h === 0)  return '12 AM'
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

function fmtTime12(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${m.toString().padStart(2,'0')}${ampm}`
}

function getMonWeekDates(ref: Date): Date[] {
  const day = ref.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(ref)
  mon.setDate(ref.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
}

// ─── Overlap layout (Google Calendar algorithm) ───────────────────────────────
function computeLayout(evs: RenderEv[]): LayoutEv[] {
  if (!evs.length) return []
  const sorted = [...evs].sort((a, b) => a.startMins - b.startMins || b.endMins - a.endMins)

  const result: LayoutEv[] = []
  let i = 0

  while (i < sorted.length) {
    const group: RenderEv[] = [sorted[i]]
    let maxEnd = sorted[i].endMins
    let j = i + 1
    while (j < sorted.length && sorted[j].startMins < maxEnd) {
      maxEnd = Math.max(maxEnd, sorted[j].endMins)
      group.push(sorted[j])
      j++
    }

    const lanes: number[] = []
    const assignments: Record<string, number> = {}
    group.forEach(ev => {
      let lane = lanes.findIndex(end => end <= ev.startMins)
      if (lane === -1) lane = lanes.length
      lanes[lane] = ev.endMins
      assignments[ev.id] = lane
    })

    const totalCols = lanes.length
    group.forEach(ev => {
      result.push({ ...ev, col: assignments[ev.id], totalCols })
    })

    i = j
  }

  return result
}

// ─── Component ───────────────────────────────────────────────────────────────
type Popup = { clientX: number; clientY: number; date: string; start: string; end: string; title: string }

export default function Calendar() {
  const { data: session, status } = useSession()
  const [view, setView]       = useState<'week' | 'day'>('week')
  const [refDate, setRefDate] = useState(new Date())
  const [loading, setLoading] = useState(true)

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATS)
  const [blocks, setBlocks] = useState<Block[]>([])

  const [gEvents,  setGEvents]  = useState<GEvent[]>([])
  const [gLoading, setGLoading] = useState(false)
  const [popup,    setPopup]    = useState<Popup | null>(null)
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCat,   setNewCat]   = useState({ name: '', color: '#f26419' })
  const [now, setNow]           = useState(new Date())
  const [syncToGoogle, setSyncToGoogle] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load categories and blocks from Supabase
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: catData }, { data: blockData }] = await Promise.all([
        supabase.from('calendar_categories').select('*'),
        supabase.from('calendar_blocks').select('*'),
      ])

      if (catData && catData.length > 0) {
        const storedIds = new Set(catData.map((c: { id: string }) => c.id))
        const merged = [
          ...DEFAULT_CATS.filter(d => !storedIds.has(d.id)),
          ...catData.map((c: { id: string; name: string; color: string; custom_cat: boolean }) => ({
            id: c.id, name: c.name, color: c.color, custom: c.custom_cat,
          })),
        ]
        setCategories(merged)
      } else {
        // Seed default categories
        await supabase.from('calendar_categories').insert(DEFAULT_CATS.map(c => ({
          id: c.id, name: c.name, color: c.color, custom_cat: false,
        })))
      }

      setBlocks((blockData || []).map((b: {
        id: string; title: string; category_id: string; date: string;
        start_time: string; end_time: string; notes: string;
      }) => ({
        id: b.id, title: b.title, categoryId: b.category_id,
        date: b.date, start: b.start_time, end: b.end_time, notes: b.notes,
      })))

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const mins = new Date().getHours() * 60 + new Date().getMinutes()
      scrollRef.current.scrollTop = Math.max(0, mins * PX_PER_MIN - 120)
    }
  }, [])

  // Close popup on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setPopup(null) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const weekDates = getMonWeekDates(refDate)
  const today     = fmt(new Date())
  const nowMins   = now.getHours() * 60 + now.getMinutes()

  // ── Fetch Google events ───────────────────────────────────────────────────
  const fetchGEvents = useCallback(async (dates: Date[]) => {
    if (!session?.access_token) return
    setGLoading(true)
    try {
      const tMin = new Date(dates[0]); tMin.setHours(0, 0, 0, 0)
      const tMax = new Date(dates[6]); tMax.setHours(23, 59, 59, 999)
      const res = await fetch(`/api/calendar/events?timeMin=${tMin.toISOString()}&timeMax=${tMax.toISOString()}`)
      const data = await res.json()
      setGEvents(data.events || [])
    } catch { /* silent */ }
    finally { setGLoading(false) }
  }, [session?.access_token])

  useEffect(() => {
    if (session?.access_token) fetchGEvents(weekDates)
  }, [session?.access_token, refDate]) // eslint-disable-line

  // ── Navigation ────────────────────────────────────────────────────────────
  const shift = (n: number) => { const d = new Date(refDate); d.setDate(d.getDate() + n); setRefDate(d) }
  const goBack    = () => shift(view === 'week' ? -7 : -1)
  const goForward = () => shift(view === 'week' ?  7 :  1)
  const goToday   = () => setRefDate(new Date())

  const dateLabel = view === 'week'
    ? `${weekDates[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : refDate.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  // ── Render events for a day ───────────────────────────────────────────────
  const getCat = (id: string) => categories.find(c => c.id === id) || categories[0]

  const getRenderEvs = (dateStr: string): RenderEv[] => {
    const evs: RenderEv[] = []

    // Local blocks
    blocks.filter(b => b.date === dateStr).forEach(b => {
      const cat = getCat(b.categoryId)
      evs.push({ id: b.id, title: b.title, startMins: toMins(b.start), endMins: toMins(b.end), color: cat.color, isGoogle: false })
    })

    // Google events
    gEvents.forEach(ev => {
      if (!ev.start.dateTime) return
      const evDate = ev.start.dateTime.split('T')[0]
      if (evDate !== dateStr) return
      const start = new Date(ev.start.dateTime)
      const end   = new Date(ev.end?.dateTime || ev.start.dateTime)
      evs.push({ id: ev.id, title: ev.summary || '(No title)', startMins: start.getHours() * 60 + start.getMinutes(), endMins: end.getHours() * 60 + end.getMinutes(), color: GCAL_COLOR, isGoogle: true })
    })

    return evs
  }

  // ── Click on grid → open Google-style popup ────────────────────────────────
  const handleDayClick = (e: React.MouseEvent<HTMLDivElement>, dateStr: string) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return
    const colTop = e.currentTarget.getBoundingClientRect().top
    const clickedMins = Math.max(0, Math.min(23 * 60, Math.floor(((e.clientY - colTop + 0) ) / PX_PER_MIN / 15) * 15))
    const start = minsToTime(clickedMins)
    const end   = minsToTime(Math.min(23 * 60 + 59, clickedMins + 60))
    setPopup({ clientX: e.clientX, clientY: e.clientY, date: dateStr, start, end, title: '' })
    setSyncToGoogle(false)
  }

  // ── Save new block ────────────────────────────────────────────────────────
  const saveBlock = async () => {
    if (!popup || !popup.title.trim()) return
    const b: Block = { id: Date.now().toString(), title: popup.title.trim(), categoryId: categories[1]?.id || 'focus', date: popup.date, start: popup.start, end: popup.end, notes: '' }
    setBlocks(p => [...p, b])
    setPopup(null)

    await supabase.from('calendar_blocks').insert({
      id: b.id, title: b.title, category_id: b.categoryId,
      date: b.date, start_time: b.start, end_time: b.end, notes: b.notes,
    })

    if (syncToGoogle && session?.access_token) {
      try {
        await fetch('/api/calendar/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
        await fetchGEvents(weekDates)
      } catch { /* silent */ }
    }
  }

  const deleteBlock = async (id: string) => {
    setBlocks(p => p.filter(b => b.id !== id))
    await supabase.from('calendar_blocks').delete().eq('id', id)
  }

  const addCategory = async () => {
    if (!newCat.name.trim()) return
    const cat: Category = { id: Date.now().toString(), name: newCat.name.trim(), color: newCat.color, custom: true }
    setCategories(p => [...p, cat])
    setNewCat({ name: '', color: '#f26419' })
    setShowAddCat(false)
    await supabase.from('calendar_categories').insert({ id: cat.id, name: cat.name, color: cat.color, custom_cat: true })
  }

  const removeCategory = async (id: string) => {
    setCategories(p => p.filter(c => c.id !== id))
    await supabase.from('calendar_categories').delete().eq('id', id)
  }

  const displayDays = view === 'week' ? weekDates : [refDate]
  const gridCols = view === 'week' ? 7 : 1

  // ── Popup position ────────────────────────────────────────────────────────
  const popupW = 340, popupH = session ? 270 : 230
  const popupLeft = popup ? Math.min(popup.clientX + 12, (typeof window !== 'undefined' ? window.innerWidth : 1200) - popupW - 16) : 0
  const popupTop  = popup ? Math.min(popup.clientY - 16, (typeof window !== 'undefined' ? window.innerHeight : 800) - popupH - 16) : 0

  if (loading) {
    return (
      <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
        <div className="page-overlay">
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem', color: 'var(--color-text-placeholder)', fontSize: '0.85rem' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 1.5rem 3rem' }}>

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.875rem' }}>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.875rem', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Calendar</h1>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-placeholder)' }}>{dateLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Nav */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                <button onClick={goBack}    style={btnNav}>‹</button>
                <button onClick={goToday}   style={{ ...btnNav, borderLeft: '1px solid var(--color-border-subtle)', borderRight: '1px solid var(--color-border-subtle)', padding: '0.375rem 0.875rem', fontSize: '0.65rem', letterSpacing: '0.06em' }}>Today</button>
                <button onClick={goForward} style={btnNav}>›</button>
              </div>
              {/* View */}
              <div style={{ display: 'flex', background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                {(['week','day'] as const).map((v, vi) => (
                  <button key={v} onClick={() => setView(v)} style={{ padding: '0.375rem 0.875rem', border: 'none', borderRight: vi === 0 ? '1px solid var(--color-border-subtle)' : 'none', background: view === v ? '#f2641918' : 'transparent', color: view === v ? '#f26419' : 'var(--color-text-placeholder)', fontSize: '0.65rem', cursor: 'pointer', textTransform: 'capitalize', letterSpacing: '0.06em', fontWeight: view === v ? '600' : '400' }}>{v}</button>
                ))}
              </div>
              {/* Google Calendar */}
              {status === 'loading' ? null : session ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: `${GCAL_COLOR}12`, border: `1px solid ${GCAL_COLOR}30`, borderRadius: '8px', padding: '0.35rem 0.875rem' }}>
                  {gLoading ? <span style={{ fontSize: '0.6rem', color: GCAL_COLOR }}>syncing…</span> : <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }} />}
                  <span style={{ fontSize: '0.65rem', color: GCAL_COLOR, fontWeight: '500' }}>Google Calendar</span>
                  <button onClick={() => signOut({ redirect: false })} style={{ background: 'transparent', border: 'none', color: GCAL_COLOR, cursor: 'pointer', fontSize: '0.65rem', opacity: 0.5 }}>✕</button>
                </div>
              ) : (
                <button onClick={() => signIn('google')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 1rem', borderRadius: '8px', border: `1px solid ${GCAL_COLOR}40`, background: `${GCAL_COLOR}0e`, color: GCAL_COLOR, fontSize: '0.7rem', cursor: 'pointer', fontWeight: '500' }}>
                  <GoogleIcon /> Connect Google Calendar
                </button>
              )}
            </div>
          </div>

          {/* ── CATEGORY CHIPS ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: `${cat.color}18`, border: `1px solid ${cat.color}35`, borderRadius: '20px', padding: '0.18rem 0.5rem 0.18rem 0.4rem' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.62rem', color: cat.color, fontWeight: '500' }}>{cat.name}</span>
                {cat.custom && <button onClick={() => removeCategory(cat.id)} style={{ background: 'transparent', border: 'none', color: cat.color, cursor: 'pointer', fontSize: '0.7rem', padding: 0, lineHeight: 1, opacity: 0.5 }}>×</button>}
              </div>
            ))}
            {session && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: `${GCAL_COLOR}10`, border: `1px solid ${GCAL_COLOR}25`, borderRadius: '20px', padding: '0.18rem 0.5rem 0.18rem 0.4rem' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: GCAL_COLOR }} />
                <span style={{ fontSize: '0.62rem', color: GCAL_COLOR, fontWeight: '500' }}>Google</span>
              </div>
            )}
            <button onClick={() => setShowAddCat(!showAddCat)} style={{ background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-text-placeholder)', borderRadius: '20px', padding: '0.18rem 0.625rem', cursor: 'pointer', fontSize: '0.62rem' }}>+ Add</button>
          </div>

          {/* Add category */}
          {showAddCat && (
            <div className="card" style={{ padding: '0.875rem 1.125rem', marginBottom: '0.875rem', display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input autoFocus placeholder="Category name" className="input-dark" style={{ flex: '1 1 160px', minWidth: 0 }} value={newCat.name}
                onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => { if (e.key !== 'Enter' || !newCat.name.trim()) return; addCategory() }} />
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {PALETTE.map(c => <button key={c} onClick={() => setNewCat(p => ({ ...p, color: c }))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: newCat.color === c ? '2px solid var(--color-text)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />)}
              </div>
              <button className="btn-primary" style={{ padding: '0.3rem 0.75rem' }} onClick={addCategory}>Add</button>
              <button className="btn-ghost"   style={{ padding: '0.3rem 0.625rem' }} onClick={() => setShowAddCat(false)}>Cancel</button>
            </div>
          )}

          {/* ── CALENDAR ────────────────────────────────────────────────── */}
          <div className="card" style={{ overflow: 'hidden', borderRadius: '10px' }}>

            {/* Sticky day headers */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-card)', position: 'sticky', top: 0, zIndex: 20 }}>
              <div style={{ width: GUTTER_W, flexShrink: 0 }} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, flex: 1 }}>
                {displayDays.map((d, i) => {
                  const isToday = fmt(d) === today
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '0.75rem 0.25rem 0.625rem', borderLeft: '1px solid var(--color-border-subtle)', background: isToday ? '#f2641907' : 'transparent' }}>
                      <div style={{ fontSize: '0.57rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: isToday ? '#f26419' : 'var(--color-text-placeholder)', marginBottom: '0.35rem' }}>{WEEK_DAYS[(d.getDay() + 6) % 7]}</div>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', margin: '0 auto', background: isToday ? '#f26419' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.05rem', fontWeight: isToday ? '700' : '400', color: isToday ? '#fff' : 'var(--color-text-muted)' }}>{d.getDate()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Scrollable body */}
            <div ref={scrollRef} style={{ height: 620, overflowY: 'auto' }}>
              <div style={{ display: 'flex', height: TOTAL_H, position: 'relative' }}>

                {/* Time gutter */}
                <div style={{ width: GUTTER_W, flexShrink: 0, position: 'relative' }}>
                  {HOURS.map(h => h > 0 && (
                    <div key={h} style={{ position: 'absolute', top: h * 60 - 8, right: 8, fontSize: '0.58rem', color: 'var(--color-text-placeholder)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, userSelect: 'none' }}>
                      {fmtHour(h)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, flex: 1, position: 'relative' }}>

                  {/* Hour lines (shared across all columns) */}
                  {HOURS.map(h => (
                    <div key={h} style={{ position: 'absolute', top: h * 60, left: 0, right: 0, borderTop: `1px solid ${h % 4 === 0 ? 'var(--color-border)' : 'var(--color-border-subtle)'}`, pointerEvents: 'none', zIndex: 0 }} />
                  ))}

                  {displayDays.map((d, di) => {
                    const dateStr = fmt(d)
                    const isToday = dateStr === today
                    const rawEvs  = getRenderEvs(dateStr)
                    const laidOut = computeLayout(rawEvs)

                    return (
                      <div key={di}
                        style={{ position: 'relative', borderLeft: '1px solid var(--color-border-subtle)', background: isToday ? '#f2641904' : 'transparent', cursor: 'pointer' }}
                        onClick={e => handleDayClick(e, dateStr)}
                      >
                        {/* Current time indicator */}
                        {isToday && (
                          <div style={{ position: 'absolute', left: 0, right: 0, top: nowMins * PX_PER_MIN, height: 2, background: '#EA4335', zIndex: 10, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#EA4335' }} />
                          </div>
                        )}

                        {/* Events */}
                        {laidOut.map(ev => {
                          const topPx = ev.startMins * PX_PER_MIN
                          const heightPx = Math.max(18, (ev.endMins - ev.startMins) * PX_PER_MIN)
                          const pct   = 100 / ev.totalCols
                          const leftPct  = ev.col * pct
                          const widthPct = pct - 1
                          const isShort = (ev.endMins - ev.startMins) <= 20

                          return (
                            <div key={ev.id} data-event="1"
                              onClick={e => e.stopPropagation()}
                              style={{ position: 'absolute', top: topPx + 1, height: heightPx - 2, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 2px)`, background: ev.color, borderRadius: '4px', padding: isShort ? '2px 5px' : '3px 6px', overflow: 'hidden', zIndex: 5, cursor: 'default', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: '600', lineHeight: 1.25, overflow: 'hidden', whiteSpace: isShort ? 'nowrap' : 'normal', textOverflow: 'ellipsis', flex: 1 }}>
                                  {ev.title}
                                </span>
                                {!ev.isGoogle && !isShort && (
                                  <button data-event="1" onClick={e => { e.stopPropagation(); deleteBlock(ev.id) }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, lineHeight: 1, flexShrink: 0, marginLeft: '2px' }}>×</button>
                                )}
                              </div>
                              {!isShort && (
                                <div style={{ fontSize: '0.57rem', color: 'rgba(255,255,255,0.85)', marginTop: '1px', whiteSpace: 'nowrap' }}>
                                  {fmtTime12(ev.startMins)} – {fmtTime12(ev.endMins)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GOOGLE-STYLE QUICK-ADD POPUP ────────────────────────────────── */}
      {popup && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setPopup(null)} />
          <div style={{ position: 'fixed', left: popupLeft, top: popupTop, width: popupW, zIndex: 100, background: 'var(--color-card)', borderRadius: '12px', boxShadow: '0 8px 40px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
            {/* Drag bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.875rem 0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {(['Event','Task'] as const).map((t, ti) => (
                  <button key={t} style={{ padding: '0.3rem 0.875rem', borderRadius: '20px', border: '1px solid', fontSize: '0.72rem', cursor: 'pointer', fontWeight: ti === 0 ? '600' : '400', borderColor: ti === 0 ? '#f2641955' : 'var(--color-border-subtle)', background: ti === 0 ? '#f2641912' : 'transparent', color: ti === 0 ? '#f26419' : 'var(--color-text-placeholder)' }}>{t}</button>
                ))}
              </div>
              <button onClick={() => setPopup(null)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '0 0.875rem 0.875rem' }}>
              {/* Title input */}
              <input autoFocus placeholder="Add title" value={popup.title} onChange={e => setPopup(p => p ? { ...p, title: e.target.value } : p)}
                onKeyDown={e => e.key === 'Enter' && saveBlock()}
                style={{ width: '100%', fontSize: '1rem', fontFamily: 'var(--font-playfair)', border: 'none', borderBottom: '2px solid #f26419', background: 'transparent', color: 'var(--color-text)', padding: '0.25rem 0', marginBottom: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />

              {/* Date + time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                <span>🗓</span>
                <span style={{ fontWeight: '500' }}>{new Date(popup.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span>·</span>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <input type="time" value={popup.start} onChange={e => setPopup(p => p ? { ...p, start: e.target.value } : p)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.78rem', cursor: 'pointer', padding: 0, outline: 'none' }} />
                  <span>–</span>
                  <input type="time" value={popup.end}   onChange={e => setPopup(p => p ? { ...p, end:   e.target.value } : p)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.78rem', cursor: 'pointer', padding: 0, outline: 'none' }} />
                </div>
              </div>

              {/* Google sync */}
              {session && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer', fontSize: '0.72rem', color: GCAL_COLOR }}>
                  <input type="checkbox" checked={syncToGoogle} onChange={e => setSyncToGoogle(e.target.checked)} style={{ accentColor: GCAL_COLOR, cursor: 'pointer' }} />
                  <GoogleIcon /> Also add to Google Calendar
                </label>
              )}

              {/* Save */}
              <button onClick={saveBlock} disabled={!popup.title.trim()} className="btn-primary" style={{ width: '100%', padding: '0.5rem', opacity: popup.title.trim() ? 1 : 0.5 }}>Save</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const btnNav: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--color-text-muted)',
  cursor: 'pointer', padding: '0.375rem 0.625rem', fontSize: '1.15rem', lineHeight: 1,
}

function GoogleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

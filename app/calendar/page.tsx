'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

type Category = { id: string; name: string; color: string; custom?: boolean }
type Block = { id: string; title: string; categoryId: string; date: string; start: string; end: string; notes: string }
type GEvent = { id: string; summary: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; description?: string }

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

const SEED_BLOCKS: Block[] = [
  { id:'s1',  date:'2026-03-11', start:'04:50', end:'05:20', categoryId:'prayer',   title:'Wake + Wudu',             notes:'Get up. Do not go back to sleep.' },
  { id:'s2',  date:'2026-03-11', start:'05:20', end:'05:30', categoryId:'prayer',   title:'Fajr',                    notes:'Pray.' },
  { id:'s3',  date:'2026-03-11', start:'05:30', end:'06:00', categoryId:'exercise', title:'Run',                     notes:'30 min outside. No phone.' },
  { id:'s4',  date:'2026-03-11', start:'06:00', end:'06:30', categoryId:'personal', title:'Morning routine',         notes:'Shower · breakfast · 1L water before 7AM' },
  { id:'s5',  date:'2026-03-11', start:'06:30', end:'07:00', categoryId:'focus',    title:'Deep Work 1',             notes:'Rewrite LinkedIn headline + About section' },
  { id:'s6',  date:'2026-03-11', start:'07:00', end:'07:30', categoryId:'focus',    title:'Deep Work 1',             notes:'DM Nick — get written testimonial. Screenshot his follower count.' },
  { id:'s7',  date:'2026-03-11', start:'07:30', end:'08:00', categoryId:'focus',    title:'Deep Work 1',             notes:'Verify + fix case study numbers. Update featured section.' },
  { id:'s8',  date:'2026-03-11', start:'08:00', end:'08:15', categoryId:'prayer',   title:'Quran',                   notes:'15 min with meaning' },
  { id:'s9',  date:'2026-03-11', start:'08:15', end:'08:45', categoryId:'outreach', title:'Deep Work 2',             notes:'Build Notion CRM — columns: Name, LinkedIn URL, Followers, Stage, Notes' },
  { id:'s10', date:'2026-03-11', start:'08:45', end:'09:30', categoryId:'outreach', title:'Deep Work 2',             notes:'Prospect batch 1 — find 25 SaaS founders (500–5K followers)' },
  { id:'s11', date:'2026-03-11', start:'09:30', end:'10:00', categoryId:'focus',    title:'Deep Work 2',             notes:'Write Sales Call Script (Section 3b framework)' },
  { id:'s12', date:'2026-03-11', start:'10:00', end:'10:30', categoryId:'personal', title:'Break',                   notes:'Tea + movement. 30 min. Intentional.' },
  { id:'s13', date:'2026-03-11', start:'10:30', end:'10:45', categoryId:'finance',  title:'Deep Work 3',             notes:'Confirm Elevate verification status' },
  { id:'s14', date:'2026-03-11', start:'10:45', end:'11:00', categoryId:'finance',  title:'Deep Work 3',             notes:'Set up Calendly (free, 15 min booking)' },
  { id:'s15', date:'2026-03-11', start:'11:00', end:'11:30', categoryId:'finance',  title:'Deep Work 3',             notes:'Create invoice template in Canva' },
  { id:'s16', date:'2026-03-11', start:'11:30', end:'12:00', categoryId:'content',  title:'Deep Work 3',             notes:'Plan SIGNL Branding — colours, both logo variants, Canva banner' },
  { id:'s17', date:'2026-03-11', start:'12:00', end:'12:30', categoryId:'content',  title:'Deep Work 3',             notes:'Plan Content Theme + Post Types for March' },
  { id:'s18', date:'2026-03-11', start:'12:30', end:'13:15', categoryId:'prayer',   title:'Dhuhr + Lunch + Rest',    notes:'Pray. Eat. Rest 30–45 min. Biology.' },
  { id:'s19', date:'2026-03-11', start:'13:15', end:'14:00', categoryId:'content',  title:'Afternoon block',         notes:'Write LinkedIn Post 1 — Mar 11 ("I got laid off today. Here\'s what I\'m building.")' },
  { id:'s20', date:'2026-03-11', start:'14:00', end:'14:30', categoryId:'content',  title:'Afternoon block',         notes:'Write LinkedIn Post 2 — Mar 13 contrarian draft' },
  { id:'s21', date:'2026-03-11', start:'14:30', end:'15:00', categoryId:'content',  title:'Afternoon block',         notes:'Plan Brand Identity — Twitter personal branding (bio, header, pinned)' },
  { id:'s22', date:'2026-03-11', start:'15:00', end:'15:30', categoryId:'outreach', title:'Afternoon block',         notes:'Write LinkedIn DM template (4-part framework)' },
  { id:'s23', date:'2026-03-11', start:'15:30', end:'16:00', categoryId:'prayer',   title:'Asr + walk',              notes:'Pray. 10 min walk.' },
  { id:'s24', date:'2026-03-11', start:'16:00', end:'16:45', categoryId:'personal', title:'Reading',                 notes:'Books only. No phone. 45 min.' },
  { id:'s25', date:'2026-03-11', start:'16:45', end:'17:15', categoryId:'outreach', title:'Afternoon block',         notes:'Write cold email template (Apollo framework)' },
  { id:'s26', date:'2026-03-11', start:'17:15', end:'18:00', categoryId:'finance',  title:'Afternoon block',         notes:'Plan Audit Deliverables in depth — 7 dimensions, Loom structure' },
  { id:'s27', date:'2026-03-11', start:'18:00', end:'18:45', categoryId:'focus',    title:'Afternoon block',         notes:'Setup LinkedIn Company Page (SIGNL) — about, logo, banner' },
  { id:'s28', date:'2026-03-11', start:'18:45', end:'19:00', categoryId:'personal', title:'Free / family',           notes:'Stop. Be present.' },
  { id:'s29', date:'2026-03-11', start:'19:00', end:'19:30', categoryId:'prayer',   title:'Maghrib + family dinner', notes:'Pray. Eat with family.' },
  { id:'s30', date:'2026-03-11', start:'19:30', end:'20:30', categoryId:'outreach', title:'Strategic block',         notes:'20 Cold DMs — send all 20. Track in Notion.' },
  { id:'s31', date:'2026-03-11', start:'20:30', end:'21:15', categoryId:'content',  title:'Strategic block',         notes:'Write first Twitter post batch — adapt 3 posts from LinkedIn drafts' },
  { id:'s32', date:'2026-03-11', start:'21:15', end:'21:45', categoryId:'finance',  title:'Strategic block',         notes:'Create Editable Invoicing System — Notion or Canva, all offer types' },
  { id:'s33', date:'2026-03-11', start:'21:45', end:'22:00', categoryId:'focus',    title:'Strategic block',         notes:'Fill Prospect List — add 25 more (batch 2 start, total 50)' },
  { id:'s34', date:'2026-03-11', start:'22:00', end:'22:15', categoryId:'prayer',   title:'Isha',                    notes:'Pray.' },
  { id:'s35', date:'2026-03-11', start:'22:15', end:'22:30', categoryId:'personal', title:'Wind down',               notes:'Write 3 things that moved forward. Tomorrow\'s top 3. Phone down. Sleep by 10:30.' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const BG = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=2560&q=80'
const PALETTE = ['#f26419','#5d9c70','#c0504d','#9b7fd4','#7a8fbc','#c4a842','#8a8a94','#e07b5d','#5b9bd4','#a0845c']
const GCAL_COLOR = '#4285F4'
const ROW_H = 64

function getMonWeekDates(ref: Date): Date[] {
  const day = ref.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(ref)
  mon.setDate(ref.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
}

function fmt(d: Date) { return d.toISOString().split('T')[0] }

function fmtHour(h: number) {
  if (h === 0) return ''
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

function fmtEvTime(dt: string) {
  const d = new Date(dt)
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function getEventHour(ev: GEvent) {
  return ev.start.dateTime ? new Date(ev.start.dateTime).getHours() : -1
}
function getEventDate(ev: GEvent) {
  return ev.start.dateTime ? ev.start.dateTime.split('T')[0] : (ev.start.date || '')
}

function parseMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function Calendar() {
  const { data: session, status } = useSession()
  const [view, setView] = useState<'week' | 'day'>('week')
  const [refDate, setRefDate] = useState(new Date())

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored: Category[] = JSON.parse(localStorage.getItem('bl-cal-categories') || 'null')
      if (!stored) return DEFAULT_CATS
      // Merge in any new default categories not yet in stored
      const ids = new Set(stored.map(c => c.id))
      const merged = [...stored]
      DEFAULT_CATS.forEach(dc => { if (!ids.has(dc.id)) merged.unshift(dc) })
      return merged
    } catch { return DEFAULT_CATS }
  })

  const [blocks, setBlocks] = useState<Block[]>(() => {
    try {
      const stored: Block[] = JSON.parse(localStorage.getItem('bl-cal-blocks') || '[]')
      // Add seed blocks if not already present
      const seedIds = new Set(SEED_BLOCKS.map(b => b.id))
      const existingSeedIds = new Set(stored.filter(b => seedIds.has(b.id)).map(b => b.id))
      const missing = SEED_BLOCKS.filter(b => !existingSeedIds.has(b.id))
      return [...missing, ...stored]
    } catch { return SEED_BLOCKS }
  })

  const [gEvents, setGEvents] = useState<GEvent[]>([])
  const [gLoading, setGLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const [syncToGoogle, setSyncToGoogle] = useState(false)
  const [newBlock, setNewBlock] = useState({ title: '', categoryId: 'focus', date: '', start: '09:00', end: '10:00', notes: '' })
  const [newCat, setNewCat] = useState({ name: '', color: '#f26419' })
  const [now, setNow] = useState(new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem('bl-cal-categories', JSON.stringify(categories)) }, [categories])
  useEffect(() => { localStorage.setItem('bl-cal-blocks', JSON.stringify(blocks)) }, [blocks])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      const h = new Date().getHours()
      scrollRef.current.scrollTop = Math.max(0, (h - 2) * ROW_H)
    }
  }, [])

  const weekDates = getMonWeekDates(refDate)
  const today = fmt(new Date())
  const currentHour = now.getHours()
  const currentMins = now.getMinutes()

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

  const goBack    = () => { const d = new Date(refDate); d.setDate(d.getDate() - (view === 'week' ? 7 : 1)); setRefDate(d) }
  const goForward = () => { const d = new Date(refDate); d.setDate(d.getDate() + (view === 'week' ? 7 : 1)); setRefDate(d) }
  const goToday   = () => setRefDate(new Date())

  const openModal = (date: string, hour: number) => {
    const h = hour.toString().padStart(2, '0')
    const h2 = (hour + 1).toString().padStart(2, '0')
    setNewBlock(p => ({ ...p, date, start: `${h}:00`, end: `${h2}:00` }))
    setShowModal(true)
  }

  const addBlock = async () => {
    if (!newBlock.title) return
    setBlocks(p => [{ ...newBlock, id: Date.now().toString() }, ...p])
    if (syncToGoogle && session?.access_token) {
      try {
        await fetch('/api/calendar/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBlock) })
        await fetchGEvents(weekDates)
      } catch { /* silent */ }
    }
    setShowModal(false)
    setNewBlock({ title: '', categoryId: 'focus', date: '', start: '09:00', end: '10:00', notes: '' })
    setSyncToGoogle(false)
  }

  const getCat = (id: string) => categories.find(c => c.id === id) || categories[0]

  // Return all blocks that overlap with this hour slot
  const getBlocksForSlot = (date: string, hour: number) =>
    blocks.filter(b => {
      if (b.date !== date) return false
      const startH = parseInt(b.start.split(':')[0])
      const endMins = parseMins(b.end)
      const slotStart = hour * 60
      const slotEnd = (hour + 1) * 60
      // block starts in this hour, OR started before and still ongoing
      return parseMins(b.start) < slotEnd && endMins > slotStart
    })

  const getGEventsForSlot = (date: string, hour: number) =>
    gEvents.filter(ev => getEventDate(ev) === date && getEventHour(ev) === hour)

  const dateLabel = view === 'week'
    ? `${weekDates[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : refDate.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 1.5rem 3rem' }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.875rem', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>Calendar</h1>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-placeholder)' }}>{dateLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                <button onClick={goBack}    style={navBtn}>‹</button>
                <button onClick={goToday}   style={{ ...navBtn, borderLeft: '1px solid var(--color-border-subtle)', borderRight: '1px solid var(--color-border-subtle)', padding: '0.375rem 0.875rem', fontSize: '0.65rem', letterSpacing: '0.06em' }}>Today</button>
                <button onClick={goForward} style={navBtn}>›</button>
              </div>
              {/* View toggle */}
              <div style={{ display: 'flex', background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                {(['week','day'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)} style={{
                    padding: '0.375rem 0.875rem', border: 'none',
                    background: view === v ? '#f2641918' : 'transparent',
                    color: view === v ? '#f26419' : 'var(--color-text-placeholder)',
                    fontSize: '0.65rem', cursor: 'pointer', textTransform: 'capitalize',
                    letterSpacing: '0.06em', fontWeight: view === v ? '600' : '400',
                    borderRight: v === 'week' ? '1px solid var(--color-border-subtle)' : 'none',
                  }}>{v}</button>
                ))}
              </div>
              {/* Google Calendar */}
              {status === 'loading' ? <div style={{ width: '40px', height: '32px' }} /> : session ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: `${GCAL_COLOR}12`, border: `1px solid ${GCAL_COLOR}30`, borderRadius: '8px', padding: '0.35rem 0.875rem' }}>
                  {gLoading
                    ? <span style={{ fontSize: '0.6rem', color: GCAL_COLOR }}>syncing…</span>
                    : <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }} />
                  }
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

          {/* ── CATEGORY CHIPS ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: `${cat.color}18`, border: `1px solid ${cat.color}35`, borderRadius: '20px', padding: '0.2rem 0.5rem 0.2rem 0.45rem', cursor: 'default' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.62rem', color: cat.color, fontWeight: '500' }}>{cat.name}</span>
                {cat.custom && (
                  <button onClick={() => setCategories(p => p.filter(c => c.id !== cat.id))} style={{ background: 'transparent', border: 'none', color: cat.color, cursor: 'pointer', fontSize: '0.7rem', padding: 0, lineHeight: 1, opacity: 0.5, marginLeft: '1px' }}>×</button>
                )}
              </div>
            ))}
            {session && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: `${GCAL_COLOR}10`, border: `1px solid ${GCAL_COLOR}25`, borderRadius: '20px', padding: '0.2rem 0.5rem 0.2rem 0.45rem' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: GCAL_COLOR }} />
                <span style={{ fontSize: '0.62rem', color: GCAL_COLOR, fontWeight: '500' }}>Google</span>
              </div>
            )}
            <button onClick={() => setShowAddCat(!showAddCat)} style={{ background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-text-placeholder)', borderRadius: '20px', padding: '0.2rem 0.625rem', cursor: 'pointer', fontSize: '0.62rem' }}>+ Add</button>
          </div>

          {/* Add category */}
          {showAddCat && (
            <div className="card" style={{ padding: '0.875rem 1.125rem', marginBottom: '0.875rem', display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input autoFocus placeholder="Category name" className="input-dark" style={{ flex: '1 1 160px', minWidth: 0 }} value={newCat.name}
                onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { if (!newCat.name.trim()) return; setCategories(p => [...p, { id: Date.now().toString(), name: newCat.name.trim(), color: newCat.color, custom: true }]); setNewCat({ name: '', color: '#f26419' }); setShowAddCat(false) } }} />
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {PALETTE.map(c => <button key={c} onClick={() => setNewCat(p => ({ ...p, color: c }))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: newCat.color === c ? '2px solid var(--color-text)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />)}
              </div>
              <button onClick={() => { if (!newCat.name.trim()) return; setCategories(p => [...p, { id: Date.now().toString(), name: newCat.name.trim(), color: newCat.color, custom: true }]); setNewCat({ name: '', color: '#f26419' }); setShowAddCat(false) }} className="btn-primary" style={{ padding: '0.3rem 0.75rem' }}>Add</button>
              <button onClick={() => setShowAddCat(false)} className="btn-ghost" style={{ padding: '0.3rem 0.625rem' }}>Cancel</button>
            </div>
          )}

          {/* ── CALENDAR GRID ── */}
          <div className="card" style={{ overflow: 'hidden', borderRadius: '10px', border: '1px solid var(--color-border-subtle)' }}>

            {/* Sticky day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', background: 'var(--color-card)', borderBottom: '2px solid var(--color-border-subtle)', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ borderRight: '1px solid var(--color-border-subtle)' }} />
              {weekDates.map((d, i) => {
                const isToday = fmt(d) === today
                return (
                  <div key={i} style={{ textAlign: 'center', padding: '0.75rem 0.25rem 0.625rem', borderRight: i < 6 ? '1px solid var(--color-border-subtle)' : 'none', background: isToday ? '#f2641907' : 'transparent' }}>
                    <div style={{ fontSize: '0.56rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: isToday ? '#f26419' : 'var(--color-text-placeholder)', marginBottom: '0.35rem' }}>{WEEK_DAYS[i]}</div>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', margin: '0 auto', background: isToday ? '#f26419' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.05rem', fontWeight: isToday ? '700' : '400', color: isToday ? '#fff' : 'var(--color-text-muted)' }}>{d.getDate()}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Scrollable time body */}
            <div ref={scrollRef} style={{ height: '640px', overflowY: 'auto' }}>
              {HOURS.map(hour => {
                const isMajor = hour % 4 === 0
                return (
                  <div key={hour} style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', minHeight: `${ROW_H}px`, borderBottom: `1px solid ${isMajor ? 'var(--color-border)' : 'var(--color-border-subtle)'}` }}>
                    {/* Hour label */}
                    <div style={{ padding: '0 6px 0 0', paddingTop: '5px', fontSize: '0.58rem', color: 'var(--color-text-placeholder)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border-subtle)', fontWeight: isMajor ? '500' : '400' }}>
                      {fmtHour(hour)}
                    </div>
                    {/* Day cells */}
                    {weekDates.map((d, di) => {
                      const dateStr = fmt(d)
                      const isToday = dateStr === today
                      const isCurrentHour = isToday && hour === currentHour
                      const slotBlocks = getBlocksForSlot(dateStr, hour)
                      const slotGEvents = getGEventsForSlot(dateStr, hour)
                      const nowLineTop = (currentMins / 60) * ROW_H

                      return (
                        <div key={di}
                          onClick={() => openModal(dateStr, hour)}
                          style={{ position: 'relative', padding: '3px 3px 2px', borderRight: di < 6 ? '1px solid var(--color-border-subtle)' : 'none', background: isToday ? '#f2641905' : 'transparent', cursor: 'pointer', minHeight: `${ROW_H}px` }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = isToday ? '#f2641909' : '#00000006'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isToday ? '#f2641905' : 'transparent'}
                        >
                          {/* Current time line */}
                          {isCurrentHour && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: `${nowLineTop}px`, height: '2px', background: '#f26419', zIndex: 5, pointerEvents: 'none' }}>
                              <div style={{ position: 'absolute', left: '-5px', top: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: '#f26419' }} />
                            </div>
                          )}

                          {/* Local blocks */}
                          {slotBlocks.map(b => {
                            const cat = getCat(b.categoryId)
                            const startMins = parseMins(b.start)
                            const endMins = parseMins(b.end)
                            const slotStartMins = hour * 60
                            const slotEndMins = (hour + 1) * 60
                            const visStart = Math.max(startMins, slotStartMins)
                            const visEnd = Math.min(endMins, slotEndMins)
                            const topPct = ((visStart - slotStartMins) / 60) * 100
                            const heightPct = ((visEnd - visStart) / 60) * 100
                            const isFirstSlot = startMins >= slotStartMins
                            return (
                              <div key={b.id}
                                onClick={e => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  top: `${topPct}%`,
                                  height: `${Math.max(heightPct, 8)}%`,
                                  left: '3px', right: '3px',
                                  borderLeft: `3px solid ${cat.color}`,
                                  background: `${cat.color}18`,
                                  borderRadius: '0 4px 4px 0',
                                  padding: '2px 5px 2px 4px',
                                  overflow: 'hidden',
                                  zIndex: 2,
                                }}
                              >
                                {isFirstSlot && (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <span style={{ fontSize: '0.67rem', color: cat.color, fontWeight: '600', lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{b.title}</span>
                                      <button onClick={e => { e.stopPropagation(); setBlocks(p => p.filter(x => x.id !== b.id)) }} style={{ background: 'transparent', border: 'none', color: cat.color, cursor: 'pointer', fontSize: '0.7rem', padding: 0, lineHeight: 1, opacity: 0.45, flexShrink: 0, marginLeft: '2px' }}>×</button>
                                    </div>
                                    <div style={{ fontSize: '0.56rem', color: 'var(--color-text-placeholder)', marginTop: '1px', whiteSpace: 'nowrap' }}>{b.start}–{b.end}</div>
                                  </>
                                )}
                              </div>
                            )
                          })}

                          {/* Google events */}
                          {slotGEvents.map(ev => (
                            <div key={ev.id} onClick={e => e.stopPropagation()}
                              style={{ position: 'absolute', top: '3px', left: '3px', right: '3px', borderLeft: `3px solid ${GCAL_COLOR}`, background: `${GCAL_COLOR}12`, borderRadius: '0 4px 4px 0', padding: '2px 5px 2px 4px', zIndex: 2 }}>
                              <span style={{ fontSize: '0.67rem', color: GCAL_COLOR, fontWeight: '600', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block' }}>{ev.summary}</span>
                              {ev.start.dateTime && ev.end.dateTime && <div style={{ fontSize: '0.56rem', color: 'var(--color-text-placeholder)', marginTop: '1px' }}>{fmtEvTime(ev.start.dateTime)}–{fmtEvTime(ev.end.dateTime)}</div>}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── ADD BLOCK MODAL ── */}
          {showModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }} onClick={() => setShowModal(false)}>
              <div className="card" style={{ padding: '1.75rem', width: '480px', maxWidth: '94vw', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: getCat(newBlock.categoryId).color }} />
                    <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)' }}>New Block</span>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1, padding: '0.15rem 0.25rem' }}>×</button>
                </div>

                <input autoFocus placeholder="What are you working on?" className="input-dark" style={{ marginBottom: '1rem', fontSize: '0.88rem', padding: '0.625rem 0.875rem' }}
                  value={newBlock.title} onChange={e => setNewBlock(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addBlock()} />

                {/* Category */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.57rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Category</div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {categories.filter(c => !c.custom || true).map(cat => (
                      <button key={cat.id} onClick={() => setNewBlock(p => ({ ...p, categoryId: cat.id }))} style={{
                        padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid',
                        borderColor: newBlock.categoryId === cat.id ? cat.color : 'var(--color-border-subtle)',
                        background: newBlock.categoryId === cat.id ? `${cat.color}1a` : 'transparent',
                        color: newBlock.categoryId === cat.id ? cat.color : 'var(--color-text-placeholder)',
                        fontSize: '0.68rem', cursor: 'pointer', fontWeight: newBlock.categoryId === cat.id ? '600' : '400',
                      }}>{cat.name}</button>
                    ))}
                  </div>
                </div>

                {/* Date + time row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>
                  {[
                    { label: 'Date',  type: 'date', val: newBlock.date,  key: 'date'  },
                    { label: 'Start', type: 'time', val: newBlock.start, key: 'start' },
                    { label: 'End',   type: 'time', val: newBlock.end,   key: 'end'   },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: '0.57rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>{f.label}</label>
                      <input type={f.type} className="input-dark" value={f.val} onChange={e => setNewBlock(p => ({ ...p, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                </div>

                <textarea placeholder="Notes (optional)…" className="input-dark" style={{ resize: 'vertical', minHeight: '60px', marginBottom: '0.875rem', fontSize: '0.8rem' }}
                  value={newBlock.notes} onChange={e => setNewBlock(p => ({ ...p, notes: e.target.value }))} />

                {session && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem', padding: '0.625rem 0.875rem', background: `${GCAL_COLOR}0c`, borderRadius: '8px', border: `1px solid ${GCAL_COLOR}20`, cursor: 'pointer' }}>
                    <input type="checkbox" checked={syncToGoogle} onChange={e => setSyncToGoogle(e.target.checked)} style={{ cursor: 'pointer', accentColor: GCAL_COLOR }} />
                    <GoogleIcon />
                    <span style={{ fontSize: '0.75rem', color: GCAL_COLOR }}>Also add to Google Calendar</span>
                  </label>
                )}

                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button onClick={addBlock} className="btn-primary" style={{ flex: 1, padding: '0.625rem' }}>Create Block</button>
                  <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ padding: '0.625rem 1rem' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--color-text-muted)',
  cursor: 'pointer', padding: '0.375rem 0.625rem', fontSize: '1.1rem', lineHeight: 1,
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

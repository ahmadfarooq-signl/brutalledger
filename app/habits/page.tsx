'use client'
import { useState, useEffect } from 'react'

const HABITS = {
  prayers: [
    { id: 'fajr', label: 'Fajr on time', auto: false },
    { id: 'zuhr', label: 'Zuhr on time', auto: false },
    { id: 'asr', label: 'Asr on time', auto: false },
    { id: 'maghrib', label: 'Maghrib on time', auto: false },
    { id: 'isha', label: 'Isha on time', auto: false },
  ],
  health: [
    { id: 'water_wake', label: '500ml water on wake', auto: false },
    { id: 'water_2l', label: '2L total water today', auto: false },
    { id: 'movement', label: 'Physical movement done', auto: false },
    { id: 'phone_off', label: 'Phone off by 10:30 PM', auto: false },
    { id: 'no_doom', label: 'No doom scrolling over 30 min', auto: false },
    { id: 'midnight', label: 'Slept before midnight', auto: false },
  ],
  business: [
    { id: 'dms', label: '10 outreach DMs sent', auto: true },
    { id: 'comments', label: '10 LinkedIn comments done', auto: true },
    { id: 'post', label: 'LinkedIn post published today', auto: false },
  ],
  finance: [
    { id: 'savings', label: 'Monthly savings target hit', auto: false },
    { id: 'expenses', label: 'Logged all expenses today', auto: false },
  ],
}

const CAT_LABELS: Record<string, string> = { prayers: 'Prayers', health: 'Health', business: 'Business', finance: 'Finance' }
const BG = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=2560&q=80'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(d: Date) { return d.toISOString().split('T')[0] }

function getMonWeek(ref: Date): Date[] {
  const day = ref.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(ref)
  mon.setDate(ref.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = first.getDay() === 0 ? 6 : first.getDay() - 1
  const cells: (Date | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function Habits() {
  const allHabits = Object.values(HABITS).flat()
  const today = fmt(new Date())
  const now = new Date()

  // records[dateStr][habitId] = boolean
  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>(() => {
    try { return JSON.parse(localStorage.getItem('bl-habits-records') || '{}') } catch { return {} }
  })
  const [view, setView] = useState<'today' | 'week' | 'month'>('today')
  const [monthRef, setMonthRef] = useState({ year: now.getFullYear(), month: now.getMonth() })

  useEffect(() => { localStorage.setItem('bl-habits-records', JSON.stringify(records)) }, [records])

  const todayRec = records[today] || {}
  const toggle = (id: string, val: boolean) => {
    setRecords(prev => ({
      ...prev,
      [today]: { ...(prev[today] || {}), [id]: val }
    }))
  }

  const done = allHabits.filter(h => todayRec[h.id]).length
  const pct = allHabits.length ? Math.round((done / allHabits.length) * 100) : 0
  const pctColor = pct >= 80 ? '#5d9c70' : pct >= 50 ? '#c4a842' : '#c0504d'

  const weekDates = getMonWeek(new Date())

  const getDayPct = (dateStr: string) => {
    const rec = records[dateStr] || {}
    const done = allHabits.filter(h => rec[h.id]).length
    return allHabits.length ? Math.round((done / allHabits.length) * 100) : 0
  }

  const monthDays = getMonthDays(monthRef.year, monthRef.month)

  const prevMonth = () => {
    setMonthRef(p => {
      const m = p.month === 0 ? 11 : p.month - 1
      const y = p.month === 0 ? p.year - 1 : p.year
      return { year: y, month: m }
    })
  }
  const nextMonth = () => {
    setMonthRef(p => {
      const m = p.month === 11 ? 0 : p.month + 1
      const y = p.month === 11 ? p.year + 1 : p.year
      return { year: y, month: m }
    })
  }

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.25rem', fontWeight: '700', color: 'var(--color-text)' }}>Habits</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginTop: '0.25rem' }}>Daily discipline tracker</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', fontWeight: '700', color: pctColor }}>{pct}%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Today</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Today', value: `${pct}%`, sub: `${done}/${allHabits.length} checks` },
              { label: 'This Week', value: `${Math.round(weekDates.reduce((s, d) => s + getDayPct(fmt(d)), 0) / 7)}%`, sub: 'Avg completion' },
              { label: '7-Day Streak', value: weekDates.filter(d => getDayPct(fmt(d)) === 100).length.toString(), sub: 'Perfect days' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '0.875rem 1rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text)' }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', marginTop: '0.2rem' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem' }}>
            {(['today', 'week', 'month'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '0.375rem 0.875rem', borderRadius: '5px', border: '1px solid',
                borderColor: view === v ? '#f2641955' : 'var(--color-border-subtle)',
                background: view === v ? '#f2641911' : 'transparent',
                color: view === v ? '#f26419' : 'var(--color-text-placeholder)',
                fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.08em',
                textTransform: 'capitalize' as const,
              }}>{v}</button>
            ))}
          </div>

          {/* TODAY VIEW */}
          {view === 'today' && (
            Object.entries(HABITS).map(([cat, habits]) => (
              <div key={cat} className="card" style={{ padding: '1.25rem', marginBottom: '0.875rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingBottom: '0.625rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {CAT_LABELS[cat]}
                </div>
                {habits.map((h, i) => (
                  <div key={h.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input type="checkbox" className="checkbox-custom"
                          checked={!!todayRec[h.id]}
                          onChange={e => toggle(h.id, e.target.checked)}
                          disabled={h.auto}
                        />
                        <span style={{ fontSize: '0.82rem', color: todayRec[h.id] ? 'var(--color-text-placeholder)' : 'var(--color-text-muted)', textDecoration: todayRec[h.id] ? 'line-through' : 'none' }}>
                          {h.label}
                        </span>
                        {h.auto && <span className="badge badge-accent" style={{ fontSize: '0.55rem' }}>Auto</span>}
                      </div>
                    </div>
                    {i < habits.length - 1 && <div className="divider" />}
                  </div>
                ))}
              </div>
            ))
          )}

          {/* WEEK VIEW */}
          {view === 'week' && (
            <div className="card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                Week of {weekDates[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} to {weekDates[6].toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </div>
              <div style={{ minWidth: '600px' }}>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
                  <div />
                  {weekDates.map((d, i) => {
                    const isToday = fmt(d) === today
                    const isFuture = d > new Date()
                    return (
                      <div key={i} style={{ textAlign: 'center', padding: '0.375rem 0.25rem' }}>
                        <div style={{ fontSize: '0.58rem', color: isToday ? '#f26419' : 'var(--color-text-placeholder)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{WEEK_DAYS[i]}</div>
                        <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-playfair)', color: isToday ? '#f26419' : isFuture ? 'var(--color-text-placeholder)' : 'var(--color-text-muted)', fontWeight: isToday ? '700' : '400' }}>{d.getDate()}</div>
                      </div>
                    )
                  })}
                </div>
                {/* Habit rows */}
                {Object.entries(HABITS).map(([cat, habits]) => (
                  <div key={cat}>
                    <div style={{ fontSize: '0.55rem', color: '#f26419', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.5rem 0 0.25rem', borderTop: '1px solid var(--color-border-subtle)' }}>{CAT_LABELS[cat]}</div>
                    {habits.map(h => (
                      <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', gap: '3px', marginBottom: '3px', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', paddingRight: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</div>
                        {weekDates.map((d, i) => {
                          const ds = fmt(d)
                          const isFuture = d > new Date() && ds !== today
                          const isDone = !!(records[ds] || {})[h.id]
                          const isPast = d < new Date() || ds === today
                          const bg = !isFuture && isPast
                            ? (isDone ? 'var(--color-done-bg)' : 'var(--color-missed-bg)')
                            : 'var(--color-border-subtle)'
                          return (
                            <div key={i} style={{
                              height: '24px', borderRadius: '3px',
                              background: bg, border: '1px solid var(--color-border-subtle)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {!isFuture && isPast && (
                                <span style={{ fontSize: '0.6rem', color: isDone ? 'var(--color-done-text)' : 'var(--color-missed-text)' }}>
                                  {isDone ? '✓' : '×'}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MONTH VIEW */}
          {view === 'month' && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', color: 'var(--color-text)' }}>
                  {MONTH_NAMES[monthRef.month]} {monthRef.year}
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={prevMonth} style={{ background: 'transparent', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-dim)', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>←</button>
                  <button onClick={nextMonth} style={{ background: 'transparent', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-dim)', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>→</button>
                </div>
              </div>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
                {WEEK_DAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.58rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0' }}>{d}</div>
                ))}
              </div>
              {/* Calendar cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                {monthDays.map((d, i) => {
                  if (!d) return <div key={i} />
                  const ds = fmt(d)
                  const isToday = ds === today
                  const isFuture = d > new Date()
                  const p = getDayPct(ds)
                  const hasData = !!(records[ds])
                  let bg = 'var(--color-border-subtle)'
                  let textColor = 'var(--color-text-placeholder)'
                  if (!isFuture && hasData) {
                    bg = p >= 80 ? '#4a7c5922' : p >= 50 ? '#8a734022' : '#8b3a3a22'
                    textColor = p >= 80 ? '#5d9c70' : p >= 50 ? '#c4a842' : '#c0504d'
                  }
                  return (
                    <div key={i} style={{
                      padding: '0.375rem 0.25rem',
                      borderRadius: '4px',
                      background: bg,
                      border: `1px solid ${isToday ? '#f2641955' : 'transparent'}`,
                      textAlign: 'center',
                      minHeight: '44px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.125rem',
                    }}>
                      <div style={{ fontSize: '0.72rem', color: isToday ? '#f26419' : 'var(--color-text-muted)', fontWeight: isToday ? '700' : '400' }}>{d.getDate()}</div>
                      {!isFuture && hasData && (
                        <div style={{ fontSize: '0.6rem', color: textColor }}>{p}%</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

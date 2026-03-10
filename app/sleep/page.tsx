'use client'
import { useState } from 'react'

type SleepEntry = { start: string; end: string; label: string }
type DayRecord = { entries: SleepEntry[] }

const BG = 'https://images.unsplash.com/photo-1518791841217-8f162f1912da?auto=format&fit=crop&w=2560&q=80'
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0
  let s = parseMinutes(start)
  let e = parseMinutes(end)
  if (e < s) e += 24 * 60
  return Math.round((e - s) / 60 * 10) / 10
}

function to12h(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${(m || 0).toString().padStart(2, '0')} ${period}`
}

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

function getSleepAlerts(entries: SleepEntry[]) {
  const alerts: Array<{ type: 'red' | 'yellow' | 'green'; msg: string }> = []
  const total = entries.reduce((sum, e) => sum + calcHours(e.start, e.end), 0)
  const main = entries[0]
  if (total === 0) return alerts
  if (total < 6) alerts.push({ type: 'red', msg: 'Low sleep, cognitive performance impaired today' })
  else if (total < 7) alerts.push({ type: 'yellow', msg: 'Suboptimal sleep, below 7h target' })
  else if (total <= 9) alerts.push({ type: 'green', msg: 'Good sleep, target met' })
  else alerts.push({ type: 'yellow', msg: 'Oversleeping, check energy levels' })
  if (main?.start) {
    const bedtimeMins = parseMinutes(main.start)
    if (bedtimeMins < 360 && bedtimeMins >= 60) alerts.push({ type: 'red', msg: 'Very late bedtime, sleep quality reduced' })
    else if (bedtimeMins < 360 && bedtimeMins >= 0) alerts.push({ type: 'yellow', msg: 'Late bedtime logged after midnight' })
  }
  entries.slice(1).forEach((nap, i) => {
    const napHours = calcHours(nap.start, nap.end)
    if (napHours > 1.5) alerts.push({ type: 'yellow', msg: `Nap ${i + 1} over 90 min, may affect tonight's sleep` })
    if (nap.start) {
      const napMins = parseMinutes(nap.start)
      if (napMins >= 960) alerts.push({ type: 'yellow', msg: `Nap ${i + 1} after 4 PM, risk of disrupted night sleep` })
    }
  })
  return alerts
}

// 12-hour time input component
function TimeInput12({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const parts = value ? value.split(':') : ['0', '00']
  const hour24 = parseInt(parts[0]) || 0
  const minutes = parts[1] || '00'
  const isPM = hour24 >= 12
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24

  const update = (newH12: number, newM: string, newPM: boolean) => {
    let h24 = newH12
    if (newPM && newH12 !== 12) h24 = newH12 + 12
    if (!newPM && newH12 === 12) h24 = 0
    onChange(`${h24.toString().padStart(2, '0')}:${newM.padStart(2, '0')}`)
  }

  return (
    <div>
      {label && <label style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{label}</label>}
      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
        <select
          className="input-dark"
          style={{ width: '60px', padding: '0.5rem 0.35rem' }}
          value={hour12}
          onChange={e => update(parseInt(e.target.value), minutes, isPM)}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', flexShrink: 0 }}>:</span>
        <select
          className="input-dark"
          style={{ width: '60px', padding: '0.5rem 0.35rem' }}
          value={parseInt(minutes).toString()}
          onChange={e => update(hour12, e.target.value.padStart(2, '0'), isPM)}
        >
          {Array.from({ length: 12 }, (_, i) => (i * 5)).map(m => (
            <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
          ))}
        </select>
        <select
          className="input-dark"
          style={{ width: '68px', padding: '0.5rem 0.35rem' }}
          value={isPM ? 'PM' : 'AM'}
          onChange={e => update(hour12, minutes, e.target.value === 'PM')}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  )
}

export default function Sleep() {
  const today = fmt(new Date())
  const now = new Date()

  // All sleep data per day
  const [allData, setAllData] = useState<Record<string, DayRecord>>({})
  const [view, setView] = useState<'today' | 'week' | 'month'>('today')
  const [monthRef, setMonthRef] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [showAddNap, setShowAddNap] = useState(false)
  const [newNap, setNewNap] = useState({ start: '13:00', end: '14:00' })
  const [mainSleep, setMainSleep] = useState({ start: '22:00', end: '06:00' })
  const [mainLogged, setMainLogged] = useState(false)

  const todayEntries = allData[today]?.entries || []
  const total = todayEntries.reduce((sum, e) => sum + calcHours(e.start, e.end), 0)
  const alerts = getSleepAlerts(todayEntries)

  const logMainSleep = () => {
    if (!mainSleep.start || !mainSleep.end) return
    const entry: SleepEntry = { start: mainSleep.start, end: mainSleep.end, label: 'Main Sleep' }
    setAllData(prev => {
      const existing = prev[today]?.entries || []
      const filtered = existing.filter(e => e.label === 'Main Sleep' ? false : true)
      return { ...prev, [today]: { entries: [entry, ...filtered] } }
    })
    setMainLogged(true)
  }

  const addNap = () => {
    if (!newNap.start || !newNap.end) return
    const napNum = todayEntries.filter(e => e.label !== 'Main Sleep').length + 1
    const entry: SleepEntry = { start: newNap.start, end: newNap.end, label: `Nap ${napNum}` }
    setAllData(prev => ({
      ...prev,
      [today]: { entries: [...(prev[today]?.entries || []), entry] }
    }))
    setNewNap({ start: '13:00', end: '14:00' })
    setShowAddNap(false)
  }

  const removeEntry = (label: string) => {
    setAllData(prev => ({
      ...prev,
      [today]: { entries: (prev[today]?.entries || []).filter(e => e.label !== label) }
    }))
    if (label === 'Main Sleep') setMainLogged(false)
  }

  const getDayTotal = (dateStr: string) => {
    const entries = allData[dateStr]?.entries || []
    return entries.reduce((sum, e) => sum + calcHours(e.start, e.end), 0)
  }

  const weekDates = getMonWeek(new Date())
  const monthDays = getMonthDays(monthRef.year, monthRef.month)

  const prevMonth = () => setMonthRef(p => ({ year: p.month === 0 ? p.year - 1 : p.year, month: p.month === 0 ? 11 : p.month - 1 }))
  const nextMonth = () => setMonthRef(p => ({ year: p.month === 11 ? p.year + 1 : p.year, month: p.month === 11 ? 0 : p.month + 1 }))

  const sleepColor = (h: number) => h === 0 ? 'var(--color-border)' : h < 6 ? '#8b3a3a' : h < 7 ? '#8a7340' : '#4a7c59'

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.25rem', fontWeight: '700', color: 'var(--color-text)' }}>Sleep</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginTop: '0.25rem' }}>Track your rest patterns</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', fontWeight: '700', color: total < 6 ? '#c0504d' : total < 7 ? '#c4a842' : '#5d9c70' }}>{total}h</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Today</div>
            </div>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem' }}>
            {(['today', 'week', 'month'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '0.375rem 0.875rem', borderRadius: '5px', border: '1px solid',
                borderColor: view === v ? '#f2641955' : 'var(--color-border-subtle)',
                background: view === v ? '#f2641911' : 'transparent',
                color: view === v ? '#f26419' : 'var(--color-text-placeholder)',
                fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'capitalize' as const,
              }}>{v}</button>
            ))}
          </div>

          {/* TODAY VIEW */}
          {view === 'today' && (
            <>
              {alerts.map((a, i) => (
                <div key={i} className={`alert-${a.type}`} style={{ marginBottom: '0.625rem' }}>{a.msg}</div>
              ))}

              {/* Log main sleep */}
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
                  {mainLogged ? 'Main Sleep (logged)' : 'Log Main Sleep'}
                </div>
                {!mainLogged ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.875rem' }}>
                      <TimeInput12 value={mainSleep.start} onChange={v => setMainSleep(p => ({ ...p, start: v }))} label="Bedtime" />
                      <TimeInput12 value={mainSleep.end} onChange={v => setMainSleep(p => ({ ...p, end: v }))} label="Wake time" />
                    </div>
                    <button onClick={logMainSleep} className="btn-primary">Log Sleep</button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', color: 'var(--color-text)' }}>
                      {to12h(mainSleep.start)} → {to12h(mainSleep.end)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', color: '#f26419' }}>{calcHours(mainSleep.start, mainSleep.end)}h</div>
                      <button onClick={() => removeEntry('Main Sleep')} style={{ background: '#8b3a3a22', border: '1px solid #8b3a3a44', color: '#c0504d', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer' }}>×</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Nap entries */}
              {todayEntries.filter(e => e.label !== 'Main Sleep').map((e, i) => (
                <div key={i} className="card" style={{ padding: '1rem 1.25rem', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{e.label}</div>
                    <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', color: 'var(--color-text)' }}>{to12h(e.start)} → {to12h(e.end)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', color: '#f26419' }}>{calcHours(e.start, e.end)}h</div>
                    <button onClick={() => removeEntry(e.label)} style={{ background: '#8b3a3a22', border: '1px solid #8b3a3a44', color: '#c0504d', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer' }}>×</button>
                  </div>
                </div>
              ))}

              {/* Add nap */}
              {!showAddNap ? (
                <button onClick={() => setShowAddNap(true)} className="btn-ghost" style={{ width: '100%', marginTop: '0.5rem' }}>+ Log Nap</button>
              ) : (
                <div className="card" style={{ padding: '1.25rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Log Nap</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.875rem' }}>
                    <TimeInput12 value={newNap.start} onChange={v => setNewNap(p => ({ ...p, start: v }))} label="Start time" />
                    <TimeInput12 value={newNap.end} onChange={v => setNewNap(p => ({ ...p, end: v }))} label="End time" />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={addNap} className="btn-primary">Save Nap</button>
                    <button onClick={() => setShowAddNap(false)} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* WEEK VIEW */}
          {view === 'week' && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
                Week of {weekDates[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} to {weekDates[6].toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px' }}>
                {weekDates.map((d, i) => {
                  const ds = fmt(d)
                  const h = getDayTotal(ds)
                  const isToday = ds === today
                  const isFuture = d > new Date()
                  const maxH = 10
                  const pct = h ? Math.min((h / maxH) * 100, 100) : 0
                  const color = isToday ? '#f26419' : isFuture ? 'var(--color-border)' : sleepColor(h)
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', height: '100%', justifyContent: 'flex-end' }}>
                      {h > 0 && <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>{h}h</div>}
                      <div style={{ width: '100%', height: `${Math.max(pct, 0)}%`, background: color, borderRadius: '3px 3px 0 0', minHeight: h > 0 ? '4px' : '2px', transition: 'height 0.4s ease' }} />
                      <div style={{ fontSize: '0.58rem', color: isToday ? '#f26419' : 'var(--color-text-placeholder)', textAlign: 'center' }}>{WEEK_DAYS[i]}<br />{d.getDate()}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                {[{ color: '#4a7c59', label: '7h+' }, { color: '#8a7340', label: '6-7h' }, { color: '#8b3a3a', label: 'Under 6h' }, { color: 'var(--color-border)', label: 'No data' }].map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)' }}>{l.label}</span>
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
                  const h = getDayTotal(ds)
                  const hasData = h > 0
                  const bgColor = !isFuture && hasData ? sleepColor(h) + '22' : 'var(--color-border-subtle)'
                  const textColor = !isFuture && hasData ? sleepColor(h).replace('22', '') : 'var(--color-text-placeholder)'
                  return (
                    <div key={i} style={{
                      padding: '0.375rem 0.25rem',
                      borderRadius: '4px',
                      background: bgColor,
                      border: `1px solid ${isToday ? '#f2641955' : 'transparent'}`,
                      textAlign: 'center',
                      minHeight: '48px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.125rem',
                    }}>
                      <div style={{ fontSize: '0.72rem', color: isToday ? '#f26419' : 'var(--color-text-muted)', fontWeight: isToday ? '700' : '400' }}>{d.getDate()}</div>
                      {!isFuture && hasData && (
                        <div style={{ fontSize: '0.6rem', color: sleepColor(h) }}>{h}h</div>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                {[{ color: '#4a7c59', label: '7h+' }, { color: '#8a7340', label: '6-7h' }, { color: '#8b3a3a', label: 'Under 6h' }].map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

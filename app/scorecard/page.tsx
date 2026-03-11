'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const BG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2560&q=80'

type PastWeek = {
  id: string; range: string; dms: number; posts: number; sleep: string;
  cmts: number; savings: string; pct: number
}
type Metric = { label: string; value: number; target: number; unit: string }

const DEFAULT_METRICS: Metric[] = [
  { label: 'Outreach DMs', value: 0, target: 50, unit: '' },
  { label: 'Posts Published', value: 0, target: 3, unit: '' },
  { label: 'Comments Logged', value: 0, target: 50, unit: '' },
  { label: 'Avg Sleep', value: 0, target: 7, unit: 'h' },
  { label: 'Habit Rate', value: 0, target: 100, unit: '%' },
  { label: 'Deep Work Hours', value: 0, target: 25, unit: 'h' },
  { label: 'Days Fajr on Time', value: 0, target: 7, unit: '' },
  { label: 'Days Exercise', value: 0, target: 5, unit: '' },
]

export default function Scorecard() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [avoided, setAvoided] = useState('')
  const [saved, setSaved] = useState(false)
  const [pastWeeks, setPastWeeks] = useState<PastWeek[]>([])
  const [metrics, setMetrics] = useState<Metric[]>(DEFAULT_METRICS)
  const [loading, setLoading] = useState(true)
  const [showLogWeek, setShowLogWeek] = useState(false)
  const [newWeek, setNewWeek] = useState({ range: '', dms: '', posts: '', sleep: '', cmts: '', savings: '', pct: '' })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: weekData }, { data: metricData }, { data: settData }] = await Promise.all([
        supabase.from('scorecard_weeks').select('*').order('rowid' as never, { ascending: false }),
        supabase.from('scorecard_metrics').select('*'),
        supabase.from('scorecard_settings').select('*'),
      ])

      setPastWeeks((weekData || []).map((w: {
        id: string; range: string; dms: number; posts: number; sleep: string;
        cmts: number; savings: string; pct: number;
      }) => ({ id: w.id, range: w.range, dms: w.dms, posts: w.posts, sleep: w.sleep, cmts: w.cmts, savings: w.savings, pct: w.pct })))

      if (metricData && metricData.length > 0) {
        // Merge loaded metrics with defaults (in case new ones were added)
        const loadedMap: Record<string, Metric> = {}
        for (const m of metricData) {
          loadedMap[m.label] = { label: m.label, value: m.value, target: m.target, unit: m.unit }
        }
        setMetrics(DEFAULT_METRICS.map(dm => loadedMap[dm.label] ? { ...dm, value: loadedMap[dm.label].value } : dm))
      } else {
        // Seed default metrics
        await supabase.from('scorecard_metrics').insert(DEFAULT_METRICS.map(m => ({
          label: m.label, value: m.value, target: m.target, unit: m.unit,
        })))
      }

      const avoidedRow = (settData || []).find((r: { key: string; value: string }) => r.key === 'avoided')
      if (avoidedRow) setAvoided(avoidedRow.value)

      setLoading(false)
    }
    load()
  }, [])

  const updateMetric = async (i: number, val: string) => {
    const numVal = Number(val) || 0
    setMetrics(prev => prev.map((m, idx) => idx === i ? { ...m, value: numVal } : m))
    const metric = metrics[i]
    await supabase.from('scorecard_metrics').upsert({ label: metric.label, value: numVal, target: metric.target, unit: metric.unit }, { onConflict: 'label' })
  }

  const saveAvoided = async () => {
    setSaved(true)
    await supabase.from('scorecard_settings').upsert({ key: 'avoided', value: avoided }, { onConflict: 'key' })
  }

  const deletePastWeek = async (id: string) => {
    setPastWeeks(p => p.filter(w => w.id !== id))
    await supabase.from('scorecard_weeks').delete().eq('id', id)
  }

  const logPastWeek = async () => {
    if (!newWeek.range) return
    const id = Date.now().toString()
    const week: PastWeek = {
      id,
      range: newWeek.range,
      dms: Number(newWeek.dms) || 0,
      posts: Number(newWeek.posts) || 0,
      sleep: newWeek.sleep || '0h',
      cmts: Number(newWeek.cmts) || 0,
      savings: newWeek.savings || 'PKR 0',
      pct: Number(newWeek.pct) || 0,
    }
    setPastWeeks(p => [week, ...p])
    setNewWeek({ range: '', dms: '', posts: '', sleep: '', cmts: '', savings: '', pct: '' })
    setShowLogWeek(false)
    await supabase.from('scorecard_weeks').insert({
      id: week.id, range: week.range, dms: week.dms, posts: week.posts,
      sleep: week.sleep, cmts: week.cmts, savings: week.savings, pct: week.pct,
    })
  }

  // Calculate current week date range
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const weekLabel = `${mon.toLocaleDateString('en', { day: 'numeric', month: 'short' })} to ${sun.toLocaleDateString('en', { day: 'numeric', month: 'short' })}`

  if (loading) {
    return (
      <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
        <div className="page-overlay">
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 2rem', color: 'var(--color-text-placeholder)', fontSize: '0.85rem' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.25rem', fontWeight: '700', color: 'var(--color-text)' }}>Scorecard</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginTop: '0.25rem' }}>Weekly and monthly performance review</p>
            </div>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {(['week', 'month'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: '0.375rem 0.875rem', borderRadius: '5px', border: '1px solid',
                  borderColor: period === p ? '#f2641955' : 'var(--color-border-subtle)',
                  background: period === p ? '#f2641911' : 'transparent',
                  color: period === p ? '#f26419' : 'var(--color-text-placeholder)',
                  fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'capitalize' as const,
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* This week card */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', color: 'var(--color-text)' }}>This Week</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-placeholder)' }}>{weekLabel}</div>
            </div>

            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Enter your week's numbers
            </div>

            {metrics.map((m, i) => {
              const pct = m.target > 0 ? Math.round((m.value / m.target) * 100) : 0
              const color = pct >= 80 ? '#5d9c70' : pct >= 40 ? '#c4a842' : '#c0504d'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', flex: 1 }}>{m.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      className="input-dark"
                      style={{ width: '70px', textAlign: 'center', padding: '0.25rem 0.375rem', fontSize: '0.78rem' }}
                      value={m.value || ''}
                      placeholder="0"
                      onChange={e => updateMetric(i, e.target.value)}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', minWidth: '60px' }}>
                      / {m.target}{m.unit}
                    </span>
                    <span style={{ fontSize: '0.72rem', color, fontFamily: 'var(--font-playfair)', minWidth: '40px', textAlign: 'right' as const }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Reflection */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>What Did I Avoid This Week?</div>
              <textarea
                className="input-dark"
                style={{ resize: 'vertical', minHeight: '80px', marginBottom: '0.75rem' }}
                placeholder="Be honest with yourself..."
                value={avoided}
                onChange={e => { setAvoided(e.target.value); setSaved(false) }}
              />
              <button onClick={saveAvoided} className="btn-primary">
                {saved ? 'Saved' : 'Save Reflection'}
              </button>
            </div>
          </div>

          {/* Past Weeks */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Past Weeks</div>
            <button onClick={() => setShowLogWeek(true)} className="btn-ghost" style={{ padding: '0.25rem 0.625rem', fontSize: '0.65rem' }}>+ Log Past Week</button>
          </div>

          {/* Log past week form */}
          {showLogWeek && (
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Log Past Week</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <input placeholder="Week range (e.g. 3 Mar to 9 Mar)" className="input-dark" value={newWeek.range} onChange={e => setNewWeek(p => ({ ...p, range: e.target.value }))} />
                <input placeholder="Completion %" type="number" className="input-dark" value={newWeek.pct} onChange={e => setNewWeek(p => ({ ...p, pct: e.target.value }))} />
                <input placeholder="DMs sent" type="number" className="input-dark" value={newWeek.dms} onChange={e => setNewWeek(p => ({ ...p, dms: e.target.value }))} />
                <input placeholder="Posts published" type="number" className="input-dark" value={newWeek.posts} onChange={e => setNewWeek(p => ({ ...p, posts: e.target.value }))} />
                <input placeholder="Avg sleep (e.g. 6.5h)" className="input-dark" value={newWeek.sleep} onChange={e => setNewWeek(p => ({ ...p, sleep: e.target.value }))} />
                <input placeholder="Comments logged" type="number" className="input-dark" value={newWeek.cmts} onChange={e => setNewWeek(p => ({ ...p, cmts: e.target.value }))} />
                <input placeholder="Savings (e.g. PKR 5,000)" className="input-dark" value={newWeek.savings} onChange={e => setNewWeek(p => ({ ...p, savings: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={logPastWeek} className="btn-primary">Add Week</button>
                <button onClick={() => setShowLogWeek(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {pastWeeks.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)' }}>No past weeks logged yet.</div>
            </div>
          ) : (
            pastWeeks.map((w) => (
              <div key={w.id} className="card" style={{ padding: '1rem 1.25rem', marginBottom: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{w.range}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${w.pct >= 80 ? 'badge-green' : w.pct >= 40 ? 'badge-yellow' : 'badge-red'}`}>{w.pct}%</span>
                    <button onClick={() => deletePastWeek(w.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.2rem', lineHeight: 1 }}>×</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: 'DMS', value: w.dms },
                    { label: 'POSTS', value: w.posts },
                    { label: 'SLEEP', value: w.sleep },
                    { label: 'CMTS', value: w.cmts },
                    { label: 'SAVINGS', value: w.savings },
                  ].map((s, j) => (
                    <div key={j} style={{ textAlign: 'center' as const }}>
                      <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{s.value}</div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.08em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

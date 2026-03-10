'use client'
import { useState, useEffect } from 'react'

const MODES = [
  { label: '25 / 5', name: 'Classic', work: 25 * 60, breakTime: 5 * 60 },
  { label: '45 / 15', name: 'Deep Work', work: 45 * 60, breakTime: 15 * 60 },
  { label: '90 / 30', name: 'Flow State', work: 90 * 60, breakTime: 30 * 60 },
]

export default function Pomodoro() {
  const [mode, setMode] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MODES[0].work)
  const [running, setRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [session, setSession] = useState(1)
  const [totalSessions, setTotalSessions] = useState(0)
  const [log, setLog] = useState<Array<{ mode: string; type: string; time: string }>>([])

  useEffect(() => {
    setTimeLeft(isBreak ? MODES[mode].breakTime : MODES[mode].work)
    setRunning(false)
  }, [mode])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!isBreak) {
            setTotalSessions(s => s + 1)
            setLog(l => [{ mode: MODES[mode].name, type: 'Work', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...l])
            setIsBreak(true)
            return MODES[mode].breakTime
          } else {
            setSession(s => s + 1)
            setIsBreak(false)
            return MODES[mode].work
          }
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running, isBreak, mode])

  const total = isBreak ? MODES[mode].breakTime : MODES[mode].work
  const pct = ((total - timeLeft) / total) * 100
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const secs = (timeLeft % 60).toString().padStart(2, '0')
  const reset = () => { setRunning(false); setIsBreak(false); setTimeLeft(MODES[mode].work); setSession(1) }

  const radius = 80
  const circ = 2 * Math.PI * radius
  const strokeDash = circ - (pct / 100) * circ

  return (
    <div className="page-enter" style={{ maxWidth: '700px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.25rem', fontWeight: '700', color: 'var(--color-text)' }}>Pomodoro</h1>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Focus timer — work in sessions</p>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {MODES.map((m, i) => (
          <button key={i} onClick={() => { setMode(i); setIsBreak(false); setTimeLeft(m.work); setRunning(false) }} style={{
            padding: '1rem', borderRadius: '8px', border: '1px solid',
            borderColor: mode === i ? '#f2641955' : 'var(--color-border-subtle)',
            background: mode === i ? '#f2641911' : 'var(--color-card)',
            cursor: 'pointer', textAlign: 'left' as const,
          }}>
            <div style={{ fontSize: '0.6rem', color: mode === i ? '#f26419' : 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{m.name}</div>
            <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: '600', color: mode === i ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{m.label}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', marginTop: '0.2rem' }}>min work / break</div>
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '200px', height: '200px', marginBottom: '1.5rem' }}>
          <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="4" />
            <circle cx="100" cy="100" r={radius} fill="none"
              stroke={isBreak ? '#4a7c59' : '#f26419'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={strokeDash}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.75rem', fontWeight: '700', color: isBreak ? '#5d9c70' : 'var(--color-text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {mins}:{secs}
            </div>
            <div style={{ fontSize: '0.6rem', color: isBreak ? '#5d9c70' : 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.375rem' }}>
              {isBreak ? 'Break' : `Session ${session}`}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setRunning(r => !r)} className="btn-primary" style={{ padding: '0.625rem 2rem', fontSize: '0.8rem' }}>
            {running ? 'Pause' : 'Start'}
          </button>
          <button onClick={reset} className="btn-ghost" style={{ padding: '0.625rem 1.25rem' }}>Reset</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Sessions Today', value: totalSessions.toString() },
          { label: 'Focus Time', value: `${Math.round(totalSessions * MODES[mode].work / 60)}m` },
          { label: 'Current Mode', value: MODES[mode].name },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Session Log</div>
          {log.map((entry, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge badge-accent" style={{ fontSize: '0.55rem' }}>{entry.type}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{entry.mode}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-placeholder)' }}>{entry.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

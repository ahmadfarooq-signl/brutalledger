'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const MORNING_BRIEFS = [
  "You have 4 months of runway if you stay disciplined. One client this month changes everything.",
  "The negative voice is not telling the truth. Nick's profile is live with 3,490 followers. These are facts.",
  "Today's three priorities: Send 10 DMs. Post or engage on LinkedIn. Drink 2 litres of water.",
  "The plan is not the problem. The only question is whether you will do it today, or plan it again tomorrow.",
  "You are merging two versions of yourself. Pre-accident discipline. Post-accident skills. The merging happens through action.",
  "Islamabad. Office. Morning run. Made it out. That is where this goes if you do the work today.",
  "Hold the price. $350 for the audit. Do not discount. Do not apologise. Go to the evidence. Go to Nick.",
  "No decisions after 10PM. Whatever the brain says in the dark is not reliable. Write it down.",
  "Tell someone one real thing today. You do not have to carry all of it alone.",
  "SIGNL exists to make founders impossible to ignore. You built that idea. Now become the first proof of it.",
]

function useServerDate() {
  const [date, setDate] = useState(new Date())
  useEffect(() => {
    const update = () => setDate(new Date())
    update()
    const now = new Date()
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
    const timer = setTimeout(() => {
      update()
      setInterval(update, 86400000)
    }, msUntilMidnight)
    return () => clearTimeout(timer)
  }, [])
  return date
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const BG = 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=2560&q=80'

export default function Dashboard() {
  const date = useServerDate()
  const briefIndex = date.getDate() % MORNING_BRIEFS.length
  const brief = MORNING_BRIEFS[briefIndex]

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

          {/* Header */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.375rem', fontFamily: 'var(--font-dm-sans)' }}>
              {DAYS[date.getDay()]}
            </div>
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '700', color: 'var(--color-text)', lineHeight: 1.1 }}>
              {date.getDate()} {MONTHS[date.getMonth()]} {date.getFullYear()}
            </h1>
          </div>

          {/* Brief */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', borderColor: '#f2641922', background: 'var(--color-card)' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Morning Brief</div>
            <p style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>"{brief}"</p>
          </div>

          {/* Quick nav cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
            {[
              { label: 'Habits', href: '/habits', sub: 'Track daily discipline' },
              { label: 'Tasks', href: '/tasks', sub: 'Manage your projects' },
              { label: 'Outreach', href: '/outreach', sub: 'Prospect pipeline' },
              { label: 'Finance', href: '/finance', sub: 'Income and expenses' },
              { label: 'Scorecard', href: '/scorecard', sub: 'Weekly review' },
            ].map((item, i) => (
              <Link key={i} href={item.href} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '1.25rem 1.5rem', cursor: 'pointer' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'var(--font-dm-sans)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.sub}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

            {/* Quick Log */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-dm-sans)', marginBottom: '0.75rem' }}>Quick Log</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'Log an expense', href: '/finance' },
                  { label: 'Add a prospect', href: '/outreach' },
                  { label: 'Log a post', href: '/content' },
                  { label: 'Log sleep', href: '/sleep' },
                  { label: 'Add a task', href: '/tasks' },
                  { label: 'Add a calendar block', href: '/calendar' },
                ].map((a, i) => (
                  <Link key={i} href={a.href} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.75rem', borderRadius: '5px',
                    background: 'var(--color-input-bg)',
                    border: '1px solid var(--color-border-subtle)',
                    textDecoration: 'none',
                    fontSize: '0.78rem', color: 'var(--color-text-dim)', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-dim)'; }}>
                    <span style={{ color: 'var(--color-text-placeholder)' }}>→</span> {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Pomodoro widget */}
            <PomodoroWidget />

            {/* Module links */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-dm-sans)', marginBottom: '0.75rem' }}>All Modules</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {[
                  { label: 'Habits', href: '/habits', desc: 'Daily discipline tracker' },
                  { label: 'Tasks', href: '/tasks', desc: 'Project and task manager' },
                  { label: 'Calendar', href: '/calendar', desc: 'Schedule your week' },
                  { label: 'Sleep', href: '/sleep', desc: 'Rest pattern tracker' },
                  { label: 'Outreach', href: '/outreach', desc: 'Prospect pipeline' },
                  { label: 'Content', href: '/content', desc: 'Post log and knowledge base' },
                  { label: 'Finance', href: '/finance', desc: 'Income and expenses (PKR)' },
                  { label: 'Scorecard', href: '/scorecard', desc: 'Weekly performance review' },
                  { label: 'Pomodoro', href: '/pomodoro', desc: 'Focus timer' },
                ].map((m, i) => (
                  <Link key={i} href={m.href} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{m.label}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>{m.desc}</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function PomodoroWidget() {
  const MODES = [
    { label: '25/5', work: 25 * 60, breakTime: 5 * 60 },
    { label: '45/15', work: 45 * 60, breakTime: 15 * 60 },
    { label: '90/30', work: 90 * 60, breakTime: 30 * 60 },
  ]
  const [mode, setMode] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MODES[0].work)
  const [running, setRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [session, setSession] = useState(1)

  useEffect(() => {
    setTimeLeft(isBreak ? MODES[mode].breakTime : MODES[mode].work)
    setRunning(false)
  }, [mode])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!isBreak) { setIsBreak(true); return MODES[mode].breakTime }
          else { setIsBreak(false); setSession(s => s + 1); return MODES[mode].work }
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
  const switchMode = (i: number) => { setMode(i); setIsBreak(false); setTimeLeft(MODES[i].work); setRunning(false) }

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Pomodoro</div>
        <Link href="/pomodoro" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textDecoration: 'none', letterSpacing: '0.06em' }}>Full view →</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem' }}>
        {MODES.map((m, i) => (
          <button key={i} onClick={() => switchMode(i)} style={{
            flex: 1, padding: '0.3rem', borderRadius: '4px', border: '1px solid',
            borderColor: mode === i ? '#f2641955' : 'var(--color-border-subtle)',
            background: mode === i ? '#f2641911' : 'transparent',
            color: mode === i ? '#f26419' : 'var(--color-text-placeholder)',
            fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
            letterSpacing: '0.04em', transition: 'all 0.15s ease',
          }}>{m.label}</button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '2.25rem', fontFamily: 'var(--font-playfair)', fontWeight: '700', color: isBreak ? '#5d9c70' : 'var(--color-text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {mins}:{secs}
        </div>
        <div style={{ fontSize: '0.6rem', color: isBreak ? '#5d9c70' : 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.25rem' }}>
          {isBreak ? 'Break time' : `Session ${session}`}
        </div>
        <div style={{ height: '2px', background: 'var(--color-border-subtle)', borderRadius: '1px', marginTop: '0.625rem' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: isBreak ? '#4a7c59' : '#f26419', borderRadius: '1px', transition: 'width 1s linear' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setRunning(r => !r)} className="btn-primary" style={{ flex: 1 }}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="btn-ghost" style={{ padding: '0.5rem 0.75rem' }}>Reset</button>
      </div>
    </div>
  )
}

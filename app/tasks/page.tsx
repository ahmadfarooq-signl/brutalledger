'use client'
import { useState, useEffect } from 'react'

type Priority = 'high' | 'normal' | 'low'
type Status = 'today' | 'active' | 'completed'
type Project = { id: string; name: string; color: string }
type Task = {
  id: string; title: string; projectId: string; priority: Priority; status: Status;
  estimatedMins: number; loggedSecs: number; isTracking: boolean; trackStart: number | null
}

const PRIORITY_COLORS: Record<Priority, string> = { high: '#c0504d', normal: '#f26419', low: '#55555f' }
const BG = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=2560&q=80'
const COLORS = ['#f26419', '#5d9c70', '#c0504d', '#9b7fd4', '#7a8fbc', '#c4a842', '#8a8a94']

function fmtTime(secs: number): string {
  if (secs <= 0) return '0s'
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
}

export default function Tasks() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<Status | 'all'>('today')
  const [projectFilter, setProjectFilter] = useState('all')
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [newTask, setNewTask] = useState({
    title: '', projectId: '', priority: 'normal' as Priority,
    status: 'today' as Status, estimatedMins: ''
  })
  const [newProject, setNewProject] = useState({ name: '', color: '#f26419' })

  useEffect(() => {
    if (!activeTaskId) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTaskId])

  const addTask = () => {
    if (!newTask.title) return
    const projectId = newTask.projectId || (projects[0]?.id || '')
    const t: Task = {
      ...newTask,
      projectId,
      id: Date.now().toString(),
      estimatedMins: Number(newTask.estimatedMins) || 0,
      loggedSecs: 0,
      isTracking: false,
      trackStart: null,
    }
    setTasks(p => [t, ...p])
    setNewTask({ title: '', projectId: projects[0]?.id || '', priority: 'normal', status: 'today', estimatedMins: '' })
    setShowAddTask(false)
  }

  const addProject = () => {
    if (!newProject.name) return
    const p: Project = { ...newProject, id: Date.now().toString() }
    setProjects(prev => [...prev, p])
    setNewProject({ name: '', color: '#f26419' })
    setShowAddProject(false)
    // Update default projectId for new tasks
    setNewTask(t => ({ ...t, projectId: p.id }))
  }

  const toggleTimer = (id: string) => {
    const now = Date.now()
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (t.isTracking) {
          const elapsed = Math.floor((now - (t.trackStart || now)) / 1000)
          return { ...t, isTracking: false, trackStart: null, loggedSecs: t.loggedSecs + elapsed }
        }
        return { ...t, isTracking: true, trackStart: now }
      }
      // Stop any other running timer
      if (t.isTracking) {
        const elapsed = Math.floor((now - (t.trackStart || now)) / 1000)
        return { ...t, isTracking: false, trackStart: null, loggedSecs: t.loggedSecs + elapsed }
      }
      return t
    }))
    setActiveTaskId(id === activeTaskId ? null : id)
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    if (activeTaskId === id) setActiveTaskId(null)
  }

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setTasks(prev => prev.filter(t => t.projectId !== id))
    if (projectFilter === id) setProjectFilter('all')
  }

  const completeTask = (id: string) => {
    // If task is running, stop timer first
    const now = Date.now()
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const extra = t.isTracking ? Math.floor((now - (t.trackStart || now)) / 1000) : 0
        return { ...t, status: 'completed', isTracking: false, trackStart: null, loggedSecs: t.loggedSecs + extra }
      }
      return t
    }))
    if (activeTaskId === id) setActiveTaskId(null)
  }

  const getElapsedSecs = (task: Task) => {
    if (!task.isTracking || !task.trackStart) return task.loggedSecs
    return task.loggedSecs + Math.floor((Date.now() - task.trackStart) / 1000)
  }

  const filtered = tasks.filter(t => {
    const matchStatus = filter === 'all' || t.status === filter
    const matchProject = projectFilter === 'all' || t.projectId === projectFilter
    return matchStatus && matchProject
  })

  const todayCount = tasks.filter(t => t.status === 'today').length
  const totalSecs = tasks.reduce((s, t) => s + getElapsedSecs(t), 0)
  const activeTask = tasks.find(t => t.isTracking)

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

          {/* Active timer banner */}
          {activeTask && (
            <div style={{ position: 'sticky', top: '60px', zIndex: 40, background: '#f2641911', border: '1px solid #f2641933', borderRadius: '6px', padding: '0.625rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f26419' }} className="pulse-soft" />
                <span style={{ fontSize: '0.78rem', color: '#f26419' }}>Tracking: {activeTask.title}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '0.9rem', color: '#f26419', fontVariantNumeric: 'tabular-nums' }}>
                {fmtTime(getElapsedSecs(activeTask))}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.25rem', fontWeight: '700', color: 'var(--color-text)' }}>Tasks</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginTop: '0.25rem' }}>Projects and daily task management</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowAddProject(true)} className="btn-ghost">+ Project</button>
              <button onClick={() => setShowAddTask(true)} className="btn-primary">+ Task</button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Tasks Today</div>
              <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text)' }}>{todayCount}</div>
            </div>
            <div className="card" style={{ padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Time Tracked</div>
              <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text)' }}>{fmtTime(totalSecs)}</div>
            </div>
            <div className="card" style={{ padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Projects</div>
              <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text)' }}>{projects.length}</div>
            </div>
          </div>

          {/* Add project */}
          {showAddProject && (
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>New Project</div>
              <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <input placeholder="Project name" className="input-dark" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} />
                <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewProject(p => ({ ...p, color: c }))} style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, border: newProject.color === c ? '2px solid var(--color-text)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={addProject} className="btn-primary">Add Project</button>
                <button onClick={() => setShowAddProject(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Add task */}
          {showAddTask && (
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>New Task</div>
              <input placeholder="Task title" className="input-dark" style={{ marginBottom: '0.625rem' }} value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addTask()} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <select className="input-dark" value={newTask.projectId} onChange={e => setNewTask(p => ({ ...p, projectId: e.target.value }))}>
                  {projects.length === 0 && <option value="">No projects yet</option>}
                  {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                </select>
                <select className="input-dark" value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as Priority }))}>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <select className="input-dark" value={newTask.status} onChange={e => setNewTask(p => ({ ...p, status: e.target.value as Status }))}>
                  <option value="today">Today</option>
                  <option value="active">Active</option>
                </select>
                <input type="number" placeholder="Est. minutes" className="input-dark" value={newTask.estimatedMins} onChange={e => setNewTask(p => ({ ...p, estimatedMins: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={addTask} className="btn-primary">Add Task</button>
                <button onClick={() => setShowAddTask(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' as const }}>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {(['today', 'active', 'completed', 'all'] as const).map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '5px', border: '1px solid',
                  borderColor: filter === s ? '#f2641955' : 'var(--color-border-subtle)',
                  background: filter === s ? '#f2641911' : 'transparent',
                  color: filter === s ? '#f26419' : 'var(--color-text-placeholder)',
                  fontSize: '0.65rem', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'capitalize' as const,
                }}>{s}</button>
              ))}
            </div>
            {projects.length > 0 && (
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button onClick={() => setProjectFilter('all')} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '5px', border: '1px solid',
                  borderColor: projectFilter === 'all' ? '#f2641955' : 'var(--color-border-subtle)',
                  background: projectFilter === 'all' ? '#f2641911' : 'transparent',
                  color: projectFilter === 'all' ? '#f26419' : 'var(--color-text-placeholder)',
                  fontSize: '0.65rem', cursor: 'pointer',
                }}>All</button>
                {projects.map(pr => (
                  <div key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <button onClick={() => setProjectFilter(pr.id)} style={{
                      padding: '0.3rem 0.75rem', borderRadius: '5px', border: '1px solid',
                      borderColor: projectFilter === pr.id ? `${pr.color}55` : 'var(--color-border-subtle)',
                      background: projectFilter === pr.id ? `${pr.color}11` : 'transparent',
                      color: projectFilter === pr.id ? pr.color : 'var(--color-text-placeholder)',
                      fontSize: '0.65rem', cursor: 'pointer',
                    }}>● {pr.name}</button>
                    <button onClick={() => deleteProject(pr.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0.2rem', lineHeight: 1 }} title="Delete project">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* No projects prompt */}
          {projects.length === 0 && (
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)' }}>Create a project to organize your tasks.</div>
              <button onClick={() => setShowAddProject(true)} className="btn-primary">+ Add Project</button>
            </div>
          )}

          {/* Task list */}
          {filtered.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginBottom: '1rem' }}>No tasks. Add one and get moving.</div>
              <button onClick={() => setShowAddTask(true)} className="btn-primary">Add a Task</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.map(task => {
                const project = projects.find(p => p.id === task.projectId)
                const elapsedSecs = getElapsedSecs(task)
                return (
                  <div key={task.id} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', opacity: task.status === 'completed' ? 0.5 : 1 }}>
                    <input type="checkbox" className="checkbox-custom" checked={task.status === 'completed'} onChange={() => completeTask(task.id)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.82rem', color: task.status === 'completed' ? 'var(--color-text-placeholder)' : 'var(--color-text-secondary)', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</span>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PRIORITY_COLORS[task.priority], flexShrink: 0 }} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {project && <span style={{ fontSize: '0.6rem', background: `${project.color}22`, color: project.color, border: `1px solid ${project.color}33`, borderRadius: '3px', padding: '0.1rem 0.35rem' }}>{project.name}</span>}
                        {elapsedSecs > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>{fmtTime(elapsedSecs)} logged</span>}
                        {task.estimatedMins > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>/ {task.estimatedMins}m est.</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.25rem', flexShrink: 0 }} title="Delete task">×</button>
                    {task.status !== 'completed' && (
                      <button onClick={() => toggleTimer(task.id)} style={{
                        padding: '0.3rem 0.625rem', borderRadius: '4px', border: '1px solid',
                        borderColor: task.isTracking ? '#f2641955' : 'var(--color-border-subtle)',
                        background: task.isTracking ? '#f2641911' : 'transparent',
                        color: task.isTracking ? '#f26419' : 'var(--color-text-placeholder)',
                        fontSize: '0.65rem', cursor: 'pointer', whiteSpace: 'nowrap' as const,
                      }}>
                        {task.isTracking ? '⏸ Stop' : '▷ Start'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

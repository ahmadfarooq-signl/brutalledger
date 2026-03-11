'use client'
import { useState, useEffect } from 'react'
import { fmtDateWithDay } from '@/lib/dateUtils'
import { supabase } from '@/lib/supabase'

type Priority = 'high' | 'normal' | 'low'
type Status = 'today' | 'active' | 'completed'
type Project = { id: string; name: string; color: string }
type Task = {
  id: string; title: string; projectId: string; priority: Priority; status: Status;
  estimatedMins: number; loggedSecs: number; isTracking: boolean; trackStart: number | null;
  dueDate: string; completedAt?: string
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

const TODAY = new Date().toISOString().split('T')[0]

const BLANK_TASK = { title: '', projectId: '', priority: 'normal' as Priority, estimatedMins: '', dueDate: TODAY }

export default function Tasks() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [newTask, setNewTask] = useState(BLANK_TASK)
  const [newProject, setNewProject] = useState({ name: '', color: '#f26419' })
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTask, setEditTask] = useState(BLANK_TASK)

  // Load data from Supabase on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: projData }, { data: taskData }] = await Promise.all([
        supabase.from('tasks_projects').select('*').order('rowid' as never),
        supabase.from('tasks').select('*').order('rowid' as never),
      ])
      setProjects((projData || []).map((p: { id: string; name: string; color: string }) => ({ id: p.id, name: p.name, color: p.color })))
      setTasks((taskData || []).map((t: {
        id: string; title: string; project_id: string; priority: Priority; status: Status;
        estimated_mins: number; logged_secs: number; due_date: string; completed_at?: string
      }) => ({
        id: t.id,
        title: t.title,
        projectId: t.project_id,
        priority: t.priority,
        status: t.status,
        estimatedMins: t.estimated_mins,
        loggedSecs: t.logged_secs,
        isTracking: false,
        trackStart: null,
        dueDate: t.due_date,
        completedAt: t.completed_at,
      })))
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!activeTaskId) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTaskId])

  const addTask = async () => {
    if (!newTask.title) return
    const projectId = newTask.projectId || (projects[0]?.id || '')
    const t: Task = {
      ...newTask,
      projectId,
      id: Date.now().toString(),
      status: 'today',
      estimatedMins: Number(newTask.estimatedMins) || 0,
      loggedSecs: 0,
      isTracking: false,
      trackStart: null,
    }
    setTasks(p => [t, ...p])
    setNewTask({ ...BLANK_TASK, projectId: projects[0]?.id || '' })
    setShowAddTask(false)
    await supabase.from('tasks').insert({
      id: t.id,
      title: t.title,
      project_id: t.projectId,
      priority: t.priority,
      status: t.status,
      estimated_mins: t.estimatedMins,
      logged_secs: 0,
      due_date: t.dueDate,
      completed_at: null,
    })
  }

  const addProject = async () => {
    if (!newProject.name) return
    const p: Project = { ...newProject, id: Date.now().toString() }
    setProjects(prev => [...prev, p])
    setNewProject({ name: '', color: '#f26419' })
    setShowAddProject(false)
    setNewTask(t => ({ ...t, projectId: p.id }))
    await supabase.from('tasks_projects').insert({ id: p.id, name: p.name, color: p.color })
  }

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id)
    setEditTask({
      title: task.title,
      projectId: task.projectId,
      priority: task.priority,
      estimatedMins: task.estimatedMins > 0 ? task.estimatedMins.toString() : '',
      dueDate: task.dueDate || TODAY,
    })
  }

  const saveEdit = async () => {
    if (!editTask.title || !editingTaskId) return
    setTasks(prev => prev.map(t => t.id === editingTaskId ? {
      ...t,
      title: editTask.title,
      projectId: editTask.projectId || t.projectId,
      priority: editTask.priority,
      estimatedMins: Number(editTask.estimatedMins) || 0,
      dueDate: editTask.dueDate,
    } : t))
    const task = tasks.find(t => t.id === editingTaskId)
    setEditingTaskId(null)
    await supabase.from('tasks').update({
      title: editTask.title,
      project_id: editTask.projectId || task?.projectId,
      priority: editTask.priority,
      estimated_mins: Number(editTask.estimatedMins) || 0,
      due_date: editTask.dueDate,
    }).eq('id', editingTaskId)
  }

  const toggleTimer = (id: string) => {
    const now = Date.now()
    let stoppedTaskId: string | null = null
    let stoppedLoggedSecs = 0

    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (t.isTracking) {
          const elapsed = Math.floor((now - (t.trackStart || now)) / 1000)
          stoppedTaskId = t.id
          stoppedLoggedSecs = t.loggedSecs + elapsed
          return { ...t, isTracking: false, trackStart: null, loggedSecs: stoppedLoggedSecs }
        }
        return { ...t, isTracking: true, trackStart: now }
      }
      if (t.isTracking) {
        const elapsed = Math.floor((now - (t.trackStart || now)) / 1000)
        stoppedTaskId = t.id
        stoppedLoggedSecs = t.loggedSecs + elapsed
        return { ...t, isTracking: false, trackStart: null, loggedSecs: stoppedLoggedSecs }
      }
      return t
    }))
    setActiveTaskId(id === activeTaskId ? null : id)

    // Save loggedSecs to Supabase when timer stops
    if (stoppedTaskId) {
      supabase.from('tasks').update({ logged_secs: stoppedLoggedSecs }).eq('id', stoppedTaskId)
    }
  }

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    if (activeTaskId === id) setActiveTaskId(null)
    if (editingTaskId === id) setEditingTaskId(null)
    await supabase.from('tasks').delete().eq('id', id)
  }

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setTasks(prev => prev.filter(t => t.projectId !== id))
    if (projectFilter === id) setProjectFilter('all')
    await supabase.from('tasks_projects').delete().eq('id', id)
    await supabase.from('tasks').delete().eq('project_id', id)
  }

  const toggleComplete = async (id: string) => {
    const now = Date.now()
    let updatedTask: Task | null = null
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      if (t.status === 'completed') {
        updatedTask = { ...t, status: 'active', completedAt: undefined }
        return updatedTask
      }
      const extra = t.isTracking ? Math.floor((now - (t.trackStart || now)) / 1000) : 0
      updatedTask = { ...t, status: 'completed', isTracking: false, trackStart: null, loggedSecs: t.loggedSecs + extra, completedAt: new Date().toISOString() }
      return updatedTask
    }))
    if (activeTaskId === id) setActiveTaskId(null)
    if (updatedTask) {
      const ut = updatedTask as Task
      await supabase.from('tasks').update({
        status: ut.status,
        logged_secs: ut.loggedSecs,
        completed_at: ut.completedAt || null,
      }).eq('id', id)
    }
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

  const inputRow = (obj: typeof BLANK_TASK, set: (fn: (p: typeof BLANK_TASK) => typeof BLANK_TASK) => void, onSubmit: () => void, onCancel: () => void, submitLabel: string) => (
    <>
      <input placeholder="Task title" className="input-dark" style={{ marginBottom: '0.625rem' }} value={obj.title}
        onChange={e => set(p => ({ ...p, title: e.target.value }))}
        onKeyDown={e => e.key === 'Enter' && onSubmit()} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <select className="input-dark" value={obj.projectId} onChange={e => set(p => ({ ...p, projectId: e.target.value }))}>
          {projects.length === 0 && <option value="">No projects</option>}
          {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
        </select>
        <select className="input-dark" value={obj.priority} onChange={e => set(p => ({ ...p, priority: e.target.value as Priority }))}>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <input type="number" placeholder="Est. minutes" className="input-dark" value={obj.estimatedMins}
          onChange={e => set(p => ({ ...p, estimatedMins: e.target.value }))} />
        <input type="date" className="input-dark" value={obj.dueDate}
          onChange={e => set(p => ({ ...p, dueDate: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={onSubmit} className="btn-primary">{submitLabel}</button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </>
  )

  if (loading) {
    return (
      <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
        <div className="page-overlay">
          <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 2rem', color: 'var(--color-text-placeholder)', fontSize: '0.85rem' }}>Loading...</div>
        </div>
      </div>
    )
  }

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
              <button onClick={() => { setShowAddTask(true); setEditingTaskId(null) }} className="btn-primary">+ Task</button>
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
              {inputRow(newTask, setNewTask as (fn: (p: typeof BLANK_TASK) => typeof BLANK_TASK) => void, addTask, () => setShowAddTask(false), 'Add Task')}
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' as const }}>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {(['all', 'today', 'active', 'completed'] as const).map(s => (
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
                }}>All Projects</button>
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
                const isEditing = editingTaskId === task.id
                const isCompleted = task.status === 'completed'

                if (isEditing) {
                  return (
                    <div key={task.id} className="card" style={{ padding: '1.25rem' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Edit Task</div>
                      {inputRow(editTask, setEditTask as (fn: (p: typeof BLANK_TASK) => typeof BLANK_TASK) => void, saveEdit, () => setEditingTaskId(null), 'Save')}
                    </div>
                  )
                }

                return (
                  <div key={task.id} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', opacity: isCompleted ? 0.65 : 1 }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={isCompleted}
                      onChange={() => toggleComplete(task.id)}
                      title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.82rem', color: isCompleted ? 'var(--color-text-placeholder)' : 'var(--color-text-secondary)', textDecoration: isCompleted ? 'line-through' : 'none' }}>{task.title}</span>
                        {!isCompleted && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PRIORITY_COLORS[task.priority], flexShrink: 0 }} title={task.priority} />}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' as const }}>
                        {project && <span style={{ fontSize: '0.6rem', background: `${project.color}22`, color: project.color, border: `1px solid ${project.color}33`, borderRadius: '3px', padding: '0.1rem 0.35rem' }}>{project.name}</span>}
                        {task.dueDate && !isCompleted && (
                          <span style={{ fontSize: '0.6rem', color: task.dueDate < TODAY ? '#c0504d' : 'var(--color-text-placeholder)' }}>
                            Due {fmtDateWithDay(task.dueDate)}
                          </span>
                        )}
                        {isCompleted && task.completedAt && (
                          <span style={{ fontSize: '0.6rem', color: '#5d9c70' }}>
                            Done {fmtDateWithDay(task.completedAt.split('T')[0])}
                          </span>
                        )}
                        {elapsedSecs > 0 && (
                          <span style={{ fontSize: '0.65rem', color: isCompleted ? '#5d9c70' : 'var(--color-text-placeholder)', fontWeight: isCompleted ? '600' : '400' }}>
                            {fmtTime(elapsedSecs)} logged
                          </span>
                        )}
                        {task.estimatedMins > 0 && !isCompleted && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>/ {task.estimatedMins}m est.</span>}
                      </div>
                    </div>
                    {!isCompleted && (
                      <button onClick={() => startEdit(task)} style={{ background: 'transparent', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '4px', flexShrink: 0, letterSpacing: '0.04em' }}>Edit</button>
                    )}
                    <button onClick={() => deleteTask(task.id)} style={{ background: '#8b3a3a15', border: '1px solid #8b3a3a33', color: '#c0504d', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.6rem', cursor: 'pointer', letterSpacing: '0.04em', flexShrink: 0 }}>Del</button>
                    {!isCompleted && (
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

'use client'
import { useState } from 'react'

type Pillar = 'contrarian' | 'story' | 'tactical' | 'personal'
type Post = { id: string; date: string; topic: string; pillar: Pillar; format: string; d7: number; d30: number; comments: number; cta: string }
type KBEntry = { id: string; category: string; title: string; body: string; date: string; source: 'manual' | 'post_log' }

const PILLAR_COLORS: Record<Pillar, string> = { contrarian: '#c0504d', story: '#f26419', tactical: '#5d9c70', personal: '#9b7fd4' }
const KB_CATEGORIES = ['Post Formulas', 'Hook Library', 'Viral Post Autopsies', 'Content Ideas', 'Pillar Definitions']
const BG = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2560&q=80'

export default function Content() {
  const [tab, setTab] = useState<'log' | 'kb'>('log')
  const [posts, setPosts] = useState<Post[]>([])
  const [kbEntries, setKbEntries] = useState<KBEntry[]>([])
  const [showAddPost, setShowAddPost] = useState(false)
  const [showAddKB, setShowAddKB] = useState(false)
  const [newPost, setNewPost] = useState({ date: new Date().toISOString().split('T')[0], topic: '', pillar: 'contrarian' as Pillar, format: 'text', d7: '', d30: '', comments: '', cta: '' })
  const [newKB, setNewKB] = useState({ category: KB_CATEGORIES[0], title: '', body: '' })
  const [kbFilter, setKbFilter] = useState('all')

  const addPost = () => {
    if (!newPost.topic) return
    const post: Post = { ...newPost, id: Date.now().toString(), d7: Number(newPost.d7), d30: Number(newPost.d30), comments: Number(newPost.comments) }
    setPosts(p => [post, ...p])

    // Auto-create KB entry under "Post Log" category
    const kbBody = [
      `Date: ${post.date}`,
      `Pillar: ${post.pillar}`,
      `Format: ${post.format}`,
      post.d7 ? `D7 Impressions: ${post.d7.toLocaleString()}` : '',
      post.d30 ? `D30 Impressions: ${post.d30.toLocaleString()}` : '',
      post.comments ? `Comments: ${post.comments}` : '',
      post.cta ? `CTA: ${post.cta}` : '',
    ].filter(Boolean).join('\n')

    const kbEntry: KBEntry = {
      id: `post_${post.id}`,
      category: 'Post Log',
      title: post.topic,
      body: kbBody,
      date: new Date().toLocaleDateString(),
      source: 'post_log',
    }
    setKbEntries(p => [kbEntry, ...p])
    setNewPost({ date: new Date().toISOString().split('T')[0], topic: '', pillar: 'contrarian', format: 'text', d7: '', d30: '', comments: '', cta: '' })
    setShowAddPost(false)
  }

  const addKB = () => {
    if (!newKB.title) return
    setKbEntries(p => [{ ...newKB, id: Date.now().toString(), date: new Date().toLocaleDateString(), source: 'manual' }, ...p])
    setNewKB({ category: KB_CATEGORIES[0], title: '', body: '' })
    setShowAddKB(false)
  }

  const deletePost = (id: string) => {
    setPosts(p => p.filter(post => post.id !== id))
    setKbEntries(p => p.filter(e => e.id !== `post_${id}`))
  }

  const deleteKBEntry = (id: string) => setKbEntries(p => p.filter(e => e.id !== id))

  const avgD7 = posts.length ? Math.round(posts.reduce((s, p) => s + p.d7, 0) / posts.length) : 0
  const avgD30 = posts.length ? Math.round(posts.reduce((s, p) => s + p.d30, 0) / posts.length) : 0
  const bestPost = posts.length ? posts.reduce((a, b) => a.d30 > b.d30 ? a : b) : null

  const exportKB = () => {
    const text = kbEntries.map(e => `## ${e.title}\nCategory: ${e.category}\nDate: ${e.date}\n\n${e.body}`).join('\n\n---\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'brutal-ledger-content-kb.txt'
    a.click()
  }

  const kbCategories = ['all', ...Array.from(new Set(kbEntries.map(e => e.category)))]
  const filteredKB = kbFilter === 'all' ? kbEntries : kbEntries.filter(e => e.category === kbFilter)

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.25rem', fontWeight: '700', color: 'var(--color-text)' }}>Content</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginTop: '0.25rem' }}>LinkedIn post log and knowledge base</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem' }}>
            {[{ key: 'log', label: 'Post Log' }, { key: 'kb', label: 'Knowledge Base' }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as 'log' | 'kb')} style={{
                padding: '0.375rem 0.875rem', borderRadius: '5px', border: '1px solid',
                borderColor: tab === t.key ? '#f2641955' : 'var(--color-border-subtle)',
                background: tab === t.key ? '#f2641911' : 'transparent',
                color: tab === t.key ? '#f26419' : 'var(--color-text-placeholder)',
                fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.08em',
              }}>{t.label}</button>
            ))}
          </div>

          {/* POST LOG TAB */}
          {tab === 'log' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Total Posts', value: posts.length.toString() },
                  { label: 'Avg D7 Impressions', value: avgD7.toLocaleString() },
                  { label: 'Avg D30 Impressions', value: avgD30.toLocaleString() },
                  { label: 'Best Post (D30)', value: bestPost ? bestPost.d30.toLocaleString() : 'None yet' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text)' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button onClick={() => setShowAddPost(true)} className="btn-primary">+ Log Post</button>
              </div>

              {showAddPost && (
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Log Post</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
                    <input type="date" className="input-dark" value={newPost.date} onChange={e => setNewPost(p => ({ ...p, date: e.target.value }))} />
                    <select className="input-dark" value={newPost.pillar} onChange={e => setNewPost(p => ({ ...p, pillar: e.target.value as Pillar }))}>
                      {(['contrarian', 'story', 'tactical', 'personal'] as Pillar[]).map(pl => <option key={pl} value={pl} style={{ textTransform: 'capitalize' }}>{pl}</option>)}
                    </select>
                    <select className="input-dark" value={newPost.format} onChange={e => setNewPost(p => ({ ...p, format: e.target.value }))}>
                      {['text', 'image', 'carousel', 'video'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <input type="number" placeholder="D7 Impressions" className="input-dark" value={newPost.d7} onChange={e => setNewPost(p => ({ ...p, d7: e.target.value }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
                    <input placeholder="Topic / headline" className="input-dark" value={newPost.topic} onChange={e => setNewPost(p => ({ ...p, topic: e.target.value }))} />
                    <input type="number" placeholder="D30 Impressions" className="input-dark" value={newPost.d30} onChange={e => setNewPost(p => ({ ...p, d30: e.target.value }))} />
                    <input type="number" placeholder="Comments" className="input-dark" value={newPost.comments} onChange={e => setNewPost(p => ({ ...p, comments: e.target.value }))} />
                    <input placeholder="CTA used" className="input-dark" value={newPost.cta} onChange={e => setNewPost(p => ({ ...p, cta: e.target.value }))} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', marginBottom: '0.75rem' }}>
                    This post will automatically appear in the Knowledge Base under "Post Log".
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={addPost} className="btn-primary">Save Post</button>
                    <button onClick={() => setShowAddPost(false)} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              )}

              {posts.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)' }}>No posts logged yet. Start publishing.</div>
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        {['Date', 'Topic', 'Pillar', 'Format', 'D7', 'D30', 'Cmts', 'CTA', ''].map(h => (
                          <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: 'left' as const, fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '500' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: i < posts.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                          <td style={{ padding: '0.625rem 0.875rem', fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>{p.date}</td>
                          <td style={{ padding: '0.625rem 0.875rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)', maxWidth: '200px' }}>{p.topic}</td>
                          <td style={{ padding: '0.625rem 0.875rem' }}>
                            <span style={{ fontSize: '0.6rem', background: `${PILLAR_COLORS[p.pillar]}22`, color: PILLAR_COLORS[p.pillar], border: `1px solid ${PILLAR_COLORS[p.pillar]}33`, borderRadius: '3px', padding: '0.15rem 0.4rem', textTransform: 'capitalize' as const }}>{p.pillar}</span>
                          </td>
                          <td style={{ padding: '0.625rem 0.875rem', fontSize: '0.72rem', color: 'var(--color-text-dim)', textTransform: 'capitalize' as const }}>{p.format}</td>
                          <td style={{ padding: '0.625rem 0.875rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{p.d7.toLocaleString()}</td>
                          <td style={{ padding: '0.625rem 0.875rem', fontSize: '0.78rem', color: p.d30 > 10000 ? '#5d9c70' : 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{p.d30.toLocaleString()}</td>
                          <td style={{ padding: '0.625rem 0.875rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{p.comments}</td>
                          <td style={{ padding: '0.625rem 0.875rem', fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>{p.cta || 'None'}</td>
                          <td style={{ padding: '0.625rem 0.5rem' }}>
                            <button onClick={() => deletePost(p.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.85rem', padding: '0.1rem 0.3rem', lineHeight: 1 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* KNOWLEDGE BASE TAB */}
          {tab === 'kb' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap' as const, gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' as const, alignItems: 'center' }}>
                  {kbCategories.map(cat => (
                    <button key={cat} onClick={() => setKbFilter(cat)} style={{
                      padding: '0.25rem 0.625rem', borderRadius: '5px', border: '1px solid',
                      borderColor: kbFilter === cat ? '#f2641955' : 'var(--color-border-subtle)',
                      background: kbFilter === cat ? '#f2641911' : 'transparent',
                      color: kbFilter === cat ? '#f26419' : 'var(--color-text-placeholder)',
                      fontSize: '0.65rem', cursor: 'pointer',
                    }}>{cat === 'all' ? `All (${kbEntries.length})` : cat}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {kbEntries.length > 0 && <button onClick={exportKB} className="btn-ghost">Export TXT</button>}
                  <button onClick={() => setShowAddKB(true)} className="btn-primary">+ New Entry</button>
                </div>
              </div>

              {showAddKB && (
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
                    <select className="input-dark" value={newKB.category} onChange={e => setNewKB(p => ({ ...p, category: e.target.value }))}>
                      {KB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input placeholder="Entry title" className="input-dark" value={newKB.title} onChange={e => setNewKB(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <textarea className="input-dark" style={{ resize: 'vertical', minHeight: '120px', marginBottom: '0.75rem' }} placeholder="Write here..." value={newKB.body} onChange={e => setNewKB(p => ({ ...p, body: e.target.value }))} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={addKB} className="btn-primary">Save Entry</button>
                    <button onClick={() => setShowAddKB(false)} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              )}

              {filteredKB.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginBottom: '1rem' }}>No knowledge base entries yet.</div>
                  <button onClick={() => setShowAddKB(true)} className="btn-primary">Create First Entry</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {filteredKB.map(entry => (
                    <div key={entry.id} className="card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className="badge badge-accent" style={{ fontSize: '0.55rem' }}>{entry.category}</span>
                          {entry.source === 'post_log' && <span className="badge badge-yellow" style={{ fontSize: '0.5rem' }}>Post Log</span>}
                          <span style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>{entry.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>{entry.date}</span>
                          <button onClick={() => deleteKBEntry(entry.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.2rem', lineHeight: 1 }}>×</button>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

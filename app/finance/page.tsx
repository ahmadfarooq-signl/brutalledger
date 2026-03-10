'use client'
import { useState, useEffect } from 'react'
import { fmtDateWithDay } from '@/lib/dateUtils'

type EntryType = 'salary' | 'signl' | 'gift' | 'transfer' | 'other'
type Income = { id: string; amount: number; type: EntryType; note: string; date: string }
type Expense = { id: string; amount: number; category: string; note: string; date: string }
type SavingsOp = { id: string; amount: number; dir: 'in' | 'out'; reason: string; date: string }
type CustomCat = { id: string; name: string; color: string }

const INCOME_TYPES: Record<EntryType, string> = { salary: 'Salary', signl: 'SIGNL', gift: 'Gift', transfer: 'Transfer', other: 'Other' }

const DEFAULT_EXP_CATS: CustomCat[] = [
  { id: 'tools', name: 'Tools', color: '#7a8fbc' },
  { id: 'food', name: 'Food', color: '#5d9c70' },
  { id: 'transport', name: 'Transport', color: '#c4a842' },
  { id: 'personal', name: 'Personal', color: '#9b7fd4' },
  { id: 'other', name: 'Other', color: '#8a8a94' },
]

const BG = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2560&q=80'
const PALETTE = ['#7a8fbc', '#5d9c70', '#c4a842', '#9b7fd4', '#8a8a94', '#c0504d', '#f26419', '#e07b5d']

export default function Finance() {
  const [tab, setTab] = useState<'expenses' | 'income' | 'savings'>('expenses')
  const [incomes, setIncomes] = useState<Income[]>(() => {
    try { return JSON.parse(localStorage.getItem('bl-finance-incomes') || '[]') } catch { return [] }
  })
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try { return JSON.parse(localStorage.getItem('bl-finance-expenses') || '[]') } catch { return [] }
  })
  const [savings, setSavings] = useState<SavingsOp[]>(() => {
    try { return JSON.parse(localStorage.getItem('bl-finance-savings') || '[]') } catch { return [] }
  })
  const [savingsTarget, setSavingsTarget] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bl-finance-target') || '20000') } catch { return 20000 }
  })
  const [expCategories, setExpCategories] = useState<CustomCat[]>(() => {
    try { return JSON.parse(localStorage.getItem('bl-finance-cats') || 'null') || DEFAULT_EXP_CATS } catch { return DEFAULT_EXP_CATS }
  })
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', color: '#f26419' })

  const [newExp, setNewExp] = useState({ amount: '', category: 'personal', note: '' })
  const [newInc, setNewInc] = useState({ amount: '', type: 'salary' as EntryType, note: '' })
  const [newSav, setNewSav] = useState({ amount: '', dir: 'in' as 'in' | 'out', reason: '' })

  useEffect(() => { localStorage.setItem('bl-finance-incomes', JSON.stringify(incomes)) }, [incomes])
  useEffect(() => { localStorage.setItem('bl-finance-expenses', JSON.stringify(expenses)) }, [expenses])
  useEffect(() => { localStorage.setItem('bl-finance-savings', JSON.stringify(savings)) }, [savings])
  useEffect(() => { localStorage.setItem('bl-finance-target', JSON.stringify(savingsTarget)) }, [savingsTarget])
  useEffect(() => { localStorage.setItem('bl-finance-cats', JSON.stringify(expCategories)) }, [expCategories])

  const today = new Date().toISOString().split('T')[0]
  const monthExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const monthIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const netPosition = monthIncome - monthExpenses
  const savingsBalance = savings.reduce((s, op) => op.dir === 'in' ? s + op.amount : s - op.amount, 0)
  const todayExp = expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0)

  const getCat = (id: string) => expCategories.find(c => c.id === id) || { name: id, color: '#8a8a94' }

  const addExpense = () => {
    if (!newExp.amount) return
    setExpenses(p => [{ id: Date.now().toString(), amount: Number(newExp.amount), category: newExp.category, note: newExp.note, date: today }, ...p])
    setNewExp({ amount: '', category: newExp.category, note: '' })
  }

  const addIncome = () => {
    if (!newInc.amount) return
    setIncomes(p => [{ id: Date.now().toString(), amount: Number(newInc.amount), type: newInc.type, note: newInc.note, date: today }, ...p])
    setNewInc({ amount: '', type: newInc.type, note: '' })
  }

  const addSavings = () => {
    if (!newSav.amount) return
    setSavings(p => [{ id: Date.now().toString(), amount: Number(newSav.amount), dir: newSav.dir, reason: newSav.reason, date: today }, ...p])
    setNewSav({ amount: '', dir: 'in', reason: '' })
  }

  const deleteExpense = (id: string) => setExpenses(p => p.filter(e => e.id !== id))
  const deleteIncome = (id: string) => setIncomes(p => p.filter(i => i.id !== id))
  const deleteSavings = (id: string) => setSavings(p => p.filter(s => s.id !== id))

  const addCategory = () => {
    if (!newCat.name.trim()) return
    setExpCategories(p => [...p, { id: Date.now().toString(), name: newCat.name.trim(), color: newCat.color }])
    setNewCat({ name: '', color: '#f26419' })
    setShowAddCat(false)
  }

  const catTotals = expCategories.map(cat => ({
    cat, total: expenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0)

  return (
    <div className="page-bg" style={{ backgroundImage: `url(${BG})` }}>
      <div className="page-overlay">
        <div className="page-enter" style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.25rem', fontWeight: '700', color: 'var(--color-text)' }}>Finance</h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)', marginTop: '0.25rem' }}>Personal financial tracker, PKR</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
            {[
              { label: 'Spent Today', value: `PKR ${todayExp.toLocaleString()}`, color: 'var(--color-text)' },
              { label: 'Monthly Expenses', value: `PKR ${monthExpenses.toLocaleString()}`, color: monthExpenses > 0 ? '#c0504d' : 'var(--color-text)' },
              { label: 'Monthly Income', value: `PKR ${monthIncome.toLocaleString()}`, color: 'var(--color-text)' },
              { label: 'Net Position', value: `PKR ${netPosition.toLocaleString()}`, color: netPosition >= 0 ? '#5d9c70' : '#c0504d' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: '700', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem' }}>
            {(['expenses', 'income', 'savings'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '0.375rem 0.875rem', borderRadius: '5px', border: '1px solid',
                borderColor: tab === t ? '#f2641955' : 'var(--color-border-subtle)',
                background: tab === t ? '#f2641911' : 'transparent',
                color: tab === t ? '#f26419' : 'var(--color-text-placeholder)',
                fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'capitalize' as const,
              }}>{t}</button>
            ))}
          </div>

          {/* EXPENSES TAB */}
          {tab === 'expenses' && (
            <>
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Add Expense</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '0.625rem', alignItems: 'end' }}>
                  <input type="number" placeholder="Amount PKR" className="input-dark" value={newExp.amount} onChange={e => setNewExp(p => ({ ...p, amount: e.target.value }))} />
                  <select className="input-dark" value={newExp.category} onChange={e => setNewExp(p => ({ ...p, category: e.target.value }))}>
                    {expCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  <input placeholder="Note (optional)" className="input-dark" value={newExp.note} onChange={e => setNewExp(p => ({ ...p, note: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addExpense()} />
                  <button onClick={addExpense} className="btn-primary">Add</button>
                </div>

                {/* Custom category */}
                <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                  {!showAddCat ? (
                    <button onClick={() => setShowAddCat(true)} style={{
                      background: 'transparent', border: '1px dashed var(--color-border)',
                      color: 'var(--color-text-placeholder)', borderRadius: '4px',
                      padding: '0.25rem 0.75rem', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.06em',
                    }}>+ Add custom category</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' as const }}>
                      <input placeholder="Category name" className="input-dark" style={{ flex: 1, minWidth: '120px' }} value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} />
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {PALETTE.map(c => (
                          <button key={c} onClick={() => setNewCat(p => ({ ...p, color: c }))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: newCat.color === c ? '2px solid var(--color-text)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
                        ))}
                      </div>
                      <button onClick={addCategory} className="btn-primary" style={{ padding: '0.375rem 0.75rem' }}>Add</button>
                      <button onClick={() => setShowAddCat(false)} className="btn-ghost" style={{ padding: '0.375rem 0.75rem' }}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Today's Expenses */}
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Today's Expenses</div>
                  <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '0.9rem', color: 'var(--color-text)' }}>PKR {todayExp.toLocaleString()}</div>
                </div>
                {expenses.filter(e => e.date === today).length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)' }}>Nothing logged today.</div>
                ) : (
                  expenses.filter(e => e.date === today).map(e => {
                    const cat = getCat(e.category)
                    return (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.65rem', background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}33`, borderRadius: '3px', padding: '0.15rem 0.4rem' }}>{cat.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{e.note || 'No note'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>PKR {e.amount.toLocaleString()}</span>
                          <button onClick={() => deleteExpense(e.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.2rem', lineHeight: 1 }}>×</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {catTotals.length > 0 && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Monthly by Category</div>
                  {catTotals.map(({ cat, total }) => (
                    <div key={cat.id} style={{ marginBottom: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.72rem', color: cat.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>PKR {total.toLocaleString()}</span>
                      </div>
                      <div style={{ height: '3px', background: 'var(--color-border-subtle)', borderRadius: '2px' }}>
                        <div style={{ height: '100%', width: `${(total / monthExpenses) * 100}%`, background: cat.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* INCOME TAB */}
          {tab === 'income' && (
            <>
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Log Income</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '0.625rem', alignItems: 'end' }}>
                  <input type="number" placeholder="Amount PKR" className="input-dark" value={newInc.amount} onChange={e => setNewInc(p => ({ ...p, amount: e.target.value }))} />
                  <select className="input-dark" value={newInc.type} onChange={e => setNewInc(p => ({ ...p, type: e.target.value as EntryType }))}>
                    {Object.entries(INCOME_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input placeholder="Source / note" className="input-dark" value={newInc.note} onChange={e => setNewInc(p => ({ ...p, note: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addIncome()} />
                  <button onClick={addIncome} className="btn-primary">Add</button>
                </div>
              </div>
              {incomes.length === 0 ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)' }}>No income logged yet.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {incomes.map(i => (
                    <div key={i.id} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span className="badge badge-green">{INCOME_TYPES[i.type]}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{i.note}</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)' }}>{fmtDateWithDay(i.date)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', color: '#5d9c70' }}>+PKR {i.amount.toLocaleString()}</div>
                        <button onClick={() => deleteIncome(i.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.2rem', lineHeight: 1 }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* SAVINGS TAB */}
          {tab === 'savings' && (
            <>
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Savings Balance</div>
                <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', fontWeight: '700', color: savingsBalance >= 0 ? '#5d9c70' : '#c0504d', marginBottom: '0.75rem' }}>PKR {savingsBalance.toLocaleString()}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>Monthly target:</span>
                  <input type="number" className="input-dark" style={{ width: '120px', textAlign: 'center' }} value={savingsTarget} onChange={e => setSavingsTarget(Number(e.target.value))} />
                </div>
                <div style={{ height: '4px', background: 'var(--color-border-subtle)', borderRadius: '2px', maxWidth: '300px', margin: '0 auto' }}>
                  <div style={{ height: '100%', width: `${Math.min((savingsBalance / savingsTarget) * 100, 100)}%`, background: '#5d9c70', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', marginTop: '0.375rem' }}>{Math.min(Math.round((savingsBalance / savingsTarget) * 100), 100)}% of monthly target</div>
              </div>

              <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Add Transaction</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 2fr auto', gap: '0.625rem', alignItems: 'end' }}>
                  <select className="input-dark" value={newSav.dir} onChange={e => setNewSav(p => ({ ...p, dir: e.target.value as 'in' | 'out' }))}>
                    <option value="in">Add to savings</option>
                    <option value="out">Withdraw</option>
                  </select>
                  <input type="number" placeholder="Amount PKR" className="input-dark" value={newSav.amount} onChange={e => setNewSav(p => ({ ...p, amount: e.target.value }))} />
                  <input placeholder="Reason" className="input-dark" value={newSav.reason} onChange={e => setNewSav(p => ({ ...p, reason: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addSavings()} />
                  <button onClick={addSavings} className="btn-primary">Save</button>
                </div>
              </div>

              {savings.length === 0 ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-placeholder)' }}>No transactions yet.</div>
                </div>
              ) : (
                savings.map(op => (
                  <div key={op.id} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{op.reason || (op.dir === 'in' ? 'Savings deposit' : 'Withdrawal')}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-placeholder)', marginTop: '0.2rem' }}>{fmtDateWithDay(op.date)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', color: op.dir === 'in' ? '#5d9c70' : '#c0504d' }}>
                        {op.dir === 'in' ? '+' : '-'}PKR {op.amount.toLocaleString()}
                      </div>
                      <button onClick={() => deleteSavings(op.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.2rem', lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

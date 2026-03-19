import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  GameState,
  CashFlowRow,
  INCOME_COLS,
  EXPENSE_COLS,
  IncomeKey,
  ExpenseKey,
  createInitialGameState,
  sumIncome,
  sumExpense,
  calcCashBalances,
} from './types'

const STORAGE_KEY = 'mg-game-state'

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return createInitialGameState()
}

function saveState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ───────────────────────────────────────────────
// Editable number cell
// ───────────────────────────────────────────────
function NumCell({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (v: number) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  const start = () => {
    setRaw(value === 0 ? '' : String(value))
    setEditing(true)
  }

  const commit = () => {
    const n = parseFloat(raw)
    onChange(isNaN(n) ? 0 : n)
    setEditing(false)
  }

  return (
    <input
      className={`cell-input ${className ?? ''}`}
      type="number"
      value={editing ? raw : value === 0 ? '' : value}
      onFocus={start}
      onChange={e => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          commit()
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      placeholder=""
      min={0}
    />
  )
}

// ───────────────────────────────────────────────
// Main App
// ───────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<GameState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const cashBalances = useMemo(
    () => calcCashBalances(state.rows, state.initialCash),
    [state.rows, state.initialCash]
  )

  const lastBalance = cashBalances[cashBalances.length - 1] ?? state.initialCash

  // ── row cell updater ──
  const updateIncome = useCallback(
    (rowId: number, key: IncomeKey, val: number) => {
      setState(s => ({
        ...s,
        rows: s.rows.map(r =>
          r.id === rowId ? { ...r, income: { ...r.income, [key]: val } } : r
        ),
      }))
    },
    []
  )

  const updateExpense = useCallback(
    (rowId: number, key: ExpenseKey, val: number) => {
      setState(s => ({
        ...s,
        rows: s.rows.map(r =>
          r.id === rowId ? { ...r, expense: { ...r.expense, [key]: val } } : r
        ),
      }))
    },
    []
  )

  const updateMemo = useCallback((rowId: number, memo: string) => {
    setState(s => ({
      ...s,
      rows: s.rows.map(r => (r.id === rowId ? { ...r, memo } : r)),
    }))
  }, [])

  // ── totals ──
  const incomeTotals = useMemo(() => {
    const totals: Record<IncomeKey, number> = {} as Record<IncomeKey, number>
    for (const col of INCOME_COLS) totals[col.key] = 0
    for (const row of state.rows) {
      for (const col of INCOME_COLS) {
        totals[col.key] += row.income[col.key]
      }
    }
    return totals
  }, [state.rows])

  const expenseTotals = useMemo(() => {
    const totals: Record<ExpenseKey, number> = {} as Record<ExpenseKey, number>
    for (const col of EXPENSE_COLS) totals[col.key] = 0
    for (const row of state.rows) {
      for (const col of EXPENSE_COLS) {
        totals[col.key] += row.expense[col.key]
      }
    }
    return totals
  }, [state.rows])

  const grandIncomeTotal = useMemo(
    () => Object.values(incomeTotals).reduce((a, b) => a + b, 0),
    [incomeTotals]
  )
  const grandExpenseTotal = useMemo(
    () => Object.values(expenseTotals).reduce((a, b) => a + b, 0),
    [expenseTotals]
  )

  // ── inventory ──
  const invTotal = useMemo(() => {
    const { materials, wip, products } = state.inventory
    return (
      materials.count * materials.unitPrice +
      wip.count * wip.unitPrice +
      products.count * products.unitPrice
    )
  }, [state.inventory])

  // ── period expenses ──
  const calcPeTotal = (pe: { regularEmployees: number; partTimeEmployees: number }) =>
    pe.regularEmployees * 22 + pe.partTimeEmployees * 11

  // ── cash account ──
  const caTotal = useMemo(() => {
    const adj = state.cashAccountAdjustments
    return adj.materialDeficiency + adj.defectiveProducts + adj.merchandise + adj.damages
  }, [state.cashAccountAdjustments])

  const reset = () => {
    if (confirm('ゲームをリセットしますか？全データが消えます。')) {
      const fresh = createInitialGameState()
      setState(fresh)
    }
  }

  const fmt = (n: number) =>
    n === 0 ? '' : n.toLocaleString('ja-JP')

  const fmtBalance = (n: number) =>
    n === 0 ? '0' : n.toLocaleString('ja-JP')

  return (
    <div className="app">
      {/* ===== TOP BAR ===== */}
      <div className="top-bar">
        <div>
          <div className="top-bar h1" style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 2 }}>
            MGII &nbsp; 第１表Ｓ 資金繰表Ａ
          </div>
          <div className="subtitle">現金出納帳 兼 仕訳帳</div>
        </div>
        <div className="top-bar-actions">
          <button className="btn btn-success" onClick={() => window.print()}>
            印刷
          </button>
          <button className="btn btn-danger" onClick={reset}>
            リセット
          </button>
        </div>
      </div>

      <div className="main-panel">

        {/* ===== COMPANY INFO ===== */}
        <div className="info-row">
          <div className="info-group">
            <label>① 日付</label>
            <input
              type="date"
              value={state.company.date}
              onChange={e =>
                setState(s => ({ ...s, company: { ...s.company, date: e.target.value } }))
              }
            />
          </div>
          <div className="info-group">
            <label>期</label>
            <input
              type="number"
              value={state.company.period}
              min={1}
              onChange={e =>
                setState(s => ({
                  ...s,
                  company: { ...s.company, period: Number(e.target.value) },
                }))
              }
            />
          </div>
          <div className="info-group">
            <label>社名</label>
            <input
              type="text"
              value={state.company.companyName}
              style={{ width: 120 }}
              onChange={e =>
                setState(s => ({
                  ...s,
                  company: { ...s.company, companyName: e.target.value },
                }))
              }
            />
          </div>
          <div className="info-group">
            <label>社長名</label>
            <input
              type="text"
              value={state.company.presidentName}
              style={{ width: 120 }}
              onChange={e =>
                setState(s => ({
                  ...s,
                  company: { ...s.company, presidentName: e.target.value },
                }))
              }
            />
          </div>
          <div className="info-group">
            <label>期首現金</label>
            <input
              type="number"
              value={state.initialCash}
              onChange={e =>
                setState(s => ({ ...s, initialCash: Number(e.target.value) }))
              }
              style={{ width: 80, textAlign: 'right' }}
            />
          </div>
        </div>

        {/* ===== LOAN CONDITIONS ===== */}
        <div className="section-card">
          <div className="section-title">
            <span className="section-num">②</span>
            借金の条件
          </div>
          <div className="section-body">
            <div className="loan-grid">
              <div className="loan-field">
                <label>借入1回（万円）</label>
                <input
                  type="number"
                  value={state.loanConditions.borrowingPerTime}
                  onChange={e =>
                    setState(s => ({
                      ...s,
                      loanConditions: { ...s.loanConditions, borrowingPerTime: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div className="loan-field">
                <label>借入人数</label>
                <input
                  type="number"
                  value={state.loanConditions.borrowingPeople}
                  onChange={e =>
                    setState(s => ({
                      ...s,
                      loanConditions: { ...s.loanConditions, borrowingPeople: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div className="loan-field">
                <label>金利人数</label>
                <input
                  type="number"
                  value={state.loanConditions.interestPeople}
                  onChange={e =>
                    setState(s => ({
                      ...s,
                      loanConditions: { ...s.loanConditions, interestPeople: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div className="loan-field">
                <label>金利期数</label>
                <input
                  type="number"
                  value={state.loanConditions.interestPeriods}
                  onChange={e =>
                    setState(s => ({
                      ...s,
                      loanConditions: { ...s.loanConditions, interestPeriods: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div className="loan-field">
                <label>担保高（→への場合）</label>
                <input
                  type="number"
                  value={state.loanConditions.collateralHigh}
                  onChange={e =>
                    setState(s => ({
                      ...s,
                      loanConditions: { ...s.loanConditions, collateralHigh: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div className="loan-field">
                <label>担保低（→への場合）</label>
                <input
                  type="number"
                  value={state.loanConditions.collateralLow}
                  onChange={e =>
                    setState(s => ({
                      ...s,
                      loanConditions: { ...s.loanConditions, collateralLow: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div className="loan-field" style={{ alignSelf: 'center' }}>
                <label style={{ color: '#c62828' }}>短期金利（自動計算）</label>
                <strong style={{ fontSize: 14, color: '#c62828' }}>
                  {state.loanConditions.borrowingPerTime} ×{' '}
                  {state.loanConditions.interestPeople} ÷ {state.loanConditions.interestPeriods} ={' '}
                  {(
                    (state.loanConditions.borrowingPerTime *
                      state.loanConditions.interestPeople) /
                    state.loanConditions.interestPeriods
                  ).toFixed(1)}{' '}
                  万円/期
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ===== SUMMARY ===== */}
        <div className="summary-box">
          <div className="summary-item">
            <span className="summary-label">期末現金残高</span>
            <span className={`summary-value ${lastBalance < 0 ? 'negative' : ''}`}>
              {fmtBalance(lastBalance)} 万円
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">累計入金</span>
            <span className="summary-value" style={{ color: '#1565c0' }}>
              {fmtBalance(state.initialCash + grandIncomeTotal)} 万円
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">累計出金</span>
            <span className="summary-value" style={{ color: '#c62828' }}>
              {fmtBalance(grandExpenseTotal)} 万円
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">棚卸資産合計</span>
            <span className="summary-value" style={{ color: '#2e7d32' }}>
              {fmtBalance(invTotal)} 万円
            </span>
          </div>
        </div>

        {/* ===== CASH FLOW TABLE ===== */}
        <div className="section-card">
          <div className="section-title">
            入金（収入）・出金（支出）　資金繰表
          </div>
          <div className="table-wrap">
            <table className="cf-table">
              <thead>
                {/* Group row */}
                <tr>
                  <th rowSpan={2} style={{ background: '#424242', color: 'white', minWidth: 28, textAlign: 'center', padding: '2px 4px', fontSize: 10 }}>
                    行
                  </th>
                  <th className="th-group income" colSpan={INCOME_COLS.length}>
                    入 金（収 入）
                  </th>
                  <th className="th-group expense" colSpan={EXPENSE_COLS.length}>
                    出 金（支 出）
                  </th>
                  <th className="th-group balance" rowSpan={2} style={{ minWidth: 70, padding: '4px 8px', fontSize: 11 }}>
                    現金<br />残高
                  </th>
                  <th rowSpan={2} style={{ background: '#37474f', color: 'white', minWidth: 80, padding: '4px 8px', fontSize: 10, textAlign: 'center' }}>
                    メモ
                  </th>
                </tr>
                {/* Column kana/label row */}
                <tr>
                  {INCOME_COLS.map(col => (
                    <th key={col.key} className="th-col income">
                      <span className="kana">{col.kana}</span>
                      <span className="col-label">{col.label}</span>
                    </th>
                  ))}
                  {EXPENSE_COLS.map(col => (
                    <th key={col.key} className="th-col expense">
                      <span className="kana">{col.kana}</span>
                      <span className="col-label">{col.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row, idx) => {
                  const balance = cashBalances[idx]
                  const rowIncome = sumIncome(row.income)
                  const rowExpense = sumExpense(row.expense)
                  const hasActivity = rowIncome > 0 || rowExpense > 0
                  return (
                    <tr key={row.id} style={{ height: 'var(--cell-height)' }}>
                      <td className="td-rownum">{row.id}</td>
                      {INCOME_COLS.map(col => (
                        <td
                          key={col.key}
                          className={`td-income ${row.income[col.key] > 0 ? 'has-value' : ''}`}
                        >
                          <NumCell
                            value={row.income[col.key]}
                            onChange={v => updateIncome(row.id, col.key, v)}
                          />
                        </td>
                      ))}
                      {EXPENSE_COLS.map(col => (
                        <td
                          key={col.key}
                          className={`td-expense ${row.expense[col.key] > 0 ? 'has-value' : ''}`}
                        >
                          <NumCell
                            value={row.expense[col.key]}
                            onChange={v => updateExpense(row.id, col.key, v)}
                          />
                        </td>
                      ))}
                      <td
                        className={`td-balance ${balance < 0 ? 'negative' : 'positive'}`}
                        style={{ fontSize: hasActivity ? 12 : 10 }}
                      >
                        {fmtBalance(balance)}
                      </td>
                      <td className="td-memo">
                        <input
                          className="cell-memo"
                          type="text"
                          value={row.memo}
                          onChange={e => updateMemo(row.id, e.target.value)}
                          placeholder=""
                        />
                      </td>
                    </tr>
                  )
                })}

                {/* ── Total row ── */}
                <tr className="tr-total">
                  <td className="td-total-label">合計</td>
                  {INCOME_COLS.map(col => (
                    <td key={col.key} className="td-total-value income">
                      {fmt(incomeTotals[col.key])}
                    </td>
                  ))}
                  {EXPENSE_COLS.map(col => (
                    <td key={col.key} className="td-total-value expense">
                      {fmt(expenseTotals[col.key])}
                    </td>
                  ))}
                  <td
                    className={`td-balance ${lastBalance < 0 ? 'negative' : 'positive'}`}
                    style={{ fontWeight: 'bold' }}
                  >
                    {fmtBalance(lastBalance)}
                  </td>
                  <td />
                </tr>

                {/* ── Grand total row ── */}
                <tr className="tr-total" style={{ background: '#e8eaf6' }}>
                  <td className="td-total-label" style={{ background: '#3949ab', color: 'white', fontSize: 10 }}>
                    総計
                  </td>
                  <td
                    className="td-total-value income"
                    colSpan={INCOME_COLS.length}
                    style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}
                  >
                    入金合計: {fmtBalance(grandIncomeTotal)} 万円
                  </td>
                  <td
                    className="td-total-value expense"
                    colSpan={EXPENSE_COLS.length}
                    style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}
                  >
                    出金合計: {fmtBalance(grandExpenseTotal)} 万円
                  </td>
                  <td className={`td-balance ${lastBalance < 0 ? 'negative' : 'positive'}`}>
                    {fmtBalance(lastBalance)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== BOTTOM SECTIONS ===== */}
        <div className="bottom-grid">

          {/* ── ⑥⑮ Inventory ── */}
          <div className="section-card">
            <div className="section-title">
              <span className="section-num">⑥</span>
              棚 卸 し（在庫管理）
              <span className="section-num" style={{ marginLeft: 'auto' }}>⑮</span>
            </div>
            <div className="section-body" style={{ padding: 8 }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>品目</th>
                    <th>個数</th>
                    <th>単価（万円）</th>
                    <th>金額（万円）</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      { key: 'materials' as const, label: '材 料' },
                      { key: 'wip' as const,       label: '仕掛品' },
                      { key: 'products' as const,  label: '製 品' },
                    ] as const
                  ).map(item => {
                    const inv = state.inventory[item.key]
                    return (
                      <tr key={item.key}>
                        <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{item.label}</td>
                        <td>
                          <input
                            type="number"
                            value={inv.count}
                            min={0}
                            onChange={e =>
                              setState(s => ({
                                ...s,
                                inventory: {
                                  ...s.inventory,
                                  [item.key]: { ...inv, count: Number(e.target.value) },
                                },
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={inv.unitPrice}
                            min={0}
                            onChange={e =>
                              setState(s => ({
                                ...s,
                                inventory: {
                                  ...s.inventory,
                                  [item.key]: { ...inv, unitPrice: Number(e.target.value) },
                                },
                              }))
                            }
                          />
                        </td>
                        <td className="inv-value">{fmtBalance(inv.count * inv.unitPrice)}</td>
                      </tr>
                    )
                  })}
                  <tr style={{ background: '#e8f5e9' }}>
                    <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: 8 }}>
                      棚卸資産合計
                    </td>
                    <td className="inv-value" style={{ fontSize: 13, fontWeight: 'bold' }}>
                      {fmtBalance(invTotal)} 万円
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── ⑦ Period Expenses ── */}
          <div className="section-card">
            <div className="section-title">
              <span className="section-num">⑦</span>
              期次経費（福利・人件費）
            </div>
            <div className="section-body" style={{ padding: 8 }}>
              <table className="pe-table">
                <thead>
                  <tr>
                    <th>期</th>
                    <th>正規（人）</th>
                    <th>パート（人）</th>
                    <th>合計（万円）</th>
                  </tr>
                </thead>
                <tbody>
                  {state.periodExpenses.map((pe, idx) => (
                    <tr key={pe.period}>
                      <td style={{ fontWeight: 'bold' }}>第{pe.period}期</td>
                      <td>
                        <input
                          type="number"
                          value={pe.regularEmployees}
                          min={0}
                          onChange={e =>
                            setState(s => ({
                              ...s,
                              periodExpenses: s.periodExpenses.map((p, i) =>
                                i === idx ? { ...p, regularEmployees: Number(e.target.value) } : p
                              ),
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={pe.partTimeEmployees}
                          min={0}
                          onChange={e =>
                            setState(s => ({
                              ...s,
                              periodExpenses: s.periodExpenses.map((p, i) =>
                                i === idx ? { ...p, partTimeEmployees: Number(e.target.value) } : p
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="pe-total">{calcPeTotal(pe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 10, color: '#777', marginTop: 6 }}>
                ※ 正規1人=22万円 / パート0.5人=11万円
              </p>
            </div>
          </div>

          {/* ── ⑯ Cash Account ── */}
          <div className="section-card">
            <div className="section-title">
              <span className="section-num">⑯</span>
              現金勘定（調整額）
            </div>
            <div className="section-body" style={{ padding: 8 }}>
              <table className="ca-table">
                <tbody>
                  {(
                    [
                      { key: 'materialDeficiency' as const, label: '材料欠（不足）' },
                      { key: 'defectiveProducts' as const,  label: '仕損品（製造ミス）' },
                      { key: 'merchandise' as const,        label: '商品（在庫損失）' },
                      { key: 'damages' as const,            label: '損害賠償' },
                    ] as const
                  ).map(item => (
                    <tr key={item.key}>
                      <td>{item.label}</td>
                      <td>
                        <input
                          type="number"
                          value={state.cashAccountAdjustments[item.key]}
                          onChange={e =>
                            setState(s => ({
                              ...s,
                              cashAccountAdjustments: {
                                ...s.cashAccountAdjustments,
                                [item.key]: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </td>
                      <td style={{ fontSize: 10, color: '#777' }}>万円</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#e3f2fd' }}>
                    <td style={{ fontWeight: 'bold' }}>合計調整額</td>
                    <td className="ca-total">{fmtBalance(caTotal)}</td>
                    <td style={{ fontSize: 10 }}>万円</td>
                  </tr>
                  <tr style={{ background: '#e8f5e9' }}>
                    <td style={{ fontWeight: 'bold' }}>調整後現金残高</td>
                    <td className="ca-total" style={{ color: lastBalance - caTotal < 0 ? '#c62828' : '#1565c0' }}>
                      {fmtBalance(lastBalance - caTotal)}
                    </td>
                    <td style={{ fontSize: 10 }}>万円</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── ⑭⑰ Accident & Mistake ── */}
          <div className="section-card">
            <div className="section-title">
              <span className="section-num">⑭</span>
              事故・災害メモ
              <span className="section-num" style={{ marginLeft: 'auto' }}>⑰</span>
              ミス発覚
            </div>
            <div className="section-body" style={{ padding: 8 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>
                  事故・災害の内容
                </label>
                <textarea
                  className="accident-textarea"
                  value={state.accidentMemo}
                  onChange={e => setState(s => ({ ...s, accidentMemo: e.target.value }))}
                  placeholder="事故・災害の内容を記入してください..."
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: 11, color: '#555' }}>ミス発覚件数:</label>
                <input
                  className="mistake-input"
                  type="number"
                  value={state.mistakeCount}
                  min={0}
                  onChange={e => setState(s => ({ ...s, mistakeCount: Number(e.target.value) }))}
                />
                <span style={{ fontSize: 11, color: '#555' }}>件</span>
              </div>
              <div className="mistake-result">
                {state.mistakeCount === 0
                  ? '✓ ミスなし → 決算へ！'
                  : `⚠ ${state.mistakeCount}件のミスがあります。確認してください。`}
              </div>
            </div>
          </div>
        </div>

        {/* ===== RULES REMINDER ===== */}
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          background: '#fff8e1',
          border: '1px solid #ffe082',
          borderRadius: 4,
          fontSize: 11,
          color: '#5d4037',
        }}>
          <strong>ルール reminder:</strong>
          第1ルール(期首にすること①〜⑦): 期首の処理を行う。
          第2ルール(期末にすること⑧〜⑰): 期末の処理を行う。
          第1ルールか第2ルールか、いずれか多い方をとることができる。両方はダメ。
        </div>

      </div>
    </div>
  )
}

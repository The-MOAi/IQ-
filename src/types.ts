export interface CompanyInfo {
  date: string
  period: number
  companyName: string
  presidentName: string
}

export interface LoanConditions {
  borrowingPerTime: number   // 借入1回の金額
  borrowingPeople: number    // 借入人数
  interestPeople: number     // 金利人数
  interestPeriods: number    // 金利期数
  collateralHigh: number     // 担保高（への場合）
  collateralLow: number      // 担保低（への場合）
}

export const INCOME_COLS = [
  { key: 'sales',          label: '売上',       kana: 'ア' },
  { key: 'machineSales',   label: '機械売却',   kana: 'イ' },
  { key: 'otherIncome',    label: '営業外収益', kana: 'ウ' },
  { key: 'materialSales',  label: '材料売却',   kana: 'エ' },
  { key: 'insurance',      label: '保険収入',   kana: 'オ' },
  { key: 'shortTermLoan',  label: '短期借入',   kana: 'カ' },
  { key: 'longTermLoan',   label: '長期借入',   kana: 'キ' },
  { key: 'capital',        label: '資本金',     kana: 'ク' },
] as const

export const EXPENSE_COLS = [
  { key: 'lending',             label: '貸付金',     kana: 'コ' },
  { key: 'machinery',           label: '機械',       kana: 'サ' },
  { key: 'investment',          label: '投付金',     kana: 'シ' },
  { key: 'completion',          label: '完成費',     kana: 'ス' },
  { key: 'labor',               label: '労務費',     kana: 'セ' },
  { key: 'manufacturing',       label: '製造費',     kana: 'ソ' },
  { key: 'hqPersonnel',         label: '本社人件費', kana: 'タ' },
  { key: 'nonOperating',        label: '営業外費用', kana: 'チ' },
  { key: 'advertising',         label: '広告費',     kana: 'ツ' },
  { key: 'rdEducation',         label: '教育研究費', kana: 'テ' },
  { key: 'hqCosts',             label: '本社費',     kana: 'ト' },
  { key: 'materialPurchase',    label: '材料仕入',   kana: 'ナ' },
  { key: 'productPurchase',     label: '商品仕入',   kana: 'ニ' },
  { key: 'specialLoss',         label: '特別損失',   kana: 'ヌ' },
  { key: 'shortTermRepayment',  label: '短期返済',   kana: 'ネ' },
  { key: 'longTermRepayment',   label: '長期返済',   kana: 'ノ' },
  { key: 'dividend',            label: '配当',       kana: 'ハ' },
  { key: 'tax',                 label: '納税',       kana: 'ヒ' },
] as const

export type IncomeKey = typeof INCOME_COLS[number]['key']
export type ExpenseKey = typeof EXPENSE_COLS[number]['key']

export type IncomeRow = Record<IncomeKey, number>
export type ExpenseRow = Record<ExpenseKey, number>

export interface CashFlowRow {
  id: number
  income: IncomeRow
  expense: ExpenseRow
  memo: string
}

export interface InventoryItem {
  count: number
  unitPrice: number
}

export interface Inventory {
  materials: InventoryItem
  wip: InventoryItem
  products: InventoryItem
}

export interface PeriodExpense {
  period: number
  regularEmployees: number
  partTimeEmployees: number
}

export interface LoanRepayment {
  row: number
  amount: number
  remainingPeriods: number
}

export interface GameState {
  company: CompanyInfo
  loanConditions: LoanConditions
  initialCash: number
  rows: CashFlowRow[]
  inventory: Inventory
  periodExpenses: PeriodExpense[]
  accidentMemo: string
  mistakeCount: number
  cashAccountAdjustments: {
    materialDeficiency: number
    defectiveProducts: number
    merchandise: number
    damages: number
  }
}

export function createEmptyIncomeRow(): IncomeRow {
  return {
    sales: 0,
    machineSales: 0,
    otherIncome: 0,
    materialSales: 0,
    insurance: 0,
    shortTermLoan: 0,
    longTermLoan: 0,
    capital: 0,
  }
}

export function createEmptyExpenseRow(): ExpenseRow {
  return {
    lending: 0,
    machinery: 0,
    investment: 0,
    completion: 0,
    labor: 0,
    manufacturing: 0,
    hqPersonnel: 0,
    nonOperating: 0,
    advertising: 0,
    rdEducation: 0,
    hqCosts: 0,
    materialPurchase: 0,
    productPurchase: 0,
    specialLoss: 0,
    shortTermRepayment: 0,
    longTermRepayment: 0,
    dividend: 0,
    tax: 0,
  }
}

export function createEmptyRow(id: number): CashFlowRow {
  return {
    id,
    income: createEmptyIncomeRow(),
    expense: createEmptyExpenseRow(),
    memo: '',
  }
}

export function createInitialGameState(): GameState {
  const rows: CashFlowRow[] = Array.from({ length: 25 }, (_, i) => createEmptyRow(i + 1))
  const periodExpenses: PeriodExpense[] = Array.from({ length: 5 }, (_, i) => ({
    period: i + 1,
    regularEmployees: 22 + i * 2,
    partTimeEmployees: 0,
  }))

  return {
    company: {
      date: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      period: 1,
      companyName: '',
      presidentName: '',
    },
    loanConditions: {
      borrowingPerTime: 10,
      borrowingPeople: 3,
      interestPeople: 3,
      interestPeriods: 4,
      collateralHigh: 20,
      collateralLow: 0,
    },
    initialCash: 0,
    rows,
    inventory: {
      materials: { count: 0, unitPrice: 10 },
      wip: { count: 0, unitPrice: 0 },
      products: { count: 0, unitPrice: 0 },
    },
    periodExpenses,
    accidentMemo: '',
    mistakeCount: 0,
    cashAccountAdjustments: {
      materialDeficiency: 0,
      defectiveProducts: 0,
      merchandise: 0,
      damages: 0,
    },
  }
}

export function sumIncome(income: IncomeRow): number {
  return Object.values(income).reduce((a, b) => a + b, 0)
}

export function sumExpense(expense: ExpenseRow): number {
  return Object.values(expense).reduce((a, b) => a + b, 0)
}

export function calcCashBalances(rows: CashFlowRow[], initialCash: number): number[] {
  const balances: number[] = []
  let balance = initialCash
  for (const row of rows) {
    balance = balance + sumIncome(row.income) - sumExpense(row.expense)
    balances.push(balance)
  }
  return balances
}

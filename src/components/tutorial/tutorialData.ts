export interface TutorialStep {
  id: string;
  stepNumber: number;
  category: string;
  title: string;
  badge: string;
  summary: string;
  whyItMatters: string;
  realWorldExample: string;
  keyRules: string[];
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'pillars',
    stepNumber: 1,
    category: 'Architecture',
    title: 'The Six Financial Pillars',
    badge: 'Explicit Taxonomy',
    summary:
      'Envello strictly rejects an ambiguous single "Total Balance". Mixing credit card limits or locked term deposits with liquid bank funds causes accidental overdrafts and false security.',
    whyItMatters:
      'In traditional apps, seeing "₹1,50,000 Total Balance" might make you feel wealthy until you realize ₹80,000 is locked in an FD and ₹40,000 is credit card debt due in 3 days. Envello separates wealth into six distinct, deterministic pillars.',
    realWorldExample:
      'You have ₹50,000 in your checking account, ₹1,00,000 locked in a 1-year Fixed Deposit, and ₹15,000 outstanding on your HDFC credit card. Envello reports your Liquid Funds as exactly ₹50,000, your FDs as ₹1,00,000, and your Liabilities as ₹15,000—never an ambiguous ₹1,35,000.',
    keyRules: [
      'Pillar 1: Liquid Funds (Liquid checking, savings, physical cash).',
      'Pillar 2: Envelope Allocations (Assigned monthly spending funds).',
      'Pillar 3: FDs & RDs (Locked term deposits and recurring deposit assets).',
      'Pillar 4: Credit Card Liabilities (Unsettled debt; managed in Cards & Debts).',
      'Pillar 5: Actual Debts & Loans (External loans & personal debts owed).',
      'Pillar 6: Standing Monthly Costs (Planning commitments & recurring cadences).',
    ],
  },
  {
    id: 'envelopes',
    stepNumber: 2,
    category: 'Budgeting',
    title: 'Envelopes & Anti-Negative Guard',
    badge: 'Zero-Based Truth',
    summary:
      'Earmark monthly funds into isolated envelopes. Every rupee has an assigned purpose. Overspending in one category never silently drains another.',
    whyItMatters:
      'A personal finance app must never allow negative envelope balances. If an envelope goes negative, your entire financial projection breaks and you spend money you do not have.',
    realWorldExample:
      'If your "Dining Out" envelope has ₹1,500 available, you cannot log a ₹2,000 dinner against it. Envello guards you from overspending. You must either reallocate ₹500 first, or choose "None" for direct non-budgeted bills.',
    keyRules: [
      'Default Starter Envelopes: Spendable, Emergency, and Savings spawn automatically for new accounts.',
      'Total User Control: Every envelope can be edited, renamed, customized, or deleted at any time.',
      'Protected Reserve Feature: Any envelope can be toggled as a Protected Reserve to require explicit confirmation before spending or withdrawing funds.',
      'Anti-Negative Invariant: Envelopes can NEVER be overspent into negative (amount <= available).',
      'Direct bills and overhead without envelope deduction use envelope "None".',
      'Income recording can optionally allocate directly into an envelope in one click.',
    ],
  },
  {
    id: 'ledger',
    stepNumber: 3,
    category: 'Accounting',
    title: 'Double-Entry Transaction Ledger',
    badge: 'Integer Paise Precision',
    summary:
      'Every transaction is recorded with mathematical certainty. All amounts are stored in integer paise (₹1.00 = 100 paise) so you never experience floating-point drift (0.1 + 0.2 ≠ 0.3).',
    whyItMatters:
      'Spreadsheets and naive apps suffer from rounding drift and lost transactions. Envello maintains an atomic double-entry ledger where money moved always equals money received.',
    realWorldExample:
      'When you receive your monthly salary of ₹75,000, you can credit your ICICI Bank account and simultaneously assign ₹25,000 directly to your "Rent & Utilities" envelope. Both account balance and envelope allocation rise deterministically.',
    keyRules: [
      'Expenses debit the bank account and deduct from the selected envelope.',
      'Income credits the bank account and optionally increases the envelope budget.',
      'Account-to-Account Transfers alter account balances with ₹0 net expense or income.',
      'Audit log tracks the actor, previous balance, new balance, and timestamp.',
    ],
  },
  {
    id: 'cards-debts',
    stepNumber: 4,
    category: 'Liabilities',
    title: 'Credit Cards, EMIs & Personal Debts',
    badge: 'Liability Separation',
    summary:
      'Credit cards and EMIs are direct debt obligations, NOT envelopes. Paying your credit card bill or loan is a liability settlement that must NEVER be double-counted as an expense.',
    whyItMatters:
      'When you buy a laptop with a credit card, that purchase was already an expense. If paying your credit card bill next month was also recorded as an expense, you would double-count your spending and distort your monthly budget.',
    realWorldExample:
      'You buy groceries for ₹3,000 using your Axis Credit Card. Outstanding debt increases by ₹3,000. When you pay the bill from your HDFC Bank account on the 15th, bank cash decreases and card liability decreases. Total expense remains exactly ₹3,000.',
    keyRules: [
      'Credit cards are tracked under Cards & Debts with real-time utilization %.',
      'Utilization health indicator: <30% Safe (green), 30-50% Warning (yellow), >50% Danger (red).',
      'Bill repayments settle debt liabilities; they are never double-counted as expenses.',
      'Self EMIs allow you to pay yourself back over time for large upfront purchases from savings.',
      'Personal loans and external debts support 1-click manual settlements with quick percentage chips.',
    ],
  },
  {
    id: 'recurring',
    stepNumber: 5,
    category: 'Automation',
    title: 'Dual-Mode Standing Costs Engine',
    badge: 'Intervals & Cadences',
    summary:
      'Not all recurring costs fall cleanly on calendar month dates. Envello supports dual frequencies: repeat every X days for consumables or a fixed day of each month for regular bills.',
    whyItMatters:
      'Water cans repeat every 15 days; whey protein repeats every 45 days; rent is due on the 1st of every month. Standard monthly tools fail to track rolling consumable cadences accurately.',
    realWorldExample:
      'You order a 20L water can every 15 days costing ₹100. Over 30 days, that is normalized to ₹200/month. Envello alerts you in real time when it is "Due Today" or "Overdue by 2 days" with 1-click batch logging.',
    keyRules: [
      'Interval in Days (interval_days): e.g. every 15, 30, or 45 days for rolling supplies.',
      'Day of Month (monthly_day): e.g. 5th of each month for rent, utilities, and subscriptions.',
      'Real-time due status: "Due Today", "Overdue by X days", "Due in X days".',
      'Normalized 30-day projection: (Amount × 30) / interval_days.',
      '1-Click Batch Logging records due expenses into the ledger without manual re-entry.',
    ],
  },
  {
    id: 'reversion',
    stepNumber: 6,
    category: 'Data Safety',
    title: 'Transparent Reversions & 3-Day Rollover Policy',
    badge: 'Audit Trail Protection',
    summary:
      'Humans make mistakes. When reverting an entry, Envello provides an in-app preview detailing the exact ledger impact across accounts, envelopes, cards, and debts before execution.',
    whyItMatters:
      'Deleting a transaction blindly without knowing how it touches envelopes or bank balances can leave your ledger permanently out of sync. Envello provides complete transparency and guards against negative envelope balances.',
    realWorldExample:
      'You accidentally logged a ₹1,500 grocery expense twice. Reverting the duplicate restores ₹1,500 to your bank account and adds ₹1,500 back to your Groceries envelope available balance. However, if an income assigned to an envelope was already spent, the reversion is safely blocked.',
    keyRules: [
      'In-app double-entry preview before confirming any transaction reversion.',
      'Current calendar month transactions can be reverted at any time.',
      '3-Day Month-End Grace Period: Transactions from the final 3 days of the preceding month can still be reverted during month-end reconciliation.',
      'Older transactions are locked to preserve historical accounting snapshots.',
      'Anti-Negative Reversion Guard: Cannot revert if allocated funds were already spent.',
    ],
  },
  {
    id: 'sovereignty',
    stepNumber: 7,
    category: 'Privacy',
    title: 'Data Sovereignty, Export & Deletion',
    badge: '100% User Owned',
    summary:
      'Envello operates on zero-cost infrastructure (Vercel Hobby, Supabase Free) with strict Row Level Security. We never sell data, run ads, or train external AI on your finances.',
    whyItMatters:
      'Your financial life is confidential. You must always retain full ownership of your data, the ability to download complete offline backups, and the right to permanently purge your account.',
    realWorldExample:
      'You can export your complete financial history to CSV or JSON anytime. If you request account closure, a legal 30-day grace period allows 1-click restoration if you change your mind, followed by an automatic permanent cascade purge.',
    keyRules: [
      'Strict Row Level Security (RLS) on every table: auth.uid() = user_id.',
      'Private beta server-side allowlist: unauthenticated or uninvited users cannot access data.',
      '1-Click CSV & JSON complete data exports for offline backups.',
      '30-Day Account Deletion grace period with 1-click "Keep My Account" restoration.',
      'Optional immediate purge path upon typed email confirmation.',
    ],
  },
];

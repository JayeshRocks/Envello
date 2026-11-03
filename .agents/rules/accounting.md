# Accounting & Financial Math Rules

## Purpose
Ensure deterministic, exact financial arithmetic, consistent ledger invariants, and transparent balance calculations in Envello.

---

## 1. Absolute Precision & Currency Representation

- **Integer Paise Representation**: All monetary quantities must be represented as integer paise in the application logic (`100 paise = ₹1.00`).
- **PostgreSQL NUMERIC**: In the database schema, all monetary columns must use `NUMERIC(12, 2)` or `BIGINT` representing paise. Never use `FLOAT`, `REAL`, or `DOUBLE PRECISION`.
- **No Binary Float Math in JavaScript**:
  - Never do `0.1 + 0.2` in client code.
  - Always use an integer math helper (e.g. `toPaise(rupees)`, `toRupees(paise)`) or a precision decimal library for arithmetic.
  - When formatting for display, format in standard Indian numbering system (`₹1,00,000.00`).

---

## 2. Transaction Classification & Non-Expense Movements

Never classify balance movements as expenses unless wealth is actually consumed:

- **Account-to-Account Transfers**: Moving money between two personal bank accounts alters account balances, but does NOT create an expense.
- **Fixed Deposit / Savings Movement**: Depositing money into an FD converts liquid cash into a savings asset. Net worth is unchanged; it is NOT an expense.
- **Credit Card Purchases vs Bill Payments**:
  - A credit card purchase is an expense (allocated against an envelope) and increases the card's liability.
  - Repaying the credit card bill from a bank account settles the liability; it MUST NOT be counted as an expense a second time.
- **Self EMIs vs Actual EMIs**:
  - **Self EMI**: Paying oneself back for an upfront purchase made from savings. It transfers money from monthly spending into savings; it does not consume new wealth.
  - **Actual Debt / EMI**: Paying an external lender or individual settles an outstanding debt liability.
- **Refunds**: Must be linked to the original transaction wherever possible and credit the original envelope without distorting monthly income metrics.

---

## 3. Envelope Budgeting Invariants

- **Core System Envelopes & User Categories**:
  - Exactly three permanent, mandatory system compartments:
    1. `Spendable` (`regular`): Primary liquid clearinghouse and general spendable pool.
    2. `Emergency` (`emergency`): Guarded safety reserve. Never auto-deducts to cover general expenses.
    3. `Savings` (`savings`): Untouched capital reserve set aside to earn normal bank interest and build positive net worth without locking into term deposits.
  - User-defined lifestyle envelopes (e.g. `Groceries`, `Dining Out`, `Utilities`, `Entertainment`, `Travel`).
  - Credit Cards and EMIs are direct debt liabilities and repayments managed in the Cards & Debts hub, NOT core envelopes.
- **Anti-Negative Envelope Invariant**:
  - Envelopes can NEVER be overspent into negative balances.
  - When recording an expense against an envelope, the transaction engine strictly enforces that debits do not exceed available allocation (`amountPaise <= availablePaise`).
  - Direct bills or card repayments that bypass envelope allocations must select "None".
  - Income can be credited directly to a liquid account and optionally assigned to an envelope, increasing that envelope's monthly allocation and available balance in lockstep.
- **Protected Reserve Authorization**:
  - `Emergency` and `Savings` compartments are guarded reserves. Any withdrawal or direct expense debit requires an explicit confirmation banner and authorization checkbox to prevent accidental depletion.
- **Rollover Mechanics**:
  - Unspent allocations follow explicit rollover policies (`carry_over` vs zero-reset). Funds carried over from the prior month form the opening available balance (`available = allocated + carriedOver - spent`).
- **Planning vs Actuals (Monthly Targets & Recurring Costs)**:
  - Monthly targets and recurring costs represent planning commitments. They NEVER deduct real money from bank accounts or envelopes until an actual transaction is logged.
  - Recurring costs support dual scheduling: `interval_days` (repeating every $X$ days; normalized 30-day commitment $= \text{amount} \times 30 / \text{interval\_days}$) and `monthly_day` (repeating on a specific day of each month).

---

## 4. Ledger Invariants, Reversion & Atomic Operations

- **Double-Sided Consistency**: Every transfer, card repayment, or allocation change touches two sides. Both sides must be updated in a single database transaction.
- **Detailed Reversion Process & 3-Day Rollover Policy**:
  - Reversion requests require an in-app ledger preview showing the exact account balance changes and envelope refunds/deductions prior to confirmation.
  - Reversions are restricted to the current calendar month, plus a 3-day post-month-end grace period for transactions dated in the final 3 days of the preceding month.
  - Reversion anti-negative check: Reverting an income transaction or envelope transfer cannot proceed if the envelope has already spent those funds (`availablePaise < amountPaise`), preventing negative envelope balances.
- **No Silent Adjustments**: If a balance discrepancy occurs during reconciliation against a bank statement, record a formal `Balance Adjustment` transaction with a documented reason and audit log. Never alter past transactions silently.
- **Audit Trail**: Key financial operations must log an entry in the `audit_logs` table recording the actor, timestamp, previous balance, and new balance.

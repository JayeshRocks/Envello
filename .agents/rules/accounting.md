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

- **Total User Envelope Control & Starter Templates**:
  - Users have absolute control over their envelope system: every envelope can be edited, renamed, customized, rearranged (persisted with `sort_order`), and deleted. No permanent locked system compartments exist.
  - Workspace initialization automatically spawns default starter envelopes: `Spendable`, `Emergency`, and `Savings`, alongside initial lifestyle categories.
  - Credit Cards and EMIs are direct debt liabilities and repayments managed in the Cards & Debts hub, NOT envelopes.
- **Protected Reserve Feature**:
  - Any envelope can be toggled on/off as a "Protected Reserve" styled in emerald green with a compact shield symbol.
  - Any debit or transfer from a Protected Reserve requires an explicit confirmation prompt and user authorization checkbox (`Emergency` and `Savings` spawn with this feature enabled by default).
- **Anti-Negative Envelope Invariant**:
  - Envelopes can NEVER be overspent into negative balances.
  - When recording an expense against an envelope, the transaction engine strictly enforces that debits do not exceed available allocation (`amountPaise <= availablePaise`).
  - Direct bills or card repayments that bypass envelope allocations must select "None".
  - Income can be credited directly to a liquid account and optionally assigned to an envelope, increasing that envelope's monthly allocation and available balance in lockstep.
- **Account Holds & Inline Headroom Display**:
  - Allocating budget to an envelope places an explicit hold on backing liquid accounts (`envelope_allocation_sources`).
  - Liquid accounts display physical bank balance, reserved envelope holds, and free unallocated headroom inline in a single visual line.
  - Direct account spending (bills, card repayments) cannot exceed free unallocated funds (`amountPaise <= unallocatedPaise`).
  - An account's balance cannot be decreased below active envelope holds (`newBalancePaise >= allocatedPaise`), nor can an account be deleted while holds remain (`allocatedPaise > 0n`).
- **Previous Month View-Only Lock**:
  - Historical months accessed via the month selector are locked against edits, reallocations, or budget modifications.
  - A persistent guidance banner informs users that previous months represent frozen snapshots prior to month-end rollover and directs them to the current month to make changes.
- **Rollover Mechanics**:
  - Unspent allocations follow explicit rollover policies:
    1. `carry_forward`: Retains unspent balance and holds reserved in this envelope into the next month.
    2. `reset`: Releases unspent balance and holds back to backing accounts' free unallocated balance.
- **Planning vs Actuals (Monthly Targets & Recurring Costs)**:
  - Monthly targets and recurring costs represent planning commitments. They NEVER deduct real money from bank accounts or envelopes until an actual transaction is logged.
  - Recurring costs support dual scheduling: `interval_days` (repeating every $X$ days; normalized 30-day commitment $= \text{amount} \times 30 / \text{interval\_days}$) and `monthly_day` (repeating on a specific day of each month).

---

## 4. Ledger Invariants, Reversion & Atomic Operations

- **Double-Sided Consistency**: Every transfer, card repayment, or allocation change touches two sides. Both sides must be updated in a single database transaction.
- **Atomic PostgreSQL RPC Execution**:
  - Envelope budget allocations and hold distributions execute atomically via `upsert_envelope_allocation_atomic`.
  - Transaction reversals execute atomically via `revert_transaction_atomic`.
  - Account transfers execute atomically via `execute_account_transfer`.
  - RPC execution eliminates multi-roundtrip frontend waterfall requests, guaranteeing instant updates without lag or partial failures.
- **Detailed Reversion Process & 3-Day Rollover Policy**:
  - Reversion requests require an in-app ledger preview showing the exact account balance changes and envelope refunds/deductions prior to confirmation, naming affected accounts and envelopes specifically.
  - Reversions are restricted to the current calendar month, plus a 3-day post-month-end grace period for transactions dated in the final 3 days of the preceding month.
  - Reverting a transaction from the previous month updates that month's envelope available balance, and any resulting surplus balance automatically cascades into that envelope's designated rollover policy.
  - Reversion anti-negative check: Reverting an income transaction or envelope transfer cannot proceed if the envelope has already spent those funds (`availablePaise < amountPaise`), preventing negative envelope balances.
- **No Silent Adjustments**: If a balance discrepancy occurs during reconciliation against a bank statement, record a formal `Balance Adjustment` transaction with a documented reason and audit log. Never alter past transactions silently.
- **Audit Trail**: Key financial operations must log an entry in the `audit_logs` table recording the actor, timestamp, previous balance, and new balance.

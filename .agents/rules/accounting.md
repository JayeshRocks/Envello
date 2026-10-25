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

- **Envelope Types**:
  1. `Regular` (default spendable pool)
  2. `Emergency` (guarded reserve; NEVER auto-deduct to cover regular overspends)
  3. `Gym`
  4. `Essentials` (tracked independently from Gym)
  5. `Outing`
  6. `Birthdays`
  7. `Savings` (Super.Money FDs; non-spendable assets)
  8. `Credit Cards` (liability settlement tracker)
  9. `EMI(s)` (external debt payments)
  10. `Monthly Targets` (forward planning pool)
- **Rollover Mechanics**:
  - Unspent allocations must follow explicit, user-configured rollover rules (rollover to next month vs reallocate to Regular/Savings). Never silently zero out balances at month-end.
- **Emergency Envelope Protection**:
  - Funds in Emergency are locked. Any debit from Emergency requires explicit user intent and confirmation.
- **Planning vs Actuals (Monthly Targets)**:
  - Creating a Monthly Target is a planning intention. It must NEVER deduct real money from bank accounts or Regular until an actual transfer or contribution transaction is logged.

---

## 4. Ledger Invariants & Atomic Operations

- **Double-Sided Consistency**: Every transfer, card repayment, or allocation change touches two sides. Both sides must be updated in a single database transaction.
- **No Silent Adjustments**: If a balance discrepancy occurs during reconciliation against a bank statement, record a formal `Balance Adjustment` transaction with a documented reason and audit log. Never alter past transactions silently.
- **Audit Trail**: Key financial operations must log an entry in the `audit_logs` table recording the actor, timestamp, previous balance, and new balance.

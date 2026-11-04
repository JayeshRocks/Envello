# Envello — Accounting Engine & Invariants Specification

## 1. Accounting Philosophy

Envello operates on deterministic, double-entry financial principles. The database and domain engine are the authoritative sources of truth. The interface displays values strictly derived from persisted transaction records and validated accounting rules.

---

## 2. Monetary Precision & Currency Standards

- **Smallest Currency Unit**: All monetary values are calculated and stored in integer paise (`1 Rupee = 100 Paise`).
- **No Floating-Point Arithmetic**:
  - Binary floating-point arithmetic (e.g. `0.1 + 0.2 === 0.30000000000000004`) is strictly forbidden.
  - In TypeScript, all calculations use integers with precision conversion helpers:
    ```typescript
    export const toPaise = (rupees: number | string): bigint => {
      const parsed = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
      return BigInt(Math.round(parsed * 100));
    };

    export const toRupees = (paise: bigint | number): number => {
      return Number(paise) / 100;
    };
    ```
- **Display Formatting**: Format all amounts using the Indian numbering system:
  ```text
  ₹1,50,000.00 (One Lakh Fifty Thousand Rupees)
  ```

---

## 3. Balance Taxonomy (Six Pillars of Financial Clarity)

The UI must NEVER summarize wealth into an ambiguous "Total Balance". It must always expose the 6 distinct pillars:

| Pillar | Classification | Source | Liquid / Spendable? |
| :--- | :--- | :--- | :--- |
| **Spendable Cash** | Asset | Checking, Savings, Physical Cash | **Yes** |
| **Envelope Allocations** | Budget | Spendable, Emergency, Savings, and lifestyle envelopes | **Yes (earmarked)** |
| **FDs & RDs** | Asset | Bank FDs, RDs, Post Office, Term Deposits | **No (locked)** |
| **Credit Card Liabilities** | Liability | Outstanding credit card debt (Cards & Debts hub) | **Obligation** |
| **Actual Debts** | Liability | Personal loans, debts to individuals | **Obligation** |
| **Monthly Targets & Standing Costs** | Planning | Planned savings intentions and dual-mode recurring needs | **N/A (goal)** |

*Note on terminology*: In space-constrained UI elements (pills, tabs, summary chips), "Fixed Deposits & Recurring Deposits" is shortened to **"FDs & RDs"**.

---

## 4. Transaction Invariants & Classification

### 4.1 Non-Expense Wealth Movements
Never classify a transaction as an expense unless purchasing power is actually consumed:

1. **Account-to-Account Transfer**:
   - `Account A (Debit -₹5,000)` and `Account B (Credit +₹5,000)`.
   - Net cashflow impact: **₹0**. Consumption impact: **₹0**.
2. **Fixed Deposit & Recurring Deposit Placement**:
   - `Bank Account (Debit -₹50,000)` and `FD/RD Asset (Credit +₹50,000)`.
   - Converts liquid cash into locked savings. Net worth impact: **₹0**. Consumption: **₹0**.
3. **Credit Card Bill Repayment**:
   - `Bank Account (Debit -₹12,000)` and `Credit Card Liability (Credit +₹12,000)`.
   - Settles an existing card liability in the Cards & Debts hub. Consumption was already recorded when goods were purchased. Repaying must NEVER be counted as an expense a second time.
4. **Self EMI Reimbursement**:
   - Moves money from monthly discretionary cash back into savings to replenish funds used for a past upfront purchase.

---

### 4.2 Transaction Invariant Table

| Type | Liquid Cash Impact | Envelope Impact | Liability / Asset Impact |
| :--- | :--- | :--- | :--- |
| **Income** | `+Amount` | Direct to account; optionally assigns to Envelope | None |
| **Expense** | `-Amount` | `-Amount` from Envelope (must not exceed available; or "None" for direct bill) | None |
| **Transfer** | Source `-Amount`, Dest `+Amount` | None | None |
| **Envelope Allocation** | None | Source Envelope `-Amount`, Target Envelope `+Amount` | None |
| **Credit Card Purchase** | None | `-Amount` from Envelope (or "None") | CC Outstanding `+Amount` |
| **Credit Card Payment** | `-Amount` from Bank | None | CC Outstanding `-Amount` |
| **FD/RD Placement** | `-Amount` from Bank | None | FD/RD Asset `+Amount` |
| **FD/RD Liquidation** | `+Principal + Interest` | Unallocated/Spendable `+Interest` | FD/RD Asset `-Principal` |
| **Self EMI Repayment** | None | Spendable `-Amount` | Savings Asset `+Amount`, Self EMI Balance `-Amount` |
| **Actual Debt Payment** | `-Amount` from Bank | None | Debt Outstanding `-Amount` |
| **Refund** | `+Amount` to Bank/Card | `+Amount` to Envelope | Linked to original transaction |
| **Balance Adjustment** | `+/-Difference` to Account | None | Formal audit entry recorded |

---

## 5. Envelope Budgeting Rules

### 5.1 Envelopes Architecture
1. **Total User Control & Default Starter Envelopes**:
   - Every envelope can be edited, renamed, customized, rearranged, and deleted. No envelopes are permanently locked system compartments.
   - **Spendable**, **Emergency**, and **Savings** spawn automatically upon workspace initialization alongside custom categories.
   - **Protected Reserve Feature**: Any envelope can be toggled on/off as a Protected Reserve (Emergency and Savings spawn with this enabled by default). When active, it displays a compact green shield symbol and requires explicit user authorization confirmation before funds can be withdrawn or spent.
   - **Backing Account Holds & Multi-Account Funding**: Allocating budget to an envelope places an explicit hold on backing liquid accounts (`envelope_allocation_sources`). Users can fund an envelope from multiple accounts via "Add from another account", which locks previous account selectors and offers row-level revert buttons. Each account's funding is strictly capped at its available headroom ($\text{unallocatedPaise} + \text{existingHoldOnEnvelope} \le \text{balancePaise}$), preventing over-allocation.
   - **Month-End Rollover Policies**:
     - **Carry Forward** (`carry_forward`): Retains unused funds and backing account holds in this envelope into next month.
     - **Sweep to Spendable** (`sweep_to_regular`): Transfers unused budget surplus to the Spendable envelope at month-end.
     - **Reset to Bank** (`reset`): Releases unused budget and holds back to the backing bank account's free unallocated balance.
2. **User-Defined Lifestyle Envelopes**: Custom envelopes (e.g. `Dining Out`, `Groceries`, `Utilities`, `Travel`, `Entertainment`).
3. **Cards & Debts Separation**: Credit cards and EMIs are direct debt liabilities and repayments managed in the Cards & Debts hub, NOT envelopes.

### 5.2 Anti-Negative Envelope Balance Guard
- **Strict Invariant**: Envelopes can NEVER be overspent into negative balances.
- **Validation**: When recording an expense against an envelope, the transaction engine strictly enforces `amountPaise <= availablePaise`. If the expense exceeds available funds, the transaction is rejected.
- **Direct Bills**: Expenses that do not deduct from an envelope use the envelope option "None".
- **Income Direct Assignment**: When recording income, users can optionally assign the income directly to an envelope, increasing that envelope's monthly allocation and available balance in lockstep.

### 5.3 Rollover Mechanics
- At the start of a new budget period (`YYYY-MM`):
  - Envelopes with `carry_forward` keep their unspent balance: $\text{Available} = \text{Allocated} + \text{Carried Over} - \text{Spent}$.
  - Envelopes with `sweep_to_spendable` return unused funds to Spendable.
  - Overspent envelopes are strictly prevented by the transaction engine; zero or positive available balances are guaranteed.

### 5.4 Planning vs Actuals (Monthly Targets & Recurring Costs)
- Creating or editing a Monthly Target or Recurring Cost is a planning intention.
- **Rule**: Target creation must NEVER automatically deduct funds from bank accounts or envelopes until an actual transaction is logged.
- **Dual-Mode Recurring Costs**:
  - `interval_days`: Repeats every $X$ days for rolling supplies and consumables. Normalized 30-day monthly commitment: $\text{amount} \times 30 / \text{interval\_days}$.
  - `monthly_day`: Triggers on a fixed calendar day of each month for regular monthly bills (rent, utilities, subscriptions).
  - Real-time due indicators (`Due Today`, `Overdue by X days`, `Due in X days`) with 1-click batch logging.

---

## 6. Credit Cards & EMIs

### 6.1 Credit Card Utilization
- **Formula**: `(Total Outstanding Balance / Total Credit Limit) * 100`
- **Warning Threshold**: Recommended below 30% for credit health. Displayed with visual warnings (amber at 30-50%, red above 50%).
- **No Sensitive Details**: Never store credit card numbers, CVVs, PINs, or banking passwords.

### 6.2 Self EMIs (Internal Reimbursement)
- Represents an upfront purchase funded from savings that the owner reimburses over time.
- **Equation**: `Remaining Balance = Total Funded - Sum(Reimbursements Made)`.
- Repayments reduce the remaining Self EMI balance and credit the savings reserve without generating duplicate expense records.

### 6.3 Actual EMIs and External Debts
- Tracks real money owed to friends, family, or loan providers.
- Distinct from Self EMIs because failure to pay represents an external legal or social obligation.
- Each payment reduces outstanding liability and records interest expense if applicable.

---

## 7. Transaction Reversion & Grace Period

- **Detailed In-App Preview**: Reversions present a comprehensive breakdown of the exact changes that will be applied to account balances, envelope allocations, and card/debt liabilities before execution.
- **3-Day Rollover Policy**: Reversions are restricted to the current calendar month, plus a 3-day grace period for transactions dated in the final 3 days of the preceding month.
- **Anti-Negative Guard**: Reverting an income transaction or allocation transfer is rejected if the envelope has already spent those funds, ensuring envelope balances never drop below zero.

---

## 8. Reconciliation & Balance Adjustments

- Monthly bank statement reconciliation allows comparing the calculated ledger balance against actual bank statements.
- If a discrepancy exists:
  - Record a `Balance Adjustment` transaction.
  - Log the previous balance, new balance, discrepancy amount, and user-provided reason in `audit_logs`.
  - Past transactions must NEVER be silently edited or deleted to force a balance to match.

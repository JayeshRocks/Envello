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
| **Envelope Allocations** | Budget | Designated portion of Spendable Cash | **Yes (earmarked)** |
| **Savings & Fixed Deposits** | Asset | Bank FDs, Post Office, Term Deposits | **No (locked)** |
| **Credit Card Liabilities** | Liability | Outstanding credit card debt | **Obligation** |
| **Actual Debts** | Liability | Personal loans, debts to individuals | **Obligation** |
| **Monthly Targets** | Planning | Planned savings/purchase intentions | **N/A (goal)** |

---

## 4. Transaction Invariants & Classification

### 4.1 Non-Expense Wealth Movements
Never classify a transaction as an expense unless purchasing power is actually consumed:

1. **Account-to-Account Transfer**:
   - `Account A (Debit -₹5,000)` and `Account B (Credit +₹5,000)`.
   - Net cashflow impact: **₹0**. Consumption impact: **₹0**.
2. **Fixed Deposit Placement**:
   - `Bank Account (Debit -₹50,000)` and `FD Asset (Credit +₹50,000)`.
   - Converts liquid cash into locked savings. Net worth impact: **₹0**. Consumption: **₹0**.
3. **Credit Card Bill Repayment**:
   - `Bank Account (Debit -₹12,000)` and `Credit Card Liability (Credit +₹12,000)`.
   - Settles an existing debt. Consumption was already recorded when goods were purchased. Counting this as an expense would double-count spending.
4. **Self EMI Reimbursement**:
   - Moves money from monthly discretionary cash back into savings to replenish funds used for a past upfront purchase.

---

### 4.2 Transaction Invariant Table

| Type | Liquid Cash Impact | Envelope Impact | Liability / Asset Impact |
| :--- | :--- | :--- | :--- |
| **Income** | `+Amount` | Increases Unallocated pool | None |
| **Expense** | `-Amount` | `-Amount` from Envelope | None |
| **Transfer** | Source `-Amount`, Dest `+Amount` | None | None |
| **Envelope Allocation** | None | Regular `-Amount`, Target Envelope `+Amount` | None |
| **Credit Card Purchase** | None | `-Amount` from Envelope | CC Outstanding `+Amount` |
| **Credit Card Payment** | `-Amount` from Bank | None | CC Outstanding `-Amount` |
| **FD Placement** | `-Amount` from Bank | None | FD Asset `+Amount` |
| **FD Liquidation** | `+Principal + Interest` | Unallocated `+Interest` | FD Asset `-Principal` |
| **Self EMI Repayment** | None | Regular `-Amount` | Savings Asset `+Amount`, Self EMI Balance `-Amount` |
| **Actual Debt Payment** | `-Amount` from Bank | None | Debt Outstanding `-Amount` |
| **Refund** | `+Amount` to Bank/Card | `+Amount` to Envelope | Linked to original transaction |
| **Balance Adjustment** | `+/-Difference` to Account | None | Formal audit entry recorded |

---

## 5. Envelope Budgeting Rules

### 5.1 Envelopes Definition
1. **Regular / Balance**: Default spendable envelope for general purchases. Persistent account balances remain separate from monthly allocations.
2. **Emergency**: Locked reserve for genuine emergencies.
   - **Protection Rule**: Never automatically debit Emergency to cover negative balances in Regular or other envelopes.
   - Any transfer from Emergency requires an explicit confirmation prompt.
3. **Gym**: Fitness and health expenses.
4. **Essentials**: Core living necessities (rent, utilities, groceries). Maintained strictly independent of Gym.
5. **Outing**: Social spending, dining, entertainment.
6. **Birthdays**: Gifts, celebrations.
7. **Savings & Fixed Deposits**: Tracked separately as non-spendable asset balances.
8. **Credit Cards**: Pool holding cash reserved to pay card bills.
9. **EMI(s)**: Allocations reserved for debt repayments.
10. **Monthly Targets**: Planning goals for upcoming recurring purchases.

### 5.2 Rollover Mechanics
- At the start of a new budget period (`YYYY-MM`):
  - Envelopes with `carry_forward` keep their unspent balance.
  - Envelopes with `sweep_to_regular` return unused funds to Regular.
  - Overspent envelopes carry forward negative balances or require explicit reallocation.
  - Unused allocations are never silently discarded.

### 5.3 Planning vs Actuals (Monthly Targets)
- Creating or editing a Monthly Target is a planning intention.
- **Rule**: Target creation must NEVER automatically deduct funds from bank accounts or Regular.
- Only an actual contribution transaction alters account balances.

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

## 7. Reconciliation & Balance Adjustments

- Monthly bank statement reconciliation allows comparing the calculated ledger balance against actual bank statements.
- If a discrepancy exists:
  - Record a `Balance Adjustment` transaction.
  - Log the previous balance, new balance, discrepancy amount, and user-provided reason in `audit_logs`.
  - Past transactions must NEVER be silently edited or deleted to force a balance to match.

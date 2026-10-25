# Envello — Product Specification

## 1. Executive Summary

Envello is a personal finance management and envelope-budgeting web application built for precision, privacy, and proactive wealth allocation. Initially deployed as a private single-owner beta, it provides full control over cash flow, envelope allocations, credit card liabilities, debt repayments, and savings assets.

---

## 2. Core Functional Modules

### 2.1 Balance Taxonomy & Financial Overview
The application strictly rejects a single ambiguous "Total Balance" figure. The financial dashboard organizes wealth into six distinct, transparent pillars:

1. **Spendable Cash (Liquid Assets)**:
   - Sum of all liquid checking/savings bank accounts and physical cash on hand.
   - Represents money that is actually available to be spent or allocated.
2. **Envelope Allocations (Assigned Money)**:
   - Funds from spendable cash that have been budgeted into active spending categories for the current month.
3. **Savings & Fixed Deposits (Non-Spendable Assets)**:
   - Long-term reserves, fixed deposits (such as Super.Money FDs), emergency funds, and recurring deposits.
   - Explicitly excluded from spendable cash to prevent accidental spending.
4. **Credit Card Liabilities (Unsettled Debt)**:
   - Total outstanding balances across all active credit cards.
   - Tracked alongside available credit limits and statement due dates.
5. **Actual Debts (External Obligations)**:
   - Amounts owed to individuals (friends, family) or financial institutions with repayment schedules.
6. **Monthly Targets (Forward Planning)**:
   - Forward-looking financial goals and recurring purchase intentions.
   - Setting a target does NOT deduct cash until actual contributions are recorded.

---

### 2.2 Envelope Budgeting System
Envello utilizes zero-based envelope budgeting principles: every rupee of spendable cash has a designated role.

#### Initial Envelope Categories:
1. **Regular / Balance**:
   - The default spending envelope.
   - When no specific category is assigned, or for general discretionary transactions, funds are drawn from Regular.
   - Persistent account balances remain separate from monthly allocations.
2. **Emergency**:
   - High-security reserve reserved solely for unforeseen crises (medical, urgent repairs).
   - **Protection Rule**: Never automatically deduct or transfer money from Emergency to cover Regular or category deficits.
   - Any withdrawal from Emergency requires explicit user confirmation.
3. **Gym**:
   - Health and fitness subscriptions, trainer fees, equipment.
4. **Essentials**:
   - Core utility bills, groceries, rent, medications.
   - Maintained as an independent envelope (never merged with Gym).
5. **Outing**:
   - Dining out, weekend activities, entertainment.
6. **Birthdays**:
   - Gifts, celebratory meals, social events.
7. **Savings (Super.Money FDs)**:
   - Tracked separately as non-spendable asset balances.
8. **Credit Cards**:
   - Tracking envelope for holding money reserved to pay off card statements.
9. **EMI(s)**:
   - Allocations earmarked for monthly debt and instalment repayments.
10. **Monthly Targets**:
    - Planning pool for recurring purchase goals.

#### Rollover & Month Transition Rules:
- Envelopes support configurable rollover behavior (roll surplus into next month vs sweep back to Regular/Savings).
- Negative envelope balances (overspending) are carried forward or prompt the user to reallocate from Regular.
- Monthly transitions must never silently discard or reset unused balances.

---

### 2.3 Account Management & Ledger Tracking
- **Account Types**:
  - Checking & Savings Bank Accounts
  - Cash in Hand
  - Fixed Deposits & Term Deposits
  - Credit Card Accounts
- **Attributes Tracked**:
  - Account Name, Financial Institution, Account Type, Currency (INR), Current Balance, Status (Active/Archived).

---

### 2.4 Transaction Taxonomy & Accounting Invariants
Every financial movement is classified deterministically:

| Transaction Type | Impact on Cash | Impact on Envelopes | Notes |
| :--- | :--- | :--- | :--- |
| **Income** | Increases liquid balance | Increases unallocated pool | Salary, bonuses, interest |
| **Expense** | Decreases liquid balance | Decreases specified envelope | Outflow of cash for goods/services |
| **Account Transfer** | Neutral (A- / B+) | Neutral | Internal transfer between bank accounts |
| **Envelope Allocation** | Neutral | Regular- / Envelope+ | Budgeting money into categories |
| **Envelope Reallocation**| Neutral | Env A- / Env B+ | Moving budget between envelopes |
| **Credit Card Purchase**| Neutral to cash | Envelope- / CC Liability+ | Increases card balance owed |
| **Credit Card Payment** | Decreases bank cash | Decreases CC Liability | Settles card bill; NOT an expense |
| **FD Deposit** | Decreases bank cash | Increases FD Asset | Converting cash to savings asset |
| **FD Liquidation** | Increases bank cash | Decreases FD Asset | Principal + interest payout |
| **Self EMI Repayment** | Decreases Regular | Increases Savings balance | Paying oneself back for past savings |
| **Actual Debt Payment** | Decreases bank cash | Decreases Debt liability | Principal/interest debt reduction |
| **Refund** | Increases liquid cash | Restores envelope balance | Linked to original transaction |
| **Balance Adjustment** | Adjusts account balance | Neutral or Audit entry | Formal reconciliation adjustment |

---

### 2.5 Credit Cards & EMIs

#### 2.5.1 Credit Card Management
- **Tracking Fields**: Card name, Issuer, Credit Limit, Outstanding Balance, Available Credit, Utilisation %, Statement Date, Payment Due Date, Statement Balance, Minimum Payment.
- **Utilisation Threshold**: Configurable warning indicator with a recommended target below 30%. Never presented as a legal requirement.
- **Billing Cycle Discipline**: Distinguishes unbilled transactions from closed statement balances.
- **Security Constraint**: Never store full PAN, CVV, expiry dates, or banking passwords.

#### 2.5.2 Self EMIs (Internal Savings Reimbursement)
- Used when a significant purchase is funded upfront from savings, with the intention of paying back savings over several months.
- Tracks: Original purchase details, initial amount drawn from savings, monthly reimbursement target, total reimbursed to date, and remaining balance.
- Mechanics: Monthly repayments move money from the spendable pool back to the savings asset.

#### 2.5.3 Actual EMIs & Debts
- Tracks debts owed to external individuals (e.g. friends, family) or financial institutions.
- Tracks: Lender/Individual name, principal amount, interest rate (if any), monthly instalment amount, due dates, payment history, and remaining balance.

---

### 2.6 Monthly Targets & Recurring Goals
- Planning envelope for recurring purchase goals (e.g. annual insurance premiums, festival shopping, tech upgrades).
- Tracks planned monthly contributions vs actual contributions made.
- **Rule**: Creating or editing a monthly target does not deduct funds until an explicit contribution transaction is recorded.

---

### 2.7 Reports, Forecasting & Exports
- Monthly cashflow analysis (Total Income vs Total Consumption).
- Envelope spending breakdown and budget variance.
- Credit card utilization and statement payment history.
- Net worth trend (Liquid Cash + FDs - Card Liabilities - Debts).
- Data export in standardized formats (CSV, JSON) for personal backups.

---

### 2.8 Future Scope (Version 2)
- Explicitly deferred AI-assisted features: Natural language transaction entry, SMS/receipt parsing, predictive spending alerts, and financial conversational queries.
- Version 1 is 100% complete and fully usable without any AI dependencies.

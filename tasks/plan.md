# Implementation Plan: Account Holds, Multi-Account Envelope Allocation & Ghost-Bank Spending

## 1. Executive Summary & Problem Statement

In traditional envelope budgeting applications, envelopes exist as an abstract conceptual layer completely detached from the physical bank accounts holding the actual funds. A user might have ₹50,000 in HDFC Bank and ₹20,000 in SBI, and allocate ₹30,000 to "Rent". Because the app does not tie that ₹30,000 allocation to HDFC, the user could swipe their HDFC debit card for a non-budgeted ₹40,000 expense (or pay a credit card bill), believing they have ₹50,000 of free cash, accidentally spending their rent money.

This feature establishes an authoritative, deterministic connection between physical bank accounts and virtual envelopes:
1. **Allocation Holds on Bank Accounts**: Allocating funds to an envelope places a **hold/reservation** on that amount in the designated liquid account(s).
2. **Three-Tier Account Balance Taxonomy**:
   - **Total Ledger Bank Balance**: Physical money in the account.
   - **Allocated (Reserved) Balance**: Sum of all envelope allocations currently backed by this account in the active budget period.
   - **Unallocated (Free Spendable) Balance**: `Total Balance - Allocated Balance`.
3. **Guard on Direct Spending**: Direct spending from an account (direct expense, card bill payment, debt repayment, account transfer) can **never** exceed the account's unallocated/free balance.
4. **Envelopes as "Ghost Banks" in Transactions**:
   - In transaction modals, users can pay **directly from a liquid bank account** (from unallocated funds) OR pay **from an envelope (ghost bank)**.
   - When paying from an envelope backed by multiple accounts, the engine automatically selects backing accounts using a deterministic algorithm: **deduct first from the account that can cover the most**, splitting across accounts in descending order if needed.
5. **Real-Life Settlement Prompt**:
   - When an envelope transaction completes, an interactive receipt prompt displays the exact breakdown: *"To complete this in real life, pay ₹X from Account A and ₹Y from Account B."*
   - Includes **"Mark as completed"** and a 1-click **"Revert this Transaction"** option.
6. **Envelope Card Actions & View Allocation Prompt**:
   - Envelope card actions: Edit (`Pencil`), Transfer (`ArrowRightLeft`), and Modify Budget (`SlidersHorizontal`).
   - On the bottom right of the envelope card: a **"View Allocation →"** link (similar to the "Manage →" links on the 6 pillars) opens an informative breakdown prompt detailing exactly which liquid accounts and amounts back this envelope.
7. **Robust Multi-Account Reversion & Transfer Preservation**:
   - Transfers between envelopes transfer the backing account reservations from source to destination without data loss.
   - Reverting an envelope payment restores the exact debited paise to each underlying bank account and atomically re-establishes the envelope allocation hold with zero drift.

---

## 2. Mathematical Formalisms & Financial Invariants

All calculations strictly use **integer paise** (`1 INR = 100 paise`, `BigInt` in TypeScript, `BIGINT` in PostgreSQL). No floating-point math.

### 2.1 Account Balance Taxonomy
For any liquid account $a \in \text{Accounts}$ in budget period $p$:
$$\text{TotalBalancePaise}(a) = \sum \text{Credits}(a) - \sum \text{Debits}(a)$$
$$\text{AllocatedPaise}(a, p) = \sum_{e \in \text{Envelopes}} \text{AllocationSourcePaise}(e, a, p)$$
$$\text{UnallocatedPaise}(a, p) = \text{TotalBalancePaise}(a) - \text{AllocatedPaise}(a, p)$$

### 2.2 Invariant 1: Non-Negative Unallocated Balance on Direct Spending
Direct outlays from account $a$ (direct expense, credit card payment, loan repayment, account transfer) are guarded:
$$\text{SpendAmountPaise} \le \text{UnallocatedPaise}(a, p)$$
If $\text{SpendAmountPaise} > \text{UnallocatedPaise}(a, p)$, the transaction is rejected with an explanatory error.

### 2.3 Invariant 2: Multi-Account Backing Conservation
For any envelope $e$ in period $p$:
$$\text{EnvelopeAllocatedPaise}(e, p) = \sum_{a} \text{AllocationSourcePaise}(e, a, p)$$
The sum of backing reserves across accounts must strictly equal the envelope's planned allocation.

### 2.4 Invariant 3: Greedy Largest-First Envelope Debit Algorithm
When an expense of amount $M$ is paid via envelope $e$:
1. Let $\mathcal{B} = \{ (a, B_a) \mid B_a > 0 \}$ be the remaining backing balances of envelope $e$ sorted descending by $B_a$.
2. Verify $\sum_a B_a \ge M$. (Guarded by Anti-Negative Envelope Balance Guard: $M \le \text{Available}(e)$).
3. Initialize remaining needed $R = M$, and deductions map $\mathcal{D} = \{ \}$.
4. For each $(a, B_a) \in \mathcal{B}$:
   - Take $d_a = \min(B_a, R)$.
   - Record $\mathcal{D}[a] = d_a$.
   - $R \leftarrow R - d_a$.
   - If $R = 0$, break.
5. Apply atomic ledger changes:
   - For each account $a$ with $d_a > 0$:
     - Account total balance: $\text{TotalBalancePaise}(a) \leftarrow \text{TotalBalancePaise}(a) - d_a$.
     - Envelope backing hold: $\text{AllocationSourcePaise}(e, a, p) \leftarrow \text{AllocationSourcePaise}(e, a, p) - d_a$.
   - Envelope spent: $\text{SpentPaise}(e, p) \leftarrow \text{SpentPaise}(e, p) + M$.

---

## 3. Database Schema Changes

### Migration: `supabase/migrations/20261105000000_envelope_allocation_sources.sql`

```sql
-- 1. Create table for tracking account-level holds for envelope allocations
CREATE TABLE public.envelope_allocation_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    allocation_id UUID NOT NULL REFERENCES public.envelope_allocations(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(allocation_id, account_id)
);

-- 2. Indexes for high-performance balance querying
CREATE INDEX idx_alloc_sources_user_acc ON public.envelope_allocation_sources(user_id, account_id);
CREATE INDEX idx_alloc_sources_allocation ON public.envelope_allocation_sources(allocation_id);

-- 3. Row Level Security
ALTER TABLE public.envelope_allocation_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own allocation sources"
    ON public.envelope_allocation_sources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own allocation sources"
    ON public.envelope_allocation_sources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own allocation sources"
    ON public.envelope_allocation_sources FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own allocation sources"
    ON public.envelope_allocation_sources FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Initial Backfill: Seed allocation sources for existing active envelope allocations
-- Backfill using the user's primary/first active liquid account
INSERT INTO public.envelope_allocation_sources (user_id, allocation_id, account_id, amount_paise)
SELECT
    ea.user_id,
    ea.id,
    acc.id,
    ea.allocated_paise
FROM public.envelope_allocations ea
JOIN LATERAL (
    SELECT id FROM public.accounts a
    WHERE a.user_id = ea.user_id AND a.is_active = true
    ORDER BY a.created_at ASC
    LIMIT 1
) acc ON true
WHERE ea.allocated_paise > 0
ON CONFLICT (allocation_id, account_id) DO NOTHING;
```

---

## 4. Architecture & Component Changes

```
┌──────────────────────────────────────────────────────────────┐
│                    Envello Presentation                      │
│                                                              │
│  ┌────────────────────┐   ┌───────────────────────────────┐  │
│  │  AccountListModal  │   │     RecordTransactionModal    │  │
│  │  (Bank / Free /    │   │  (Payment: Bank vs Ghost      │  │
│  │   Held Balances)   │   │   Envelope + Breakdown Modal) │  │
│  └─────────┬──────────┘   └───────────────┬───────────────┘  │
│            │                              │                  │
│  ┌─────────▼──────────┐   ┌───────────────▼───────────────┐  │
│  │    AllocateModal   │   │      RevertConfirmModal       │  │
│  │  (Funding Sources  │   │  (Restores Bank Holds and     │  │
│  │   & Auto-Split)    │   │   Account Balances atomically)│  │
│  └─────────┬──────────┘   └───────────────┬───────────────┘  │
└────────────┼──────────────────────────────┼──────────────────┘
             │                              │
┌────────────▼──────────────────────────────▼──────────────────┐
│              Domain Calculations & API Layer                 │
│                                                              │
│  • src/lib/accounting/accountHolds.ts (Hold calculations)    │
│  • src/lib/accounting/greedyDeduction.ts (Largest-first)     │
│  • src/lib/api/envelopes.ts (Allocation sources CRUD)        │
│  • src/lib/api/transactions.ts (Ghost bank deduction & tx)   │
│  • src/lib/accounting/revertPolicy.ts (Reversion engine)     │
└──────────────────────────────────────────────────────────────┘
```

### 4.1 New & Modified Files

| File | Action | Purpose |
| :--- | :--- | :--- |
| `supabase/migrations/20261105000000_envelope_allocation_sources.sql` | `[NEW]` | Database schema for allocation sources & RLS policies. |
| `src/types/database.types.ts` | `[MODIFY]` | Add `envelope_allocation_sources` row/insert/update types. |
| `src/types/accounting.types.ts` | `[MODIFY]` | Extend `AccountSummary` with `allocatedPaise` & `unallocatedPaise`; add `AllocationSource`. |
| `src/lib/accounting/accountHolds.ts` | `[NEW]` | Pure calculation helpers for account allocated and unallocated balances. |
| `src/lib/accounting/greedyDeduction.ts` | `[NEW]` | Deterministic algorithm: sort backing accounts, deduct largest-first, generate payment breakdown. |
| `src/lib/accounting/greedyDeduction.test.ts` | `[NEW]` | Unit test suite verifying all greedy deduction and splitting invariants. |
| `src/lib/accounting/revertPolicy.ts` | `[MODIFY]` | Update reversion preview & ledger impact to restore account holds and bank debits. |
| `src/lib/accounting/revertPolicy.test.ts` | `[MODIFY]` | Invariant tests for multi-account reversion and refund safety. |
| `src/lib/api/accounts.ts` | `[MODIFY]` | Fetch accounts joined with current period allocation sources to compute allocated/unallocated. |
| `src/lib/api/envelopes.ts` | `[MODIFY]` | Upsert allocations with funding account sources; adjust sources on transfer. |
| `src/lib/api/transactions.ts` | `[MODIFY]` | Support ghost-bank envelope payment: greedy account deduction, multi-account ledger entries, guard direct bank spend against unallocated balance. |
| `src/components/transactions/EnvelopePaymentReceiptModal.tsx` | `[NEW]` | Post-transaction receipt modal: displays real-life bank payout breakdown with "Completed" & "Revert" buttons. |
| `src/components/transactions/RecordTransactionModal.tsx` | `[MODIFY]` | Update payment method selector: Bank Account (showing free balance) vs Envelope (ghost bank). Triggers receipt modal on envelope spend. |
| `src/components/envelopes/AllocateModal.tsx` | `[MODIFY]` | Add account funding picker: allocate budget backed by selected liquid account(s). |
| `src/components/accounts/AccountListModal.tsx` | `[MODIFY]` | Display Bank Balance, Reserved in Envelopes, and Free Unallocated Balance. |
| `src/components/cards-and-debts/RecordCardPaymentModal.tsx` | `[MODIFY]` | Enforce card repayments cannot exceed bank unallocated balance. |
| `src/components/cards-and-debts/RecordLoanPaymentModal.tsx` | `[MODIFY]` | Enforce debt repayments cannot exceed bank unallocated balance. |
| `src/hooks/useAccounts.ts` | `[MODIFY]` | Expose `totalUnallocatedPaise` and account-level allocated/unallocated getters. |

---

## 5. User Interaction Flows

### Flow A: Allocating to an Envelope
1. User clicks **"Set Budget"** on an envelope (e.g., "Groceries", currently ₹0).
2. [AllocateModal](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envello/src/components/envelopes/AllocateModal.tsx) opens.
3. User enters target allocation: ₹5,000.
4. The modal shows funding sources:
   - Primary Savings (Free: ₹12,000 | Total: ₹20,000)
   - Cash in Hand (Free: ₹3,000 | Total: ₹3,000)
5. User selects "Primary Savings" (or splits: ₹3,000 Primary Savings, ₹2,000 Cash).
6. On submit:
   - Envelope allocation becomes ₹5,000.
   - Primary Savings allocated hold increases by ₹5,000; its unallocated drops to ₹7,000 (total bank balance remains ₹20,000).

### Flow B: Spending via Envelope (Ghost Bank)
1. User opens **Record Transaction** (`Expense`).
2. Payment method options are categorized:
   - **Envelopes (Ghost Banks)**:
     - Spendable (Available: ₹10,000)
     - Groceries (Available: ₹5,000 — backed by HDFC ₹3,500, Cash ₹1,500)
     - Emergency (Protected Reserve)
   - **Liquid Accounts (Direct Bill / No Envelope)**:
     - HDFC Bank (Free: ₹7,000 | Total: ₹20,000)
     - Cash (Free: ₹3,000 | Total: ₹3,000)
   - **Credit Cards**
3. User selects **Groceries** as the payment method and enters ₹4,000 at "Supermarket".
4. Transaction engine runs `greedyDeduction`:
   - HDFC covers ₹3,500 (largest).
   - Cash covers remaining ₹500.
5. Transaction is recorded atomically:
   - HDFC balance decreases by ₹3,500; HDFC hold for Groceries drops by ₹3,500.
   - Cash balance decreases by ₹500; Cash hold for Groceries drops by ₹500.
   - Groceries envelope spent increases by ₹4,000.
6. **Receipt Prompt Appears**:
   - *"Expense recorded via Groceries envelope."*
   - *"To complete this in real life, withdraw/pay:"*
     - **HDFC Bank**: ₹3,500.00
     - **Cash in Hand**: ₹500.00
   - Action buttons:
     - `[Completed the Transaction]` (Dismisses prompt).
     - `[Revert this Transaction]` (Instantly rolls back all ledger entries, restores bank balances and envelope holds).

### Flow C: Direct Bank Spending Guard
1. User chooses payment method: "HDFC Bank (Direct)".
2. HDFC Bank has Total ₹20,000, but ₹15,000 is on hold for envelopes (Free = ₹5,000).
3. User enters ₹8,000.
4. Engine validates: ₹8,000 > ₹5,000 unallocated.
5. Error alert: *"Cannot spend ₹8,000 directly from HDFC Bank. You have ₹5,000 free unallocated funds (₹15,000 is reserved across your envelopes). Pay via an envelope or reallocate budget first."*

---

## 6. Risks, Edge Cases & Mitigations

| Risk / Edge Case | Impact | Mitigation |
| :--- | :--- | :--- |
| **Legacy / Existing Allocations without Sources** | Users with existing allocations might have unbacked envelopes. | Migration auto-backfills all existing allocations to the user's primary active liquid account. |
| **Account Deletion with Active Holds** | Deleting an account holding envelope funds could break allocations. | Foreign key `ON DELETE RESTRICT` on `account_id` in `envelope_allocation_sources`. UI blocks deletion with alert: *"Cannot delete account while it holds active envelope funds. Transfer allocations to another account first."* |
| **Month Rollover with Carryover** | What happens to account holds when an envelope carries over to next month? | When budget period rolls over, unspent carried over funds retain their account backing in the new period. |
| **Transaction Reversion Math Drift** | Reverting an expense must not leave orphan holds or unbalanced ledger entries. | Reversion analysis reads the original transaction entries (which record exact account IDs and amounts debited), restores those exact account balances, and updates the allocation sources atomically. |
| **Offline / Network Interruption during Split** | Partial failure when deducting from multiple accounts. | Atomic database transaction / Supabase RPC executes account updates and transaction entry inserts in a single transaction. |

---

## 7. Phased Implementation Roadmap

### Phase 1: Database Foundation & Domain Invariants
- Task 1.1: Migration for `envelope_allocation_sources` with RLS and initial backfill.
- Task 1.2: Update TypeScript types in `database.types.ts` and `accounting.types.ts`.
- Task 1.3: Create `accountHolds.ts` and `greedyDeduction.ts` with comprehensive unit test suite in Vitest.
- **Checkpoint 1**: 100% test pass on greedy deduction, account hold math, and allocation conservation.

### Phase 2: API & Ledger Integration
- Task 2.1: Update `src/lib/api/accounts.ts` to compute allocated and unallocated balances per account.
- Task 2.2: Update `src/lib/api/envelopes.ts` to manage allocation sources in `upsertEnvelopeAllocation` and transfers.
- Task 2.3: Update `src/lib/api/transactions.ts` to execute greedy multi-account deduction on envelope spend, log entries, and guard direct bank spend.
- Task 2.4: Update `src/lib/accounting/revertPolicy.ts` and reversion execution to restore account holds and bank balances.
- **Checkpoint 2**: Automated tests verify transaction creation, multi-account deduction, direct spend guard, and reversion roundtrips.

### Phase 3: UI Implementation
- Task 3.1: Create `EnvelopePaymentReceiptModal.tsx` for real-life payout instructions with "Completed" & "Revert" actions.
- Task 3.2: Update `RecordTransactionModal.tsx` to support Envelopes as Ghost Banks and Direct Bank spending with unallocated guards.
- Task 3.3: Update `AllocateModal.tsx` to allow selecting and splitting funding accounts.
- Task 3.4: Update `AccountListModal.tsx` to display Bank Balance, Envelope Holds, and Free Balance.
- Task 3.5: Update Credit Card & Loan payment modals to enforce unallocated balance limits.
- **Checkpoint 3**: Full end-to-end user verification across creation, allocation, envelope spending, receipt prompt, and reversion.

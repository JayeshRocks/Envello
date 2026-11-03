# Task Checklist: Account Holds, Multi-Account Envelope Allocation & Ghost-Bank Spending

## Phase 1: Database Foundation & Domain Invariants

- [x] **Task 1.1: Database Schema & Migration for Allocation Sources**
  - **Description:** Create SQL migration `supabase/migrations/20261105000000_envelope_allocation_sources.sql` with table `envelope_allocation_sources`, foreign keys, RLS policies, indexes, and an automatic backfill script for existing allocations.
  - **Acceptance criteria:**
    - Table enforces `amount_paise > 0` and unique constraint on `(allocation_id, account_id)`.
    - RLS permits only owning user (`auth.uid() = user_id`) to read/write.
    - Foreign key to accounts uses `ON DELETE RESTRICT` to prevent accidental deletion of funded accounts.
    - Existing allocations are backfilled using the user's primary liquid account.
  - **Verification:** Migration syntax verified and type generation checked.
  - **Dependencies:** None
  - **Files likely touched:** `supabase/migrations/20261105000000_envelope_allocation_sources.sql`
  - **Estimated scope:** S (1 file)

- [x] **Task 1.2: TypeScript Domain & Database Types**
  - **Description:** Update `src/types/database.types.ts` with `envelope_allocation_sources` types and extend `src/types/accounting.types.ts` with `allocatedPaise` & `unallocatedPaise` on `AccountSummary`, and `AllocationSourceRecord`.
  - **Acceptance criteria:**
    - Types strictly declare `allocatedPaise: bigint` and `unallocatedPaise: bigint`.
    - Database row types match migration schema.
  - **Verification:** `npm run lint` (`tsc -b`).
  - **Dependencies:** Task 1.1
  - **Files likely touched:** `src/types/database.types.ts`, `src/types/accounting.types.ts`
  - **Estimated scope:** S (2 files)

- [x] **Task 1.3: Pure Calculation Engines & Greedy Deduction Invariant Tests**
  - **Description:** Implement `src/lib/accounting/accountHolds.ts` (calculate unallocated and allocated account balances) and `src/lib/accounting/greedyDeduction.ts` (deterministic largest-first account deduction algorithm) with a dedicated Vitest suite `src/lib/accounting/greedyDeduction.test.ts`.
  - **Acceptance criteria:**
    - Deducts from largest backing account first; splits remainder across next largest in descending order.
    - Throws error if total available is less than requested amount.
    - Preserves integer paise conservation: $\sum \text{deductions} = \text{total expense}$.
    - Calculates `unallocatedPaise = totalPaise - allocatedPaise`.
  - **Verification:** `npm test src/lib/accounting/greedyDeduction.test.ts` passes 100%.
  - **Dependencies:** Task 1.2
  - **Files likely touched:** `src/lib/accounting/accountHolds.ts`, `src/lib/accounting/greedyDeduction.ts`, `src/lib/accounting/greedyDeduction.test.ts`
  - **Estimated scope:** M (3 files)

### Checkpoint 1: Foundation & Math Invariants
- [x] Schema migration created
- [x] Domain and database types compile clean
- [x] Greedy deduction and account hold tests pass with 100% assertions

---

## Phase 2: API Layer & Double-Entry Ledger Integration

- [x] **Task 2.1: Account API with Allocated/Unallocated Hold Calculations**
  - **Description:** Update `src/lib/api/accounts.ts` and `src/hooks/useAccounts.ts` to fetch allocation sources for the active budget period and attach `allocatedPaise` and `unallocatedPaise` to every account domain object.
  - **Acceptance criteria:**
    - `fetchAccounts` returns `allocatedPaise` and `unallocatedPaise` alongside `balancePaise`.
    - Account balance invariants hold: `balancePaise = allocatedPaise + unallocatedPaise`.
    - `useAccounts` exposes getters and total unallocated liquid funds.
  - **Verification:** Vitest account tests pass and TypeScript check passes.
  - **Dependencies:** Checkpoint 1
  - **Files likely touched:** `src/lib/api/accounts.ts`, `src/hooks/useAccounts.ts`
  - **Estimated scope:** S (2 files)

- [x] **Task 2.2: Envelope Allocation Sources CRUD & Transfer Support**
  - **Description:** Update `src/lib/api/envelopes.ts` to manage `envelope_allocation_sources` during `upsertEnvelopeAllocation` and budget transfers.
  - **Acceptance criteria:**
    - Allocations record backing account source(s).
    - Increasing an allocation validates backing account has sufficient unallocated balance.
    - Reducing an allocation proportionally reduces backing account holds, freeing unallocated money.
    - Envelope transfers (`transferBetweenEnvelopes`) shift backing account holds from source to destination.
  - **Verification:** Vitest envelope tests pass.
  - **Dependencies:** Task 2.1
  - **Files likely touched:** `src/lib/api/envelopes.ts`, `src/hooks/useEnvelopes.ts`
  - **Estimated scope:** M (2 files)

- [x] **Task 2.3: Ghost Bank Envelope Transactions & Direct Spend Guards**
  - **Description:** Update `src/lib/api/transactions.ts` (`recordExpenseTransaction`) to support paying from an Envelope (Ghost Bank) with greedy multi-account deduction, and strictly guard direct account spending against `unallocatedPaise`.
  - **Acceptance criteria:**
    - Envelope payment runs greedy deduction across backing accounts, debits each account for its share, decrements its allocation hold, and records explicit double-entry transaction entries.
    - Direct account spend rejects any amount exceeding the account's unallocated balance.
    - Returns deduction breakdown for real-life settlement prompt.
  - **Verification:** Vitest transaction invariants tests pass.
  - **Dependencies:** Task 2.2
  - **Files likely touched:** `src/lib/api/transactions.ts`
  - **Estimated scope:** M (2 files)

- [x] **Task 2.4: Multi-Account Reversion & Refund Restoration**
  - **Description:** Update `src/lib/accounting/revertPolicy.ts` and transaction deletion logic to preview and execute multi-account refunds, restoring debited funds to accounts and restoring allocation holds to envelopes.
  - **Acceptance criteria:**
    - Reversion preview displays exact refund amounts for every debited account.
    - Reversion execution restores account balances and envelope allocation holds atomically.
    - Zero calculation drift; all 95+ unit tests remain passing.
  - **Verification:** `npm test src/lib/accounting/revertPolicy.test.ts` passes 100%.
  - **Dependencies:** Task 2.3
  - **Files likely touched:** `src/lib/accounting/revertPolicy.ts`, `src/lib/accounting/revertPolicy.test.ts`
  - **Estimated scope:** M (2 files)

### Checkpoint 2: API & Ledger Consistency
- [x] Accounts compute allocated and unallocated balances
- [x] Envelopes store and update backing account sources
- [x] Ghost bank transactions debit underlying accounts and adjust holds
- [x] Reversions restore multi-account funds and holds cleanly

---

## Phase 3: User Interface & Real-Life Settlement Prompt

- [ ] **Task 3.1: Post-Transaction Real-Life Settlement Prompt Modal**
  - **Description:** Create `src/components/transactions/EnvelopePaymentReceiptModal.tsx` showing the real-world account breakdown after an envelope payment, with "Mark as completed" and "Revert this Transaction" buttons.
  - **Acceptance criteria:**
    - Displays each account name and formatted deduction amount in Indian numbering format.
    - Explains clearly: *"Take/spend this much from each bank in real life to match your digital ledger."*
    - "Mark as completed" dismisses cleanly.
    - "Revert this Transaction" triggers immediate 1-click reversion and informs user.
    - Follows design system: glassmorphic elevation, 44px touch targets, centered ModalPortal.
  - **Verification:** Component renders properly, touch interactions responsive.
  - **Dependencies:** Checkpoint 2
  - **Files likely touched:** `src/components/transactions/EnvelopePaymentReceiptModal.tsx`
  - **Estimated scope:** M (1 file)

- [ ] **Task 3.2: Record Transaction Modal Overhaul (Ghost Banks & Direct Accounts)**
  - **Description:** Update `src/components/transactions/RecordTransactionModal.tsx` to let users choose payment source between: 1) Envelopes (Ghost Banks), 2) Direct Bank Accounts (with unallocated indicators), or 3) Credit Cards.
  - **Acceptance criteria:**
    - Envelopes are selectable as primary payment sources.
    - Direct bank accounts display free unallocated balance (`HDFC Bank • Free: ₹20,000 | Total: ₹50,000`).
    - Disallows direct spend exceeding unallocated balance.
    - Triggers `EnvelopePaymentReceiptModal` on successful envelope expense.
  - **Verification:** Form validates all modes and touch targets pass ergonomics.
  - **Dependencies:** Task 3.1
  - **Files likely touched:** `src/components/transactions/RecordTransactionModal.tsx`
  - **Estimated scope:** M (1 file)

- [ ] **Task 3.3: Allocate Modal Multi-Account Funding Selector**
  - **Description:** Update `src/components/envelopes/AllocateModal.tsx` to allow selecting which liquid account funds the envelope allocation, showing each account's free and total balance.
  - **Acceptance criteria:**
    - Lists active liquid accounts with free and total balances.
    - Prevents allocating more than available unallocated funds in the selected account(s).
    - Supports auto-assigning from the account with the most free funds.
  - **Verification:** Modal correctly updates allocations and respects unallocated limits.
  - **Dependencies:** Task 2.2
  - **Files likely touched:** `src/components/envelopes/AllocateModal.tsx`
  - **Estimated scope:** S (1 file)

- [ ] **Task 3.4: Account List & Overview Balance Breakdown**
  - **Description:** Update `src/components/accounts/AccountListModal.tsx` and dashboard summary cards to display the 3-tier balance taxonomy: Bank Balance, Envelope Holds, and Free Balance.
  - **Acceptance criteria:**
    - Each account card shows: Bank Balance (actual physical balance), Reserved in Envelopes, and Free Unallocated.
    - Visual indicators in emerald/sky for free funds and neutral/purple for envelope holds.
    - Prevents deleting an account that has active envelope holds with clear explanatory toast.
  - **Verification:** Visual layout responsive on mobile and desktop without overflow.
  - **Dependencies:** Task 2.1
  - **Files likely touched:** `src/components/accounts/AccountListModal.tsx`, `src/components/dashboard/BalanceOverview.tsx`
  - **Estimated scope:** M (2 files)

- [ ] **Task 3.5: Card & Debt Payment Unallocated Guard**
  - **Description:** Update `RecordCardPaymentModal.tsx` and `RecordLoanPaymentModal.tsx` so users cannot select a bank account that lacks sufficient unallocated funds to cover the debt payment.
  - **Acceptance criteria:**
    - Payment dropdowns display each account's free unallocated balance.
    - Disallows paying credit card bills or loans using funds earmarked for envelope reserves.
  - **Verification:** Card and debt repayment forms block overspending reserved funds.
  - **Dependencies:** Task 3.2
  - **Files likely touched:** `src/components/cards-and-debts/RecordCardPaymentModal.tsx`, `src/components/cards-and-debts/RecordLoanPaymentModal.tsx`
  - **Estimated scope:** S (2 files)

### Checkpoint 3: End-to-End Verification & Definition of Done
- [ ] All unit and invariant tests pass (`npm test`)
- [ ] TypeScript compiles with 0 errors (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] User testing: Allocation hold placement, ghost bank envelope spending, receipt prompt, and reversion flow

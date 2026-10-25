# Envello — Quality Assurance & Testing Strategy

## 1. Testing Philosophy

Because Envello manages real personal financial records, testing is not an afterthought — it is the primary guarantee of mathematical correctness and data privacy. Every accounting calculation, RLS policy, and balance state must be verifiable through automated tests or rigorous verification procedures.

---

## 2. Test Pyramid & Tooling

```text
       ▲
      / \        E2E & Smoke Verification (Manual + Browser Subagent)
     /   \       ----------------------------------------------------
    /     \      Integration & RLS Policy Tests (Supabase Local Test Runner)
   /       \     -----------------------------------------------------------
  /_________\    Unit Tests: Accounting Engine & Invariants (Vitest, 100% Coverage)
```

- **Unit Testing**: Vitest for fast, pure TypeScript unit testing of `src/lib/accounting/`.
- **Database & RLS Testing**: Supabase local test suite using `pgTAP` or automated TypeScript integration tests checking cross-user isolation.
- **Static Analysis**: TypeScript strict type checking (`tsc -b`) and ESLint.

---

## 3. Accounting Invariant Test Suite

The accounting engine must satisfy the following critical test assertions:

### 3.1 Currency & Precision Arithmetic
- [ ] `toPaise(0.1) + toPaise(0.2) === toPaise(0.3)` (Zero floating-point rounding errors).
- [ ] `toRupees(150005n) === 1500.05` (Accurate division without drift).
- [ ] Large balance calculations (e.g. ₹50,00,000.00 / 500,000,000 paise) execute without integer overflow.

### 3.2 Transfer Conservation
- [ ] When transferring ₹5,000 from Bank A to Bank B:
  - Bank A balance decreases by exactly 500,000 paise.
  - Bank B balance increases by exactly 500,000 paise.
  - Net spendable cash across all accounts remains identical before and after the transfer.
  - Total recorded consumption (expenses) remains ₹0.

### 3.3 Credit Card Accounting
- [ ] Card purchase of ₹1,200 increases card outstanding balance by 120,000 paise and deducts from the specified envelope. Spendable bank cash is untouched.
- [ ] Card statement repayment of ₹12,000 deducts 1,200,000 paise from the bank account and decreases card liability by 1,200,000 paise.
- [ ] Card repayment is NOT registered as a secondary expense in monthly spending reports.
- [ ] Card utilization percentage calculates accurately:
  - Limit: ₹1,00,000; Balance: ₹29,000 -> `29%` (Normal/Green).
  - Limit: ₹1,00,000; Balance: ₹31,000 -> `31%` (Warning threshold triggered).

### 3.4 Envelope Budgeting & Rollovers
- [ ] Sum of (Envelope Balances + Unallocated Cash) === Total Spendable Bank Cash.
- [ ] Rollover policy `carry_forward` preserves unspent balance into the next month.
- [ ] Rollover policy `sweep_to_regular` sweeps unspent balance into the Regular envelope.
- [ ] Emergency Envelope Protection: No deficit in Regular, Outing, or Gym can automatically debit funds from Emergency. Any Emergency debit requires explicit confirmation.

### 3.5 Self EMIs vs Actual Debts
- [ ] Self EMI: Repaying ₹5,000 monthly reduces remaining Self EMI balance and increases savings reserve. Does not count as an expense.
- [ ] Actual Debt: Repaying ₹10,000 reduces debt liability and records interest expense if applicable.

---

## 4. Row Level Security (RLS) Verification

Before any code enters staging:
1. **Unauthenticated Access Test**:
   - Query all tables anonymously. Expect `[]` (empty set) or `401 Unauthorized`.
2. **Cross-User Isolation Test**:
   - Create User A (id: `user-a`) with accounts and transactions.
   - Authenticate as User B (id: `user-b`).
   - Attempt to query User A's account balances by passing User A's `id`.
   - Expect `[]` or `404 Not Found`. RLS must block reads.
   - Attempt to update or delete User A's account or transactions.
   - Expect `0 rows affected` or error. RLS must block writes.
3. **Private Beta Gating Test**:
   - Authenticate with a Google account not present in `allowed_users`.
   - Verify profile is flagged `is_allowlisted = false`.
   - Verify financial tables return zero records.

---

## 5. Pre-Release Verification Checklist

Run through this checklist prior to any release:
- [ ] `npm run lint` passes with 0 warnings.
- [ ] `npm run build` succeeds cleanly.
- [ ] `npm run test` passes with 100% test success rate on accounting math.
- [ ] Visual inspection of dark and light modes.
- [ ] Financial figures formatted correctly in Indian numbering (`₹1,50,000.00`).
- [ ] Browser console has 0 errors or warnings.

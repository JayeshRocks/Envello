---
description: Systematically diagnose bugs, test edge cases, and verify accounting invariants in Envello.
---

# Test and Debug Workflow

## Purpose
Root-cause analysis and systematic testing of accounting invariants, ledger reconciliation, and edge cases in Envello.

---

## 1. Issue Reproduction & Context Gathering
1. Capture the exact steps to reproduce the unexpected behavior.
2. Note input values, account balances, envelope states, and date ranges.
3. Inspect browser console logs and Supabase network response payloads.
4. Formulate a test case reproducing the bug before touching application code.

---

## 2. Accounting & Invariant Verification Checks
Verify that the bug does not violate core accounting invariants:
- **Zero-Sum Ledger**: In an account-to-account transfer, debit amount == credit amount.
- **Envelope Math**: Sum of allocated envelope funds + unallocated cash == total spendable cash.
- **Credit Card Liability**: Card purchases increase liability; card repayments decrease liability without counting as duplicate expenses.
- **Self EMI Reconciliation**: Reimbursements reduce outstanding Self EMI balance and return funds to savings.
- **No Float Errors**: Run calculations through integer paise arithmetic to verify rounding correctness.

---

## 3. Systematic Fix & Regression Guard
1. Apply the minimal root-cause fix.
2. Ensure the fix does not suppress errors or introduce temporary workarounds.
3. Write or update a unit test covering the reproduced edge case.
4. Run static analysis (`npm run lint`) and type check (`npm run build`).

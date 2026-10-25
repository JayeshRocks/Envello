# Code Quality & Verification Rules

## Purpose
Enforce rigorous engineering standards, verification-driven development, and zero-defect deployments for Envello.

---

## 1. Verification-Driven Definition of Done

Code changes are never considered complete simply because files were written. Every task must pass the full verification pipeline:

```text
Plan  -->  Implement  -->  Lint  -->  Typecheck  -->  Verify Runtime  -->  Ship
```

- **Static Analysis**: `npm run lint` must pass with zero errors and zero warnings.
- **Type Checking**: `npm run build` or `npx tsc -b` must compile with zero errors.
- **Empirical Verification**: Run the application locally and empirically verify:
  - Form submission and validation states.
  - Accounting balance calculation accuracy.
  - Empty, loading, and error states.
  - Dark mode and light mode visual contrast.

---

## 2. Error Handling & Console Discipline

- **No Swallowed Exceptions**: Never use empty `catch` blocks or suppress error logging without providing fallback UI and user feedback.
- **Clean Console**: Code in production must not log unhandled exceptions, unhandled promise rejections, or React key warnings.
- **Auditable Failures**: Database and RPC failures must return actionable error codes that the UI can translate into clear instructions for the user.

---

## 3. Preservation of Invariants & API Contracts

- **No Breaking Ledger Changes**: Schema changes must preserve ledger history and never alter historic transaction records.
- **Refactoring Safety**: Before modifying an accounting or calculation utility, verify its existing test suite and ensure backward compatibility.

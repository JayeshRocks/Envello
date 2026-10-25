# Envello — Architecture Decision Records (ADRs)

This document records the foundational architectural, security, and financial design decisions for Envello.

---

## ADR-001: Supabase PostgreSQL with Native Row Level Security (RLS)

- **Status**: Accepted
- **Context**: Envello requires a secure, relational database to maintain financial records, balances, foreign keys, and audit trails. The solution must support multi-tenant isolation and fit within a ₹0/month operational budget.
- **Decision**: Use Supabase Free tier (PostgreSQL 15+). Enforce authorization at the database level using Row Level Security (`auth.uid() = user_id`) on 100% of tables. Use PostgreSQL stored procedures (RPCs) for multi-table atomic operations (e.g. transfers, repayments).
- **Consequences**:
  - *Positive*: Unrivaled security. Even if a client request is tampered with, PostgreSQL blocks unauthorized access at the storage layer. Relational integrity ensures no orphaned transaction records.
  - *Trade-off*: Schema modifications require formal SQL migrations rather than runtime ORM auto-sync.

---

## ADR-002: Google OAuth 2.0 via Supabase Auth

- **Status**: Accepted
- **Context**: The owner needs frictionless, secure authentication without maintaining custom password hashing, credential databases, email verification flows, or password reset tokens.
- **Decision**: Use Supabase Auth configured exclusively with Google OAuth. Rely on Supabase's secure browser session and token refresh handling.
- **Consequences**:
  - *Positive*: Zero credential management liability; robust protection against brute-force password attacks.
  - *Trade-off*: Requires setting up Google Cloud Console OAuth consent and registering redirect URIs.

---

## ADR-003: Monetary Calculations Using Integer Paise and PostgreSQL `BIGINT` / `NUMERIC`

- **Status**: Accepted
- **Context**: IEEE 754 binary floating-point arithmetic introduces rounding inaccuracies (e.g., `0.1 + 0.2 === 0.30000000000000004`). In a personal finance tool, even a one-paisa error destroys user trust.
- **Decision**: Represent all monetary quantities in the application logic as integer paise (`1 Rupee = 100 Paise`). In PostgreSQL, store monetary columns as `BIGINT` or `NUMERIC(12, 2)`. Prohibit `FLOAT`, `REAL`, or `DOUBLE PRECISION`.
- **Consequences**:
  - *Positive*: Exact mathematical determinism across all operations. Zero rounding drift over years of ledger history.
  - *Trade-off*: Requires explicit conversion helpers (`toPaise`, `toRupees`) when accepting input or formatting UI displays.

---

## ADR-004: Pure Deterministic Domain Engine with Database Source of Truth

- **Status**: Accepted
- **Context**: Balance calculations must be instant in the UI while guaranteeing that the database remains the immutable source of truth.
- **Decision**: Implement a pure TypeScript domain calculation library (`src/lib/accounting/`) that is framework-agnostic and 100% unit-tested. The database enforces constraints and records transactions; the client domain engine calculates projected balances, rollovers, and credit card utilization percentages.
- **Consequences**:
  - *Positive*: Blazing fast UI updates with complete testability; domain logic is decoupled from React components.
  - *Trade-off*: Business logic invariants must be mirrored between client TypeScript helpers and PostgreSQL RPC constraints.

---

## ADR-005: Explicit Deferral of AI Features to Version 2

- **Status**: Accepted
- **Context**: While future AI features (natural language entry, receipt OCR, conversational queries) are attractive, building them prematurely adds non-deterministic behavior, cost, and complexity before the core accounting engine is proven.
- **Decision**: Explicitly defer all AI capabilities to Version 2. Version 1 must be 100% feature-complete, reliable, and delightful on its own.
- **Consequences**:
  - *Positive*: Eliminates third-party API subscription costs (protects the ₹0 budget); keeps the initial architecture robust, deterministic, and lean.
  - *Trade-off*: Users manually enter transactions in V1 via structured forms.

---

## ADR-006: Server-Enforced Allowlist for Private Beta Gating

- **Status**: Accepted
- **Context**: Envello will be initially tested by a single owner for several months. While hosted on a public URL, arbitrary internet users who sign in via Google OAuth must not access the financial workspace.
- **Decision**: Enforce access gating on the server side via an `allowed_users` table and profile verification trigger. Unauthorized Google accounts receive a restricted screen with zero access to financial tables. Never use client-side email comparisons.
- **Consequences**:
  - *Positive*: Airtight privacy. Public hosting is safe because unauthorized users cannot query or mutate data.
  - *Trade-off*: Adding a second beta user in the future requires adding their email to the `allowed_users` table.

---

## ADR-007: Styling System: Tailwind CSS with Glassmorphism Design Tokens

- **Status**: Accepted
- **Context**: The UI must look like an elite fintech application, offering high contrast, visual elevation, dark and light modes, and distinct financial colors.
- **Decision**: Use Tailwind CSS paired with custom CSS semantic variables for financial surfaces (`surface-container`, `emerald-surplus`, `coral-liability`, `backdrop-blur`).
- **Consequences**:
  - *Positive*: Rapid responsive UI development, zero runtime CSS overhead, accessible contrast ratios.
  - *Trade-off*: Requires diligent use of explicit dark mode hover states to prevent text invisibility.

---

## ADR-008: ₹0/Month Cost Target via Vercel Hobby and Supabase Free

- **Status**: Accepted
- **Context**: Personal projects should not incur monthly recurring costs.
- **Decision**: Architect the system to comfortably live within Vercel Hobby and Supabase Free tier quotas. Never add paid APIs, external database add-ons, or hosting upgrades.
- **Consequences**:
  - *Positive*: Zero ongoing financial overhead for the owner.
  - *Trade-off*: Requires keeping database storage, compute, and asset bandwidth optimized.

# Envello — Architecture & System Design

## 1. System Overview

Envello is architected as a secure, zero-cost, high-reliability personal finance application. It couples a modern client-side single-page application (React 19, TypeScript, Vite) with a robust cloud-native relational database (Supabase PostgreSQL, Supabase Auth, Row Level Security).

```mermaid
graph TD
    User([User Browser])
    Vercel[Vercel Hobby Edge CDN]
    SupaAuth[Supabase Auth / Google OAuth]
    SupaDB[(Supabase PostgreSQL)]
    RLS[Row Level Security Engine]
    RPC[PostgreSQL Stored Procedures / RPC]

    User -->|HTTPS Asset Request| Vercel
    User -->|Google OAuth 2.0| SupaAuth
    User -->|Authenticated PostgREST / RPC Requests| RLS
    RLS -->|Enforced User Isolation auth.uid()| SupaDB
    RPC -->|Atomic Multi-Table Transactions| SupaDB
```

---

## 2. Technology Stack & Hosting Topology

| Layer | Technology | Host / Provider | Cost Target |
| :--- | :--- | :--- | :--- |
| **Frontend SPA** | React 19, TypeScript, Vite, Tailwind CSS | Vercel Hobby Tier | ₹0 / month |
| **Authentication** | Supabase Auth (Google OAuth 2.0) | Supabase Free Tier | ₹0 / month |
| **Database** | PostgreSQL 15+ (PostgREST, RPCs) | Supabase Free Tier | ₹0 / month |
| **Security Layer** | Row Level Security (RLS) + DB Constraints | PostgreSQL Native | ₹0 / month |
| **Icons & Charts**| Lucide React, Recharts / Chart.js | Bundled Client Side | Open Source |

---

## 3. Client-Side Software Architecture

The frontend is strictly partitioned into four decoupled layers to ensure accounting determinism, testability, and UI stability:

```text
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   (React Components, Form Inputs, Skeletons, Charts)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Hooks & UI State                    │
│      (Custom Hooks, Local State, Modal Controllers)     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               Domain & Accounting Engine               │
│   (Pure Integer Math, Paise Conversions, Invariants)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Data Access Layer                    │
│      (Supabase Client, PostgREST Queries, RPC Calls)    │
└────────────────────────────────────────────────────────┘
```

### 3.1 Presentation Layer (`src/components/`, `src/pages/`)
- Pure UI components adhering to the design system.
- Zero direct database queries or raw accounting equations.
- Handles responsive layouts, theme switching (dark/light), and accessible interaction states (loading, empty, error, success).

### 3.2 Hooks & UI State Layer (`src/hooks/`)
- Encapsulates React state, data fetching, mutations, and optimistic updates.
- Centralizes user session context and active budget period context.

### 3.3 Domain & Accounting Engine (`src/lib/accounting/`)
- Framework-agnostic pure TypeScript functions.
- All operations are performed using integer paise (`toPaise`, `toRupees`).
- Validates accounting invariants (e.g. transfer balancing, utilization percentage calculation, envelope rollover calculations).
- 100% unit-tested with Vitest.

### 3.4 Data Access Layer (`src/services/`, `src/lib/api/`)
- Wraps Supabase client PostgREST calls and RPC invocations.
- Validates all outgoing and incoming payloads against Zod schemas.
- Maps database error codes to clear, actionable application error objects.

---

## 4. Backend & Database Architecture

### 4.1 Row Level Security (RLS)
The database enforces authorization natively:
- RLS is enabled on all tables without exception.
- Policies evaluate `auth.uid() = user_id`.
- The database rejects unauthenticated or cross-tenant reads, inserts, updates, and deletes at the storage layer.

### 4.2 Atomic Multi-Table Procedures (RPCs)
For operations requiring double-sided updates or state invariants (e.g. account transfers, envelope reallocations, credit card repayments):
- Logic is encapsulated in PostgreSQL stored procedures (`SECURITY INVOKER` or audited `SECURITY DEFINER`).
- Functions execute within an atomic transaction. A failure on either side initiates an immediate rollback, preventing partial financial entries.

### 4.3 Database Auditability
- Core transaction tables include audit columns (`created_at`, `updated_at`).
- An `audit_logs` table logs significant administrative and reconciliation adjustments with timestamp, acting user ID, and before/after values.

---

## 5. Security & Authentication Architecture

1. **OAuth Flow**:
   - Google OAuth initiates via `supabase.auth.signInWithOAuth({ provider: 'google' })`.
   - Google redirects to Supabase Auth callback.
   - Supabase establishes JWT session in the browser.
2. **Private Beta Allowlist**:
   - Access to the financial workspace requires verification against a server-side allowlist.
   - If an unauthorized Google user logs in, they are placed in a quarantined state with no access to any financial tables.
3. **Secret Isolation**:
   - Client code only possesses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   - `SUPABASE_SERVICE_ROLE_KEY` is strictly excluded from client builds.

---

## 6. Zero-Cost Infrastructure Discipline

To maintain ₹0/month operating cost:
- Stay well within Supabase Free tier quotas (500 MB database size, 50,000 monthly active users, 5 GB egress).
- Stay within Vercel Hobby bandwidth and build minute limits.
- Optimize asset bundles via Vite tree shaking, code splitting, and direct SVG icon imports.
- Use PostgreSQL indexes to maintain sub-50ms query latency, minimizing compute resource usage.

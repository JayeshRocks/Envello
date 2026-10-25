# Envello — Security & Threat Modeling Specification

## 1. Security Philosophy

Because Envello stores real financial data, security and confidentiality take absolute precedence over development velocity. The architecture operates under a **Zero-Trust Model**: no client-side request or identity assertion is trusted without cryptographic verification and database-enforced authorization.

---

## 2. Threat Modeling & Mitigation Strategy

| Threat Vector | Description | Envello Mitigation |
| :--- | :--- | :--- |
| **Cross-User Data Leak (IDOR)** | Attacker alters an ID in a request to view or edit another user's financial ledger. | **PostgreSQL RLS**: Every query enforces `auth.uid() = user_id`. Client cannot supply an arbitrary owner ID. |
| **Unauthorized Registration** | An arbitrary Google user signs in via OAuth to access the application. | **Server-Enforced Allowlist**: Profiles trigger checks against `allowed_users`. Unlisted users receive no workspace access. |
| **Client Key Compromise** | Exposure of client-side configuration tokens (`VITE_SUPABASE_ANON_KEY`). | **Least-Privilege RLS**: The anon key has zero privileges outside what an authenticated JWT with RLS permits. |
| **Service Role Leakage** | Backend root keys accidentally bundled into frontend code. | **Strict Architectural Prohibition**: `SUPABASE_SERVICE_ROLE_KEY` is forbidden in frontend code and `VITE_*` variables. |
| **SQL Injection** | Malicious inputs injected into database queries. | **PostgREST Parameterization**: All queries use parameterized PostgREST APIs or strongly typed PL/pgSQL parameters. |
| **Cross-Site Scripting (XSS)** | Malicious scripts injected into transaction notes or payees. | **React HTML Escaping + Zod Sanitization**: All user strings are validated, trimmed, and escaped prior to rendering. |
| **Floating-Point Rounding** | Inaccurate balances resulting from IEEE 754 binary floating point. | **Integer Arithmetic**: All monetary calculations operate in integer paise (`BIGINT` / `toPaise`). |

---

## 3. Authentication Architecture (Google OAuth)

### 3.1 OAuth Flow
1. User clicks "Continue with Google".
2. Supabase Auth initiates OAuth 2.0 PKCE flow with Google identity servers.
3. User authenticates with Google credentials.
4. Google redirects to the registered Supabase callback URL.
5. Supabase issues a cryptographically signed JWT containing `sub` (the immutable Supabase user ID) and user email.
6. Frontend initializes Supabase client session from securely stored tokens.

### 3.2 Authorized Redirect URIs
Allowed redirect URIs must be explicitly whitelisted in Google Cloud Console and Supabase Dashboard:
- **Local Development**: `http://localhost:5173/` and `http://localhost:5173/auth/callback`
- **Vercel Production**: `https://<custom-domain>/` and `https://<custom-domain>/auth/callback`
- Wildcards are strictly prohibited.

---

## 4. Private Beta Gating (Server-Enforced Allowlist)

The private beta is restricted to the owner:

```mermaid
sequenceDiagram
    autonumber
    actor Owner as User Browser
    participant Auth as Supabase Auth (Google)
    participant DB as PostgreSQL (Profiles & Allowlist)
    
    Owner->>Auth: Authenticate with Google
    Auth->>DB: Check if user email is in allowed_users
    alt Email is on allowlist
        DB-->>Auth: Profile created with is_allowlisted = true
        Auth-->>Owner: Session issued; full workspace access
    else Email NOT on allowlist
        DB-->>Auth: Profile created with is_allowlisted = false
        Auth-->>Owner: Session restricted; "Access Restricted" screen shown; RLS blocks data
    end
```

### Server Enforcement Rules:
1. Gating is enforced via PostgreSQL RLS policies or database triggers.
2. The user's email address is checked against the `allowed_users` table during initial login.
3. Client-side checks (e.g. `if (user.email === 'owner@example.com')`) are forbidden as an authorization mechanism.

---

## 5. Row Level Security (RLS) Policy Standards

- Every user-owned table has RLS explicitly enabled:
  ```sql
  ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
  ```
- Every operation (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) has an explicit policy.
- All policies strictly evaluate `auth.uid() = user_id`.
- Foreign key joins do not circumvent RLS; child tables (`transaction_entries`, `credit_card_statements`) enforce their own RLS policies.

---

## 6. Secret Management & Environment Boundaries

- **Public Frontend Tokens**:
  - `VITE_SUPABASE_URL`: Public endpoint.
  - `VITE_SUPABASE_ANON_KEY`: Public anonymous key.
- **Forbidden in Frontend**:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Database connection strings with passwords
  - Google Client Secrets
- **Version Control Rules**:
  - `.env`, `.env.local`, `.env.production` are strictly gitignored.
  - Only `.env.example` containing non-sensitive placeholder templates is tracked.

---

## 7. Pre-Launch Security Checklist

Before transitioning from private beta to wider release:
- [ ] Confirm RLS is enabled on 100% of tables.
- [ ] Verify cross-user isolation by attempting to query user A records using user B session.
- [ ] Validate that unauthenticated requests return empty sets or HTTP 401/403.
- [ ] Confirm no secrets exist in Git history or client-side bundles.
- [ ] Run `npm audit` and ensure zero high/critical dependency vulnerabilities.
- [ ] Verify input sanitization on transaction descriptions, category names, and notes.
- [ ] Ensure account deletion functionality securely purges all user-owned records (GDPR/privacy compliance).

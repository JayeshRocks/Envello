# Security & Privacy Rules

## Purpose
Enforce zero-trust architecture, strict Row Level Security (RLS), private beta gating, and credential isolation in Envello.

---

## 1. Zero-Trust Database Authorization (RLS)

- **RLS Enabled Universally**: Every table, view, and storage bucket created in Supabase MUST have `ENABLE ROW LEVEL SECURITY;` activated.
- **Never Trust Client `user_id`**:
  - Never allow client code to supply a `user_id` in request payloads to prove ownership.
  - In all PostgreSQL RLS policies, use `auth.uid() = user_id`.
  - For insert policies, enforce `WITH CHECK (auth.uid() = user_id)`.
  - In update/delete policies, enforce `USING (auth.uid() = user_id)`.
- **Foreign Key Isolation**: When fetching related records (e.g. transactions under an account), ensure all joined tables also enforce user isolation so ID tampering cannot leak cross-user data.
- **Least-Privilege PostgreSQL Function Grants**: In PostgreSQL, `CREATE FUNCTION` automatically grants `EXECUTE` to `PUBLIC`. For every function, explicitly revoke execution from `PUBLIC` and `anon`. Any `SECURITY DEFINER` function that accesses or purges data MUST assert caller identity (`auth.uid() = target_id OR auth.role() = 'service_role'`) and enforce `SET search_path = public, auth` (or `''`) to prevent search path hijacking.

---

## 2. Google OAuth & Session Management

- **Official OAuth Flow**: Use Supabase Auth with Google provider.
- **Redirect URI Whitelist**: All OAuth redirect URLs must be strictly registered in the Supabase Dashboard and Google Cloud Console.
- **Session Handling**: Rely on the Supabase client library session storage. Do not invent custom cookie or session tokens.
- **Token Freshness**: Handle expired sessions gracefully with automatic token refresh or clean redirect to the login screen without leaking cached financial figures.

---

## 3. Private Beta Access Gating

- **Server-Enforced Allowlist**:
  - The application is in private beta for the single owner.
  - New Google OAuth accounts must NOT automatically receive a financial workspace or read access.
  - Access gating must be checked at the database/edge level (e.g. an `allowed_users` table with RLS or an Edge Function check).
  - NEVER implement gating via client-side email comparisons in JavaScript, as client code can be easily manipulated.

---

## 4. Secret & Credential Isolation

- **No Secrets in Git**: Never commit `.env`, `.env.local`, `.pem`, `.key`, or database dumps.
- **Client Key Boundaries**:
  - `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_URL` are public. Treat them as unprivileged entry points protected solely by RLS.
  - `SUPABASE_SERVICE_ROLE_KEY` is a root secret. NEVER prefix it with `VITE_` and NEVER import or reference it in frontend code.
- **Zero Log Leakage**: Never log user credentials, auth tokens, bank account numbers, or sensitive financial data in browser console logs or error trackers.
- **Production Debug Mode Stripping**: Production builds must strip console and debugger statements via bundler optimization (`esbuild.drop`), disable sourcemaps, and conceal raw system error messages in React Error Boundaries to prevent information disclosure.
- **Security Headers & Network Isolation**: Enforce Strict-Transport-Security (HSTS), Content-Security-Policy (CSP), Cross-Origin-Opener-Policy (COOP), Cross-Origin-Resource-Policy (CORP), and Permissions-Policy in production headers and meta tags.

---

## 5. Input Validation & Defense in Depth

- **Strict Schema Validation**: Validate all client inputs (amounts, account IDs, envelope types, dates) using a runtime schema validator (such as Zod) before sending queries to Supabase.
- **Parameterized SQL**: Always use Supabase PostgREST client methods or parameterized SQL queries in migrations/RPCs. Never construct dynamic raw SQL strings from user inputs.
- **Sanitized Presentation**: Escape or sanitize all user-supplied descriptions and notes to prevent Cross-Site Scripting (XSS).
- **Client Rate Limiting & Cooldown Protection**: Sensitive operations (login, signup, password resets, verification emails, deletion requests) must implement client-side throttling with exponential backoff cooldowns to protect API quotas and prevent brute force attacks.

---

## 6. Legal & Regulatory Compliance (Terms, Privacy, & OAuth Verification)

- **Mandatory Public Compliance Endpoints**: Maintain public, crawlable Privacy Policy and Terms of Service endpoints accessible via clean paths (`/privacy`, `/terms`) and hash fragments (`/#privacy`, `/#terms`).
- **OAuth Consent Transparency**: All OAuth consent forms (such as Google Cloud Console OAuth verification) must link directly to these published endpoints.
- **Regulatory Disclaimers**: Explicitly state that Envello is a personal budgeting and financial tracking software utility, not a licensed broker, registered investment advisor, or banking institution.
- **Sub-Processor Transparency**: Publicly disclose all third-party sub-processors (Supabase, Resend, Vercel, Google OAuth) handling user credentials or ledger entries.
- **User Data Rights**: Preserve absolute user ownership of data, including in-app CSV/JSON data export and an explicit account deletion process with a 30-day grace period before irreversible database purge.
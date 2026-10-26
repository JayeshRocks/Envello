# Security Policy

## 🔒 Supported Versions

We actively maintain and provide security patches for the following versions of Envello:

| Version | Supported          |
| :---    | :---               |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## 🛡️ Security Architecture & Principles

Envello takes data confidentiality and financial accounting security seriously:

1. **Strict Row Level Security (RLS)**: Row Level Security is enforced on 100% of tables in PostgreSQL. Users cannot read, write, update, or delete records belonging to any other user.
2. **Zero Trust for Client-Supplied User IDs**: Ownership is strictly derived from `auth.uid()` inside PostgreSQL RPC functions and RLS policies. Client-supplied IDs in request bodies or query parameters are never trusted.
3. **No Private Secrets in Frontend**: `service_role` keys and database administrator credentials are never shipped to the frontend or checked into version control.
4. **Data Isolation**: Private beta gating prevents unauthorized Google OAuth accounts from accessing personal workspaces.
5. **Account Deletion & Data Purge**: Users maintain full data sovereignty, including complete JSON data export, 30-day scheduled closure, and immediate database purge capabilities.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability or suspect an authorization bypass in Envello, please do **NOT** open a public GitHub issue.

Instead, please disclose it responsibly by contacting the maintainer directly:

- **Security Contact**: Jayesh Yadav
- **Email**: [yadavjayesh2008@gmail.com](mailto:yadavjayesh2008@gmail.com)
- **Response Window**: We acknowledge security reports within 48 hours and aim to provide a mitigation or patch within 7 days.

### What to Include in Your Report
To help us triage and resolve the issue quickly, please include:
- A clear description of the vulnerability.
- Step-by-step reproduction instructions or a minimal proof of concept.
- The potential impact (e.g., unauthorized data access, RLS bypass, calculation discrepancy).
- Any proposed remediation if available.

We appreciate your efforts to responsibly disclose findings and protect user financial data!

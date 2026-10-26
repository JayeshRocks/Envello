# Envello — Development Guide

## 1. Prerequisites & Tooling

To run and contribute to Envello, ensure you have:
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Git**: Installed and configured
- **Supabase CLI**: For local PostgreSQL migrations and type generation (`npm i -g supabase` or `npx supabase`)
- **Docker**: Optional, for running local Supabase emulator

---

## 2. Quick Start & Local Setup

### 2.1 Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/Envello.git
cd Envello

# Install dependencies
npm install
```

### 2.2 Environment Configuration
Copy the environment template:
```bash
cp .env.example .env
```
Fill in your local or staging Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
VITE_APP_URL=http://localhost:5173
```
> [!WARNING]
> Never put the Supabase Service Role Key or database passwords into `.env` or any `VITE_*` variable.

### 2.3 Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 2.4 Transactional Email Setup (Resend Custom SMTP)
By default, Supabase's built-in email provider is strictly rate-limited to 3–4 emails/hour on the free tier. To bypass this and ensure reliable delivery of Magic Links, OTPs, and password reset emails, Envello uses **Resend** via Supabase's native Custom SMTP support (3,000 free emails/month):
1. Sign up at [Resend.com](https://resend.com) (free).
2. Go to **API Keys** and generate an API key (e.g., `re_123456...`).
3. (Optional) Verify your custom domain in Resend, or use `onboarding@resend.dev` for testing to your verified account email.
4. In **Supabase Dashboard** -> **Project Settings** -> **Authentication** -> **SMTP Settings**:
   - Toggle **Enable Custom SMTP**: `ON`
   - **Sender email**: `noreply@yourdomain.com` (or `onboarding@resend.dev`)
   - **Sender name**: `Envello`
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Minimum TLS Version**: `TLSv1.2`
   - **User**: `resend`
   - **Password**: `<your_resend_api_key>`
5. Click **Save**. All Supabase Auth emails will now be delivered via Resend with zero code changes required in the app.

---

## 3. Database & Supabase Workflow

### 3.1 Applying Migrations Locally
```bash
# Start local Supabase containers (if using Docker)
npx supabase start

# Reset local database and run all migrations in supabase/migrations/
npx supabase db reset
```

### 3.2 Generating TypeScript Database Types
Keep frontend TypeScript types in sync with the PostgreSQL schema:
```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

### 3.3 Adding a New Migration
Always create versioned migration files in `supabase/migrations/`:
```bash
npx supabase migration new my_descriptive_migration_name
```
Include:
- Table creation with constraints (`CHECK`, `FOREIGN KEY ON DELETE RESTRICT`).
- RLS activation (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
- Explicit policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE` enforcing `auth.uid() = user_id`.

---

## 4. Project Directory Layout

```text
Envello/
├── .agents/                    # Antigravity rules and workflows (aliased to .agent/)
│   ├── rules/                  # Persistent project engineering rules
│   └── workflows/              # Slash-command developer workflows
├── docs/                       # Technical architecture & specification suite
├── supabase/                   # Supabase configuration & SQL migrations
│   ├── migrations/             # Timestamped SQL migration files
│   └── seed.sql                # Dev-only seed fixtures (never in prod)
├── src/
│   ├── components/             # Reusable, accessible UI components
│   │   ├── common/             # Buttons, Cards, Modals, Inputs, Skeletons
│   │   ├── dashboard/          # Balance pillars, high-level summary cards
│   │   ├── envelopes/          # Envelope cards, allocation dialogues
│   │   ├── transactions/       # Transaction table, entry forms, filters
│   │   └── cards-and-debts/    # Credit card gauges, EMI trackers
│   ├── hooks/                  # React custom hooks (auth, queries, mutations)
│   ├── lib/
│   │   ├── accounting/         # Pure domain calculation engine (integer paise math)
│   │   ├── api/                # Supabase client instances & queries
│   │   └── utils/              # Formatting helpers, Indian currency formatters
│   ├── pages/                  # Top-level view routes
│   ├── types/                  # TypeScript interfaces & Supabase generated types
│   ├── App.tsx                 # Root component and layout routing
│   ├── main.tsx                # Application entrypoint
│   └── index.css               # Tailwind CSS entrypoint & design tokens
├── .env.example                # Safe environment variable template
├── .gitignore                  # Git ignore rules protecting credentials
├── AGENTS.md                   # Portable authoritative agent guide
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript strict configuration
└── vite.config.ts              # Vite bundler configuration
```

---

## 5. Coding & Verification Standards

### 5.1 Verification Pipeline
Before submitting any pull request or declaring a task complete:
```bash
# 1. Static analysis
npm run lint

# 2. Type compilation
npm run build

# 3. Unit tests
npm run test
```

### 5.2 Commit Conventions
Use Conventional Commits:
- `feat: add envelope allocation modal`
- `fix: correct paise rounding in credit card payment rpc`
- `docs: update accounting invariants for self emi`
- `refactor: extract integer math helpers to accounting lib`
- `test: add unit tests for envelope rollover rules`

# LedgerPro SaaS

Multi-tenant accounting software for teams — Finance, AR, AP, Fixed Assets, Tax, HR, Expenses, Projects & Reports. Built with React + Express + MongoDB, ready to deploy on Vercel.

## What makes this SaaS

| Feature | Detail |
|---------|--------|
| **Multi-tenancy** | Every data record is scoped to an `Organisation` — tenants are fully isolated |
| **Team roles** | `owner` → `admin` → `accountant` → `viewer` with enforced route guards |
| **Invite system** | Admins invite teammates by email; tokenised invite links expire after 7 days |
| **Plan limits** | Free: 3 users / 50 invoices / 5 projects. Pro: unlimited |
| **Org switcher** | Users can belong to multiple orgs and switch between them |
| **Stripe ready** | Subscription model + upgrade CTA wired up; add `STRIPE_*` env vars to activate |

## Modules

Finance · Accounts Receivable · Accounts Payable · Fixed Assets · Tax · HR · Expenses · Projects · Reports & Analytics · Settings (org + team + plan)

## Quick Start

```bash
# 1. Clone
git clone https://github.com/gaurangjani/LedgerProSaaS.git && cd LedgerProSaaS

# 2. Install
cd server && npm install && cd ..

# 3. Configure
cp .env.example server/.env   # fill in MONGODB_URI and SESSION_SECRET

# 4. Run backend
cd server && npm run dev       # → http://localhost:3000/api/v1

# 5. Serve frontend
npx http-server client -p 8080 -c-1   # → http://localhost:8080
```

Register → creates your account + first organisation automatically.

## Deploy to Vercel

1. Import repo at **vercel.com/new**
2. Add env vars: `MONGODB_URI`, `SESSION_SECRET`, `NODE_ENV=production`
3. Click Deploy — frontend and API served from the same domain

## Architecture

```
LedgerProSaaS/
├── client/           # Static frontend (React UMD + Babel)
│   ├── index.html
│   ├── styles.css
│   └── components/
│       ├── api.js            # HTTP client (auto-detects local vs Vercel URL)
│       ├── ui.jsx            # Shared UI primitives
│       ├── Login.jsx         # Login / Register / Accept Invite
│       ├── Dashboard.jsx     # Org-aware dashboard + plan usage bar
│       ├── Settings.jsx      # Org profile, Members, Invites, Plan & Billing
│       └── ...               # Finance, AR, AP, FixedAssets, Tax, HR, Expenses, Projects, Reports
├── server/           # Express API
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js           # with activeOrg
│   │   │   ├── Organization.js   # name, slug, plan, planLimits
│   │   │   ├── Membership.js     # user ↔ org with role
│   │   │   ├── Invite.js         # tokenised email invites
│   │   │   └── accounting.js     # all 19 accounting models (each with orgId)
│   │   ├── middleware/
│   │   │   └── auth.js           # isAuthenticated, requireOrg, requireRole, canWrite, canAdmin
│   │   ├── controllers/
│   │   │   ├── authController.js      # register, login, logout, me, switchOrg, acceptInvite
│   │   │   ├── orgController.js       # org CRUD, members, invites, plan usage
│   │   │   └── accountingController.js # all 9 accounting modules
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── orgs.js
│   │       └── accounting.js
│   └── api/index.js      # Vercel serverless entry point
└── vercel.json           # Routes /api/* → serverless, static for frontend
```

## Roles & Permissions

| Action | viewer | accountant | admin | owner |
|--------|--------|------------|-------|-------|
| Read all data | ✅ | ✅ | ✅ | ✅ |
| Create / edit records | ❌ | ✅ | ✅ | ✅ |
| Invite / remove members | ❌ | ❌ | ✅ | ✅ |
| Edit org settings | ❌ | ❌ | ✅ | ✅ |
| Delete org / transfer ownership | ❌ | ❌ | ❌ | ✅ |

## API Reference

Base: `/api/v1` — all routes require session cookie.

```
POST   /auth/register          { name, email, password, orgName }
POST   /auth/login             { email, password }
GET    /auth/me
POST   /auth/switch-org        { orgId }
POST   /auth/accept-invite     { token, name?, password? }

GET    /orgs                   org profile + memberCount
PUT    /orgs                   update org profile
GET    /orgs/members
PUT    /orgs/members/:userId   change role
DELETE /orgs/members/:userId
GET    /orgs/invites
POST   /orgs/invites           { email, role }
DELETE /orgs/invites/:id
GET    /orgs/plan              current plan + usage vs limits

# All accounting routes are org-scoped (orgId from session)
GET|POST   /finance/accounts
GET|POST   /finance/journal-entries
GET        /finance/reports/trial-balance|profit-loss|balance-sheet
GET|POST   /ar/customers|invoices|payments
GET        /ar/reports/aging
GET|POST   /ap/vendors|bills|purchase-orders|payments
GET|POST   /fixed-assets
POST       /fixed-assets/:id/dispose
GET|POST   /tax/configurations|returns
POST       /tax/returns/:id/file
GET|POST   /hr/departments|employees
GET|POST   /expenses/categories|claims
POST       /expenses/claims/:id/submit|approve|reject|reimburse
GET|POST   /projects
GET        /projects/:id/summary
GET|POST   /projects/:id/costs|time-entries
```

## License

MIT

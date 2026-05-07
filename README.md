# LedgerPro SaaS

> Multi-tenant accounting software for teams — built for the cloud.

A complete SaaS accounting platform with Finance, Accounts Receivable, Accounts Payable, Fixed Assets, Tax Management, HR, Expenses, Project Costing, and Reports. Built with React + Express + MongoDB and deployable to Vercel in minutes.

---

## Features

### Multi-Tenancy & Team Management
- Every record is scoped to an **Organisation** — full data isolation between tenants
- **Invite system** — invite teammates by email with tokenised links (7-day expiry)
- **Role-based access control** — `owner` → `admin` → `accountant` → `viewer`
- **Multi-org support** — users can belong to multiple organisations and switch between them

### SaaS Billing (Stripe)
- **Free / Pro / Enterprise plans** with enforced usage limits
- Stripe Checkout for plan upgrades
- Stripe Customer Portal for subscription management
- Webhook handler for real-time subscription lifecycle events

### Accounting Modules
| Module | Features |
|--------|----------|
| **Finance** | Chart of accounts, double-entry journal entries, trial balance, P&L, balance sheet |
| **Accounts Receivable** | Customers, invoices (with tax), AR payments, aging report |
| **Accounts Payable** | Vendors, bills, purchase orders, AP payments |
| **Fixed Assets** | Asset register, depreciation tracking, disposal workflow |
| **Tax** | Tax configurations (VAT, income tax, etc.), tax return filing |
| **HR** | Departments, employee records |
| **Expenses** | Expense categories, claim submission → approval → reimbursement workflow |
| **Projects** | Project budgets, cost tracking, billable time entries, project summary |
| **Reports** | Trial balance, profit & loss, balance sheet, AR aging |

### Security
- Session-based authentication with `passport-local`
- bcrypt password hashing (12 rounds)
- Rate limiting on auth (20 req/15 min) and API (120 req/min) routes
- Helmet security headers
- CORS origin whitelist
- Password reset via secure token (1-hour expiry)

---

## Plans & Limits

| | Free | Pro | Enterprise |
|---|---|---|---|
| Users | 3 | 50 | Unlimited |
| Invoices | 50 | 10,000 | Unlimited |
| Projects | 5 | 500 | Unlimited |
| Price | Free | £29/mo | Contact us |

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))

### 1. Clone & Install

```bash
git clone https://github.com/gaurangjani/proledgersaas.git
cd proledgersaas
npm run install:all
```

### 2. Configure Environment

```bash
cp .env.example server/.env
# Edit server/.env — set MONGODB_URI and SESSION_SECRET at minimum
```

### 3. Run

```bash
# Terminal 1 — API server
npm run dev:server        # → http://localhost:3000/api/v1

# Terminal 2 — Frontend
npm run dev:client        # → http://localhost:8080
```

Open `http://localhost:8080` → click **Register free** → create your account and first organisation.

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Add these environment variables in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `SESSION_SECRET` | A random 32+ character string |
| `NODE_ENV` | `production` |
| `APP_URL` | Your Vercel deployment URL |
| `ALLOWED_ORIGINS` | Your Vercel deployment URL |
| `STRIPE_SECRET_KEY` | From [Stripe Dashboard](https://dashboard.stripe.com) |
| `STRIPE_PRICE_ID_PRO` | Pro plan price ID from Stripe |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook settings |

4. Click **Deploy**

The `vercel.json` routes all `/api/*` requests to the serverless Express handler and serves the frontend as static files.

### Stripe Webhook Setup (Production)

In your Stripe Dashboard → Webhooks → Add endpoint:
- URL: `https://your-domain.vercel.app/api/v1/billing/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

---

## Project Structure

```
proledgersaas/
├── client/                          # Static frontend (React UMD + Babel, no build step)
│   ├── index.html                   # SPA shell with sidebar + router
│   ├── styles.css                   # Full CSS theme
│   └── components/
│       ├── api.js                   # HTTP client — auto-detects local vs production
│       ├── ui.jsx                   # Shared UI primitives (Table, Modal, Form, etc.)
│       ├── Login.jsx                # Login / Register / Accept Invite
│       ├── Dashboard.jsx            # Live plan usage + compliance reminders
│       ├── Finance.jsx              # Chart of accounts + journal entries + reports
│       ├── AccountsReceivable.jsx   # Customers, invoices, payments, aging
│       ├── AccountsPayable.jsx      # Vendors, bills, purchase orders, payments
│       ├── FixedAssets.jsx          # Asset register + disposal
│       ├── Tax.jsx                  # Tax configs + returns
│       ├── HR.jsx                   # Departments + employees
│       ├── Expenses.jsx             # Categories + claim workflow
│       ├── Projects.jsx             # Projects + costs + time entries
│       ├── Reports.jsx              # Financial reports
│       └── Settings.jsx             # Org profile, team, invites, billing
│
├── server/
│   ├── package.json
│   ├── api/
│   │   └── index.js                 # Vercel serverless entry point
│   └── src/
│       ├── server.js                # Node HTTP server entry
│       ├── app.js                   # Express app (middleware, routes)
│       ├── config/
│       │   ├── database.js          # Mongoose connection
│       │   └── passport.js          # Local strategy
│       ├── middleware/
│       │   ├── auth.js              # isAuthenticated, requireOrg, requireRole
│       │   └── rateLimit.js         # Auth + API rate limiters
│       ├── models/
│       │   ├── User.js              # User with activeOrg + isSuperAdmin
│       │   ├── Organization.js      # Org with plan, planLimits, Stripe IDs
│       │   ├── Membership.js        # User ↔ Org with role
│       │   ├── Invite.js            # Email invites with token + expiry
│       │   └── accounting.js        # 19 accounting models (all org-scoped)
│       ├── controllers/
│       │   ├── authController.js    # register, login, logout, me, switchOrg, forgot/reset password
│       │   ├── orgController.js     # org CRUD, members, invites, plan usage
│       │   ├── accountingController.js  # all accounting CRUD + business logic
│       │   └── billingController.js # Stripe checkout, portal, webhook, status
│       └── routes/
│           ├── auth.js
│           ├── orgs.js
│           ├── accounting.js
│           └── billing.js
│
├── package.json                     # Root scripts (dev:server, dev:client, install:all)
├── vercel.json                      # Vercel routing config
├── .env.example                     # Environment variable template
└── .gitignore
```

---

## Roles & Permissions

| Action | viewer | accountant | admin | owner |
|--------|:------:|:----------:|:-----:|:-----:|
| Read all data | ✅ | ✅ | ✅ | ✅ |
| Create / edit records | ❌ | ✅ | ✅ | ✅ |
| Submit expense claims | ❌ | ✅ | ✅ | ✅ |
| Approve / reject claims | ❌ | ❌ | ✅ | ✅ |
| Invite / remove members | ❌ | ❌ | ✅ | ✅ |
| Edit org settings | ❌ | ❌ | ✅ | ✅ |
| Manage billing / upgrade plan | ❌ | ❌ | ❌ | ✅ |

---

## API Reference

Base URL: `/api/v1` — all routes require an active session cookie (set on login).

### Auth
```
POST  /auth/register           { name, email, password, orgName }
POST  /auth/login              { email, password }
POST  /auth/logout
GET   /auth/me
POST  /auth/switch-org         { orgId }
POST  /auth/accept-invite      { token, name?, password? }
POST  /auth/forgot-password    { email }
POST  /auth/reset-password     { token, password }
```

### Organisation
```
GET    /orgs                   Get current org profile
PUT    /orgs                   Update org profile (admin+)
GET    /orgs/members           List members
PUT    /orgs/members/:userId   Change member role (admin+)
DELETE /orgs/members/:userId   Remove member (admin+)
GET    /orgs/invites           List pending invites
POST   /orgs/invites           Create invite (admin+) { email, role }
DELETE /orgs/invites/:id       Revoke invite (admin+)
GET    /orgs/plan              Current plan + usage
```

### Billing
```
GET   /billing/status          Plan, limits, usage, billing cycle
POST  /billing/checkout        { plan } — Stripe Checkout URL (owner only)
POST  /billing/portal          Stripe Customer Portal URL (owner only)
POST  /billing/webhook         Stripe webhook (no auth, raw body)
```

### Finance
```
GET|POST        /finance/accounts
PUT|DELETE      /finance/accounts/:id
GET|POST        /finance/journal-entries
PUT             /finance/journal-entries/:id
GET             /finance/reports/trial-balance
GET             /finance/reports/profit-loss
GET             /finance/reports/balance-sheet
```

### Accounts Receivable
```
GET|POST        /ar/customers
PUT|DELETE      /ar/customers/:id
GET|POST        /ar/invoices
PUT|DELETE      /ar/invoices/:id
GET|POST        /ar/payments
GET             /ar/reports/aging
```

### Accounts Payable
```
GET|POST        /ap/vendors
PUT|DELETE      /ap/vendors/:id
GET|POST        /ap/bills
PUT             /ap/bills/:id
GET|POST        /ap/purchase-orders
GET|POST        /ap/payments
```

### Fixed Assets
```
GET|POST        /fixed-assets
PUT|DELETE      /fixed-assets/:id
POST            /fixed-assets/:id/dispose
```

### Tax
```
GET|POST        /tax/configurations
PUT             /tax/configurations/:id
GET|POST        /tax/returns
PUT             /tax/returns/:id
POST            /tax/returns/:id/file
```

### HR
```
GET|POST        /hr/departments
PUT|DELETE      /hr/departments/:id
GET|POST        /hr/employees
PUT|DELETE      /hr/employees/:id
```

### Expenses
```
GET|POST        /expenses/categories
PUT             /expenses/categories/:id
GET|POST        /expenses/claims
PUT             /expenses/claims/:id
POST            /expenses/claims/:id/submit
POST            /expenses/claims/:id/approve
POST            /expenses/claims/:id/reject
POST            /expenses/claims/:id/reimburse
```

### Projects
```
GET|POST        /projects
PUT|DELETE      /projects/:id
GET             /projects/:id/summary
GET|POST        /projects/:id/costs
GET|POST        /projects/:id/time-entries
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (UMD), Babel Standalone, Vanilla CSS |
| Backend | Node.js, Express 4 |
| Database | MongoDB via Mongoose 7 |
| Auth | Passport.js (local strategy), express-session |
| Billing | Stripe (Checkout, Customer Portal, Webhooks) |
| Security | Helmet, express-rate-limit, bcryptjs |
| Deployment | Vercel (serverless API + static frontend) |

---

## License

MIT — use freely for commercial and personal projects.

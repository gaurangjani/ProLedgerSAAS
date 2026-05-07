# Deployment & Database Setup Guide

Step-by-step instructions for setting up MongoDB and deploying LedgerPro SaaS — both locally and to production (Vercel).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [MongoDB Setup](#mongodb-setup)
   - [Option A — MongoDB Atlas (recommended for production)](#option-a--mongodb-atlas-recommended-for-production)
   - [Option B — Local MongoDB (development only)](#option-b--local-mongodb-development-only)
3. [Environment Variables](#environment-variables)
4. [Local Development](#local-development)
5. [Deploy to Vercel](#deploy-to-vercel)
6. [Post-Deployment: First Super-Admin](#post-deployment-first-super-admin)
7. [Stripe Webhook Setup](#stripe-webhook-setup)
8. [Email Setup (Resend)](#email-setup-resend)
9. [Verify Everything Works](#verify-everything-works)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Included with Node |
| Git | any | https://git-scm.com |
| Vercel CLI (production) | latest | `npm i -g vercel` |

---

## MongoDB Setup

### Option A — MongoDB Atlas (recommended for production)

MongoDB Atlas is a fully managed cloud database with a generous free tier (512 MB, no credit card required).

**1. Create a free cluster**

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign up / log in
2. Click **Create** → choose **Free (M0)** tier
3. Select your preferred cloud provider and region (choose the same region as your Vercel deployment for lowest latency)
4. Click **Create Deployment**

**2. Create a database user**

1. In the left sidebar go to **Security → Database Access**
2. Click **Add New Database User**
3. Authentication method: **Password**
4. Enter a username (e.g. `ledgerpro`) and a strong password — save these
5. Database User Privileges: **Read and write to any database**
6. Click **Add User**

**3. Whitelist IP addresses**

1. Go to **Security → Network Access**
2. Click **Add IP Address**
3. For Vercel deployments, click **Allow Access from Anywhere** (`0.0.0.0/0`) — Vercel uses dynamic IPs
4. Click **Confirm**

> ⚠️ If security is a concern, use a Vercel integration instead: [MongoDB Atlas + Vercel Integration](https://vercel.com/integrations/mongodbatlas) which handles IP whitelisting automatically.

**4. Get your connection string**

1. In Atlas, click **Connect** on your cluster
2. Choose **Drivers** → Node.js
3. Copy the connection string — it looks like:
   ```
   mongodb+srv://ledgerpro:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your database user's password
5. Add your database name before the `?`:
   ```
   mongodb+srv://ledgerpro:<password>@cluster0.xxxxx.mongodb.net/ledgerpro-saas?retryWrites=true&w=majority
   ```

This is your `MONGODB_URI`.

---

### Option B — Local MongoDB (development only)

**macOS (Homebrew)**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu / Debian**
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Windows**

Download and run the installer from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).

Your local connection string is:
```
mongodb://localhost:27017/ledgerpro-saas
```

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example server/.env
```

Edit `server/.env`:

```env
# ── Required ────────────────────────────────────────────────────────────────

# MongoDB connection string (from Atlas or local)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ledgerpro-saas

# Session encryption — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-long-random-string-here

NODE_ENV=production

# The public URL of your deployed app (no trailing slash)
APP_URL=https://your-app.vercel.app

# ── Email — Resend (resend.com) ──────────────────────────────────────────────
# Free tier: 3,000 emails/month — sign up at resend.com
# Leave blank in development to log emails to console instead
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=LedgerPro <noreply@yourdomain.com>

# ── Stripe (for subscription billing) ───────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# ── CORS (comma-separated allowed origins) ───────────────────────────────────
# For Vercel: not needed (same domain). For custom domain, add it here.
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Generating a secure SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64-character hex string) as your `SESSION_SECRET`.

---

## Local Development

```bash
# 1. Clone the repo
git clone https://github.com/gaurangjani/ProLedgerSAAS.git
cd ProLedgerSAAS

# 2. Install all dependencies
npm run install:all

# 3. Set up environment
cp .env.example server/.env
# Edit server/.env with your values (MONGODB_URI at minimum)

# 4. Start the API server (port 3000)
npm run dev:server

# 5. In a second terminal, start the frontend (port 8080)
npm run dev:client
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

> The frontend dev server proxies `/api` requests to `localhost:3000` automatically — no CORS configuration needed locally.

---

## Deploy to Vercel

### Option A — Vercel CLI (recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Log in
vercel login

# 3. Build the frontend
npm run build:client

# 4. Deploy (run from repo root)
vercel --prod
```

During the first deploy, Vercel will ask you to link to a project. Accept the defaults.

**Set environment variables on Vercel:**

```bash
vercel env add MONGODB_URI
vercel env add SESSION_SECRET
vercel env add RESEND_API_KEY
vercel env add EMAIL_FROM
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PRICE_ID_PRO
vercel env add STRIPE_PRICE_ID_ENTERPRISE
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add APP_URL
vercel env add NODE_ENV   # value: production
```

Or set them all at once via the Vercel Dashboard: **Project → Settings → Environment Variables**.

### Option B — GitHub Integration (auto-deploy on push)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
3. Vercel auto-detects `vercel.json` — no framework preset needed
4. Add all environment variables in the dashboard before clicking **Deploy**
5. Every push to `main` will trigger an automatic redeploy

### MongoDB indexes (auto-created)

All MongoDB indexes (unique constraints, TTL indexes for tokens, compound indexes for multi-tenant queries) are defined in the Mongoose schemas and created automatically on first server startup — no manual migration step required.

---

## Post-Deployment: First Super-Admin

After deploying, sign up for an account through the app UI. Then grant yourself super-admin access via the MongoDB shell:

**Using MongoDB Atlas (Data Explorer)**

1. In Atlas, go to **Collections → users**
2. Find your user document and click **Edit**
3. Set `isSuperAdmin: true`
4. Click **Update**

**Using mongosh (CLI)**

```bash
# Connect to Atlas
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/ledgerpro-saas"

# Grant super-admin
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { isSuperAdmin: true } }
)
```

After refreshing the app, you will see **⚡ Admin Portal** in the sidebar.

---

## Stripe Webhook Setup

Stripe webhooks notify your app when subscription events happen (payments, cancellations, etc.).

**Production webhook**

1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add Endpoint**
3. Endpoint URL: `https://your-app.vercel.app/api/v1/billing/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add Endpoint**
6. Copy the **Signing Secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET`

**Local testing with Stripe CLI**

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/v1/billing/webhook
# Copy the webhook signing secret printed and add to server/.env as STRIPE_WEBHOOK_SECRET
```

---

## Email Setup (Resend)

1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Go to **API Keys** → **Create API Key** → copy it as `RESEND_API_KEY`
3. Go to **Domains** → **Add Domain** → verify your sending domain via DNS
4. Set `EMAIL_FROM` to use your verified domain, e.g.:
   ```
   EMAIL_FROM=LedgerPro <noreply@yourdomain.com>
   ```

> **Development shortcut**: leave `RESEND_API_KEY` blank and all emails will be printed to the server console instead of sent.

---

## Verify Everything Works

After deployment, run through this checklist:

| Check | How to verify |
|-------|--------------|
| API health | `GET https://your-app.vercel.app/api/v1/health` → `{ success: true }` |
| Frontend loads | Open `https://your-app.vercel.app` — login page appears |
| Registration | Sign up → welcome email received (or logged to console) |
| Email verification | Click link in verification email → login works |
| Stripe billing | Click **Upgrade to Pro** → Stripe Checkout opens |
| Webhook | Complete test payment → org plan updates to `pro` |
| Super-admin | Grant `isSuperAdmin: true` → Admin Portal visible in sidebar |

---

## Troubleshooting

**`MongoServerError: bad auth`**
→ Wrong username or password in `MONGODB_URI`. Re-check the Atlas Database Access credentials.

**`MongoServerSelectionError: connection timed out`**
→ IP not whitelisted. In Atlas, go to Network Access and add `0.0.0.0/0`.

**Emails not sending**
→ Check `RESEND_API_KEY` is set and your sending domain is verified in Resend.

**Stripe webhook returns 400**
→ `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint's signing secret. Copy it again from the Stripe dashboard webhook detail page.

**Session not persisting (logged out on every request)**
→ `SESSION_SECRET` is missing or `NODE_ENV` is not set to `production`. Vercel cookie `sameSite: none` requires `secure: true` which requires `NODE_ENV=production`.

**Admin Portal not visible**
→ `isSuperAdmin` is not `true` on your user document. Check with `db.users.findOne({ email: "you@example.com" }, { isSuperAdmin: 1 })`.

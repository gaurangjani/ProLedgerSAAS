const express    = require('express');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
require('dotenv').config();

const connectDB  = require('./config/database');
const passport   = require('./config/passport');

const authRoutes       = require('./routes/auth');
const orgRoutes        = require('./routes/orgs');
const accountingRoutes = require('./routes/accounting');

const app = express();
connectDB();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
    if (!allowed.length || allowed.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'ledgerpro-saas-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/ledgerpro-saas',
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   86400000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const API = '/api/v1';
app.get('/', (req, res) => res.json({ success: true, message: 'LedgerPro SaaS API v1' }));
app.get(`${API}/health`, (req, res) => res.json({ success: true, ts: new Date().toISOString() }));

app.use(`${API}/auth`,    authRoutes);
app.use(`${API}/orgs`,    orgRoutes);
app.use(`${API}`,         accountingRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

module.exports = app;

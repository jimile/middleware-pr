// ──────────────────────────────────────────────────────────────
// Uniforms Product Editor — Express entry point
// Run: node server.js
// ──────────────────────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const requireAuth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ── View engine ──────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// ── Body parsing ─────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Sessions ─────────────────────────────────────────────────
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'change-me'],
  maxAge: 1000 * 60 * 60 * 24 // 24 hours
}));

// ── Flash-style messages via session ─────────────────────────
// Sets res.locals.flash so templates can read it.
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

// ── Login / Logout ───────────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/products');
  res.render('login', { layout: false, error: null });
});

app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.APP_PASSWORD) {
    req.session.authenticated = true;
    return res.redirect('/products');
  }
  res.render('login', { layout: false, error: 'Incorrect password. Try again.' });
});

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

// ── Redirect root to products ────────────────────────────────
app.get('/', (req, res) => res.redirect('/products'));

// ── Mount routes (all require auth) ──────────────────────────
app.use('/products', requireAuth, require('./routes/products'));
app.use('/products', requireAuth, require('./routes/swatches'));
app.use('/products', requireAuth, require('./routes/sizes'));
app.use('/products', requireAuth, require('./routes/images'));
app.use('/products', requireAuth, require('./routes/pricing'));

// ── Start ────────────────────────────────────────────────────
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`Product editor running on http://localhost:${PORT}`);
  });
}

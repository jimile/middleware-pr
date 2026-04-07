// Simple password-gate middleware.
// If the user hasn't logged in, redirect them to /login.

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/login');
}

module.exports = requireAuth;

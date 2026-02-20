function createAuthMiddleware(deps) {
  const {
    sessions,
    SESSION_ACTIVITY_TIMEOUT,
    checkRateLimit,
    getClientIP,
    setSecurityHeaders
  } = deps;

  function isAuthenticated(req) {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const url = new URL(req.url, 'http://localhost');
      token = url.searchParams.get('token');
    }
    if (!token) return false;

    const session = sessions.get(token);
    if (!session) return false;

    const now = Date.now();
    if (now > session.expiresAt) {
      sessions.delete(token);
      return false;
    }

    if (!session.rememberMe) {
      if (now - session.lastActivity > SESSION_ACTIVITY_TIMEOUT) {
        sessions.delete(token);
        return false;
      }
      session.lastActivity = now;
    }

    return true;
  }

  function requireAuth(req, res) {
    const ip = getClientIP(req);
    const limitCheck = checkRateLimit(ip);
    if (limitCheck.blocked) {
      setSecurityHeaders(res);
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many failed attempts', retryAfter: limitCheck.remainingSeconds }));
      return false;
    }

    if (!isAuthenticated(req)) {
      setSecurityHeaders(res);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return false;
    }
    return true;
  }

  return { isAuthenticated, requireAuth };
}

module.exports = { createAuthMiddleware };

const crypto = require('crypto');

function handleAuthRoutes(req, res, deps) {
  const {
    getCredentials,
    isAuthenticated,
    setSameSiteCORS,
    validatePassword,
    hashPassword,
    saveCredentials,
    createSession,
    clearFailedAuth,
    auditLog,
    getClientIP,
    checkRateLimit,
    recordFailedAuth,
    verifyPassword,
    verifyTOTP,
    sessions,
    safeCompare,
    DASHBOARD_TOKEN,
    requireAuth,
    base32Encode,
    pendingMfaSecrets,
    MFA_SECRET,
  } = deps;

  const ip = getClientIP(req);

  if (req.url === '/api/auth/status') {
    const creds = getCredentials();
    const registered = !!creds;
    const loggedIn = isAuthenticated(req);
    setSameSiteCORS(req, res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ registered, loggedIn }));
    return true;
  }

  if (req.url === '/api/auth/register' && req.method === 'POST') {
    const creds = getCredentials();
    if (creds) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Already registered' }));
      return true;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 2048) req.destroy(); });
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        if (!username || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Username and password required' }));
          return;
        }

        const pwdError = validatePassword(password);
        if (pwdError) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: pwdError }));
          return;
        }

        const { hash, salt } = hashPassword(password);
        const newCreds = { username, passwordHash: hash, salt, iterations: 100000 };
        saveCredentials(newCreds);

        const sessionToken = createSession(username, ip, false);
        clearFailedAuth(ip);
        auditLog('register', ip, { username });
        setSameSiteCORS(req, res);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sessionToken }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return true;
  }

  if (req.url === '/api/auth/login' && req.method === 'POST') {
    const limitCheck = checkRateLimit(ip);
    if (limitCheck.softLocked) {
      auditLog('login_locked', ip, { remainingSeconds: limitCheck.remainingSeconds, hardLocked: limitCheck.blocked });
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many failed login attempts', lockoutRemaining: limitCheck.remainingSeconds }));
      return true;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 2048) req.destroy(); });
    req.on('end', () => {
      try {
        const { username, password, totpCode, rememberMe } = JSON.parse(body);
        const creds = getCredentials();
        if (!creds) {
          recordFailedAuth(ip);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No account registered' }));
          return;
        }

        if (username !== creds.username) {
          recordFailedAuth(ip);
          auditLog('login_failed', ip, { username });
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid username or password' }));
          return;
        }

        if (!verifyPassword(password, creds.passwordHash, creds.salt)) {
          recordFailedAuth(ip);
          auditLog('login_failed', ip, { username });
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid username or password' }));
          return;
        }

        if (MFA_SECRET || creds.mfaSecret) {
          const secret = creds.mfaSecret || MFA_SECRET;
          if (!totpCode) {
            setSameSiteCORS(req, res);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ requiresMfa: true }));
            return;
          }

          if (!verifyTOTP(secret, totpCode)) {
            recordFailedAuth(ip);
            auditLog('login_mfa_failed', ip, { username });
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid TOTP code' }));
            return;
          }
        }

        const sessionToken = createSession(username, ip, rememberMe);
        clearFailedAuth(ip);
        auditLog('login_success', ip, { username });
        setSameSiteCORS(req, res);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sessionToken }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return true;
  }

  if (req.url === '/api/auth/logout' && req.method === 'POST') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      sessions.delete(token);
    }
    auditLog('logout', ip);
    setSameSiteCORS(req, res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  if (req.url === '/api/auth/reset-password' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 2048) req.destroy(); });
    req.on('end', () => {
      try {
        const { recoveryToken, newPassword } = JSON.parse(body);
        if (!safeCompare(recoveryToken, DASHBOARD_TOKEN)) {
          recordFailedAuth(ip);
          auditLog('password_reset_failed', ip);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid recovery token' }));
          return;
        }

        const pwdError = validatePassword(newPassword);
        if (pwdError) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: pwdError }));
          return;
        }

        const creds = getCredentials();
        if (!creds) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No account registered' }));
          return;
        }

        const { hash, salt } = hashPassword(newPassword);
        creds.passwordHash = hash;
        creds.salt = salt;
        saveCredentials(creds);

        sessions.clear();

        clearFailedAuth(ip);
        auditLog('password_reset_success', ip);
        setSameSiteCORS(req, res);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return true;
  }

  if (req.url === '/api/auth/change-password' && req.method === 'POST') {
    if (!requireAuth(req, res)) return true;
    setSameSiteCORS(req, res);

    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 2048) req.destroy(); });
    req.on('end', () => {
      try {
        const { currentPassword, newPassword } = JSON.parse(body);
        const creds = getCredentials();
        if (!creds) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No account registered' }));
          return;
        }

        if (!verifyPassword(currentPassword, creds.passwordHash, creds.salt)) {
          recordFailedAuth(ip);
          auditLog('password_change_failed', ip);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Current password is incorrect' }));
          return;
        }

        const pwdError = validatePassword(newPassword);
        if (pwdError) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: pwdError }));
          return;
        }

        const { hash, salt } = hashPassword(newPassword);
        creds.passwordHash = hash;
        creds.salt = salt;
        saveCredentials(creds);

        const authHeader = req.headers.authorization;
        const currentToken = authHeader ? authHeader.substring(7) : null;
        for (const [token] of sessions.entries()) {
          if (token !== currentToken) sessions.delete(token);
        }

        clearFailedAuth(ip);
        auditLog('password_change_success', ip);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return true;
  }

  if (req.url === '/api/auth/mfa-status') {
    if (!requireAuth(req, res)) return true;
    setSameSiteCORS(req, res);
    const creds = getCredentials();
    const enabled = !!(creds?.mfaSecret || MFA_SECRET);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ enabled }));
    return true;
  }

  if (req.url === '/api/auth/setup-mfa' && req.method === 'POST') {
    if (!requireAuth(req, res)) return true;
    setSameSiteCORS(req, res);

    try {
      const secret = base32Encode(crypto.randomBytes(20));
      const otpauth_uri = `otpauth://totp/OpenClaw:Dashboard?secret=${secret}&issuer=OpenClaw&algorithm=SHA1&digits=6&period=30`;
      pendingMfaSecrets.set(getClientIP(req), { secret, createdAt: Date.now() });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ secret, otpauth_uri }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  if (req.url === '/api/auth/confirm-mfa' && req.method === 'POST') {
    if (!requireAuth(req, res)) return true;
    setSameSiteCORS(req, res);

    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1024) req.destroy(); });
    req.on('end', () => {
      try {
        const { totpCode } = JSON.parse(body);
        const pending = pendingMfaSecrets.get(ip);

        if (!pending || Date.now() - pending.createdAt > 10 * 60 * 1000) {
          pendingMfaSecrets.delete(ip);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'MFA setup expired. Please try again.' }));
          return;
        }

        if (!totpCode || !verifyTOTP(pending.secret, totpCode)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid TOTP code. Please try again.' }));
          return;
        }

        const creds = getCredentials();
        if (creds) {
          creds.mfaSecret = pending.secret;
          saveCredentials(creds);
        }
        pendingMfaSecrets.delete(ip);
        auditLog('mfa_setup', ip);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  if (req.url === '/api/auth/disable-mfa' && req.method === 'POST') {
    if (!requireAuth(req, res)) return true;
    setSameSiteCORS(req, res);

    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1024) req.destroy(); });
    req.on('end', () => {
      try {
        const { totpCode } = JSON.parse(body);

        const creds = getCredentials();
        const mfaSecret = creds?.mfaSecret || MFA_SECRET;

        if (!mfaSecret) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'MFA is not enabled' }));
          return;
        }

        if (!totpCode || !verifyTOTP(mfaSecret, totpCode)) {
          auditLog('mfa_disable_failed', ip);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid TOTP code' }));
          return;
        }

        if (creds) {
          delete creds.mfaSecret;
          saveCredentials(creds);
        }

        auditLog('mfa_disabled', ip);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return true;
  }

  return false;
}

module.exports = { handleAuthRoutes };

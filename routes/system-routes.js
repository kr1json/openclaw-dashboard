const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec, execSync } = require('child_process');

function handleSystemRoutes(req, res, deps) {
  const {
    auditLog,
    getClientIP,
    getServicesStatus,
    WORKSPACE_DIR,
    costCacheState,
  } = deps;

  const ip = getClientIP(req);

  if (req.url === '/api/services') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getServicesStatus()));
    return true;
  }

  if (req.url.startsWith('/api/logs?')) {
    try {
      const params = new URL(req.url, 'http://localhost').searchParams;
      const requested = params.get('service') || 'openclaw';
      const allowedServices = ['openclaw', 'agent-dashboard', 'openclaw-dashboard', 'openclaw-gateway', 'tailscaled', 'sshd', 'nginx'];
      if (!allowedServices.includes(requested)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid service name');
        return true;
      }
      if (process.platform !== 'linux') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Logs are currently implemented for Linux host.');
        return true;
      }
      const lines = Math.min(Math.max(parseInt(params.get('lines')) || 100, 1), 1000);
      const unitAliases = {
        openclaw: ['openclaw-gateway', 'openclaw'],
        'agent-dashboard': ['openclaw-dashboard', 'agent-dashboard'],
        'openclaw-dashboard': ['openclaw-dashboard', 'agent-dashboard'],
        'openclaw-gateway': ['openclaw-gateway', 'openclaw'],
        tailscaled: ['tailscaled'],
        sshd: ['sshd'],
        nginx: ['nginx']
      };
      const candidates = unitAliases[requested] || [requested];
      let logs = '';
      for (const unit of candidates) {
        try {
          logs = execSync(`journalctl -u ${unit} --no-pager -n ${lines} -o short 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
          if (logs && !logs.includes('-- No entries --')) {
            logs = `[source: journalctl -u ${unit}]\n` + logs;
            break;
          }
          logs = '';
        } catch {}
      }
      if (!logs && (requested === 'agent-dashboard' || requested === 'openclaw-dashboard')) {
        try {
          const outPath = path.join(os.homedir(), '.pm2', 'logs', 'openclaw-dashboard-out.log');
          const errPath = path.join(os.homedir(), '.pm2', 'logs', 'openclaw-dashboard-error.log');
          const tail = (p) => {
            if (!fs.existsSync(p)) return '';
            const txt = fs.readFileSync(p, 'utf8');
            const arr = txt.split('\n');
            return arr.slice(Math.max(0, arr.length - lines)).join('\n').trim();
          };
          const outTail = tail(outPath);
          const errTail = tail(errPath);
          const chunks = [];
          if (outTail) chunks.push('[out]\n' + outTail);
          if (errTail) chunks.push('[error]\n' + errTail);
          if (chunks.length) logs = `[source: pm2 log files]\n` + chunks.join('\n\n');
        } catch {}
      }
      if (!logs) logs = 'No logs available';
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(logs);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error fetching logs');
    }
    return true;
  }

  if (req.url === '/api/action/restart-openclaw' && req.method === 'POST') {
    auditLog('action_restart_openclaw', ip);
    exec('systemctl restart openclaw', () => {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  if (req.url === '/api/action/restart-dashboard' && req.method === 'POST') {
    auditLog('action_restart_dashboard', ip);
    setTimeout(() => exec('systemctl restart agent-dashboard', () => {}), 2000);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Restarting in 2 seconds...' }));
    return true;
  }

  if (req.url === '/api/action/clear-cache' && req.method === 'POST') {
    costCacheState.clear();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  if (req.url === '/api/action/restart-tailscale' && req.method === 'POST') {
    auditLog('action_restart_tailscale', ip);
    exec('systemctl restart tailscaled', (err) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: !err, error: err?.message }));
    });
    return true;
  }

  if (req.url === '/api/action/update-openclaw' && req.method === 'POST') {
    auditLog('action_update_openclaw', ip);
    exec('npm update -g openclaw', { timeout: 120000 }, (err, stdout) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: !err, output: stdout?.trim(), error: err?.message }));
    });
    return true;
  }

  if (req.url === '/api/action/kill-tmux' && req.method === 'POST') {
    exec('tmux kill-session -t claude-persistent 2>/dev/null; echo ok', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return true;
  }

  if (req.url === '/api/action/gc' && req.method === 'POST') {
    const projDir = path.join(WORKSPACE_DIR, 'projects');
    exec(`if [ -d "${projDir}" ]; then for d in ${projDir}/*/; do cd "$d" && git gc --quiet 2>/dev/null; done; fi; cd ${WORKSPACE_DIR} && git gc --quiet 2>/dev/null; echo ok`, () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return true;
  }

  if (req.url === '/api/action/check-update' && req.method === 'POST') {
    exec('npm outdated -g openclaw 2>/dev/null || echo "up to date"', { timeout: 30000 }, (err, stdout) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, output: (stdout || '').trim() || 'All packages up to date' }));
    });
    return true;
  }

  if (req.url === '/api/action/sys-update' && req.method === 'POST') {
    auditLog('action_sys_update', ip);
    exec('apt update -qq && apt upgrade -y -qq 2>&1 | tail -5', { timeout: 300000 }, (err, stdout) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: !err, output: (stdout || '').trim(), error: err?.message }));
    });
    return true;
  }

  if (req.url === '/api/action/disk-cleanup' && req.method === 'POST') {
    exec('apt autoremove -y -qq 2>/dev/null; apt clean 2>/dev/null; journalctl --vacuum-time=7d 2>/dev/null; echo "Cleanup done"', { timeout: 60000 }, (err, stdout) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, output: (stdout || '').trim() }));
    });
    return true;
  }

  if (req.url === '/api/action/restart-claude' && req.method === 'POST') {
    exec(`tmux kill-session -t claude-persistent 2>/dev/null; sleep 1; tmux new-session -d -s claude-persistent -x 200 -y 60 && tmux send-keys -t claude-persistent "cd ${WORKSPACE_DIR} && claude" Enter && echo "Claude session started"`, { timeout: 20000 }, (err, stdout) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: !err, output: (stdout || '').trim() }));
    });
    return true;
  }

  if (req.url === '/api/tailscale') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try {
      const statusJson = execSync('tailscale status --json 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
      const status = JSON.parse(statusJson);
      const self = status.Self || {};
      const peers = Object.values(status.Peer || {}).filter(p => p.Online).length;
      let routes = [];
      try {
        const serveStatus = execSync('tailscale serve status 2>/dev/null', { encoding: 'utf8', timeout: 3000 });
        if (serveStatus && !serveStatus.includes('No serve config')) {
          routes = serveStatus.split('\n').filter(l => l.includes('http')).map(l => l.trim());
        }
      } catch {}
      res.end(JSON.stringify({
        hostname: self.HostName || 'unknown',
        ip: self.TailscaleIPs?.[0] || 'unknown',
        online: self.Online || false,
        peers,
        routes
      }));
    } catch {
      res.end(JSON.stringify({ error: 'Tailscale not available', hostname: '--', ip: '--', online: false, peers: 0, routes: [] }));
    }
    return true;
  }

  return false;
}

module.exports = { handleSystemRoutes };

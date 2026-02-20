const { parseCronRequest, parseCronRunsRequest } = require('../cron-route-utils');
const cronService = require('../services/cron-service');

function handleCronRoutes(req, res, auditLog, getClientIP) {
  const ip = getClientIP(req);

  if (req.url === '/api/crons' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cronService.getCronJobs()));
    return true;
  }

  if (req.url.startsWith('/api/cron/') && req.method === 'GET') {
    const parsedRuns = parseCronRunsRequest(req.url);
    if (parsedRuns) {
      const url = new URL(req.url, 'http://localhost');
      const limit = url.searchParams.get('limit');
      const result = cronService.getCronRuns(parsedRuns.id, limit);
      if (result && !Array.isArray(result) && result.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return true;
    }
  }

  if (req.url.startsWith('/api/cron/') && req.method === 'POST') {
    try {
      const parsed = parseCronRequest(req.url);
      if (!parsed) {
        res.writeHead(400);
        res.end('Invalid cron request');
        return true;
      }
      const { id, action } = parsed;

      if (action === 'toggle') {
        const result = cronService.toggleCronJob(id);
        auditLog('cron_toggle', ip, { cronId: id, enabled: result.enabled });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return true;
      } else if (action === 'run') {
        cronService.runCronJob(id);
        auditLog('cron_run', ip, { cronId: id });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return true;
      } else {
        res.writeHead(404);
        res.end('Not found');
        return true;
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
      return true;
    }
  }

  return false;
}

module.exports = { handleCronRoutes };

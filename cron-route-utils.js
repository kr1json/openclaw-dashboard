function decodeId(rawId) {
  let id;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    return null;
  }
  if (!id || !/^[a-zA-Z0-9:_-]+$/.test(id)) return null;
  return id;
}

function parseCronRequest(url = '') {
  const match = String(url).match(/^\/api\/cron\/([^/]+)\/(toggle|run)(?:\?.*)?$/);
  if (!match) return null;

  const [, rawId, action] = match;
  const id = decodeId(rawId);
  if (!id) return null;
  return { id, action };
}

function parseCronRunsRequest(url = '') {
  const match = String(url).match(/^\/api\/cron\/([^/]+)\/runs(?:\?.*)?$/);
  if (!match) return null;
  const id = decodeId(match[1]);
  if (!id) return null;
  return { id };
}

module.exports = { parseCronRequest, parseCronRunsRequest };

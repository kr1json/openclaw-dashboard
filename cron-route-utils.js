function parseCronRequest(url = '') {
  const match = String(url).match(/^\/api\/cron\/([^/]+)\/(toggle|run)$/);
  if (!match) return null;

  const [, rawId, action] = match;
  let id;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    return null;
  }

  if (!id || !/^[a-zA-Z0-9:_-]+$/.test(id)) return null;
  return { id, action };
}

module.exports = { parseCronRequest };

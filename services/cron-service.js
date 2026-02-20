const fs = require('fs');
const path = require('path');
const { toCronViewModel } = require('../cron-utils');

let OPENCLAW_DIR;
let WORKSPACE_DIR;

function initCronService(openclawDir, workspaceDir) {
  OPENCLAW_DIR = openclawDir;
  WORKSPACE_DIR = workspaceDir;
}

function getCronFilePath() {
  const openclawDir = OPENCLAW_DIR || path.join(require('os').homedir(), '.openclaw');
  return path.join(openclawDir, 'cron', 'jobs.json');
}

function getCronJobs() {
  const cronFile = getCronFilePath();
  try {
    if (!fs.existsSync(cronFile)) return [];
    const data = JSON.parse(fs.readFileSync(cronFile, 'utf8'));
    return (data.jobs || []).map(toCronViewModel);
  } catch { return []; }
}

function getCronRuns(jobId, limit = 30) {
  const { execFileSync } = require('child_process');
  try {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
    const out = execFileSync('openclaw', ['cron', 'runs', '--id', jobId, '--limit', String(safeLimit)], {
      encoding: 'utf8',
      timeout: 30000
    }).trim();
    if (!out) return [];
    const parsed = JSON.parse(out);
    return Array.isArray(parsed?.entries) ? parsed.entries : [];
  } catch (e) {
    return { error: e.message || 'Failed to fetch cron runs' };
  }
}

function toggleCronJob(jobId) {
  const cronFile = getCronFilePath();
  if (!fs.existsSync(cronFile)) throw new Error('No cron file');
  const data = JSON.parse(fs.readFileSync(cronFile, 'utf8'));
  const job = (data.jobs || []).find(j => j.id === jobId);
  if (!job) throw new Error('Job not found');
  job.enabled = !job.enabled;
  fs.writeFileSync(cronFile, JSON.stringify(data, null, 2));
  return { success: true, enabled: job.enabled };
}

function runCronJob(jobId) {
  const { execFile } = require('child_process');
  execFile('openclaw', ['cron', 'run', jobId], { timeout: 60000 }, () => {});
  return { success: true };
}

module.exports = {
  initCronService,
  getCronFilePath,
  getCronJobs,
  getCronRuns,
  toggleCronJob,
  runCronJob
};

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseCronRequest, parseCronRunsRequest } = require('../cron-route-utils');

test('parseCronRequest keeps colon in cron id', () => {
  const result = parseCronRequest('/api/cron/waveunse1%3Adaily-fortunes-db/run');
  assert.equal(result.action, 'run');
  assert.equal(result.id, 'waveunse1:daily-fortunes-db');
});

test('parseCronRequest rejects invalid path', () => {
  assert.equal(parseCronRequest('/api/cron//run'), null);
  assert.equal(parseCronRequest('/api/cron/abc'), null);
});

test('parseCronRunsRequest keeps colon id and supports query', () => {
  const result = parseCronRunsRequest('/api/cron/waveunse1%3Adaily-fortunes-db/runs?limit=20');
  assert.equal(result.id, 'waveunse1:daily-fortunes-db');
});

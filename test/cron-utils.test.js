const test = require('node:test');
const assert = require('node:assert/strict');

const { toCronViewModel } = require('../cron-utils');

test('toCronViewModel includes run history and readable schedule', () => {
  const row = toCronViewModel({
    id: 'abc123456789',
    name: 'Nightly Sync',
    schedule: { expr: '0 9 * * 1', tz: 'Asia/Seoul' },
    enabled: true,
    state: {
      lastStatus: 'ok',
      lastRunAtMs: 1739923200000,
      nextRunAtMs: 1739926800000,
      lastDurationMs: 4500
    }
  });

  assert.equal(row.id, 'abc123456789');
  assert.equal(row.name, 'Nightly Sync');
  assert.equal(row.schedule, 'Mon 09:00 (Seoul)');
  assert.equal(row.enabled, true);
  assert.equal(row.lastStatus, 'ok');
  assert.equal(row.lastRunAt, 1739923200000);
  assert.equal(row.nextRunAt, 1739926800000);
  assert.equal(row.lastDuration, 4500);
});

test('toCronViewModel falls back safely when cron data is missing', () => {
  const row = toCronViewModel({
    id: 'xyz987654321',
    schedule: { kind: 'every', everyMs: 60000 },
    enabled: false,
    state: {}
  });

  assert.equal(row.name, 'xyz98765');
  assert.equal(row.schedule, 'every 1m');
  assert.equal(row.enabled, false);
  assert.equal(row.lastStatus, 'unknown');
  assert.equal(row.lastRunAt, 0);
  assert.equal(row.nextRunAt, 0);
  assert.equal(row.lastDuration, 0);
});

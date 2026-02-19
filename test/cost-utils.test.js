const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { collectCostFromSessionDirs } = require('../cost-utils');

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

test('collectCostFromSessionDirs aggregates today cost across agent dirs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cost-utils-'));
  const now = new Date();
  const today = now.toISOString();

  const mainDir = path.join(root, 'main', 'sessions');
  const jarvisDir = path.join(root, 'jarvis', 'sessions');

  writeJsonl(path.join(mainDir, 'a.jsonl'), [
    { type: 'message', timestamp: today, message: { model: 'claude-opus-4-1', usage: { cost: { total: 1.25 } } } }
  ]);

  writeJsonl(path.join(jarvisDir, 'b.jsonl'), [
    { type: 'message', timestamp: today, message: { model: 'claude-sonnet-4-1', usage: { cost: { total: 2.75 } } } }
  ]);

  const result = collectCostFromSessionDirs([mainDir, jarvisDir]);
  assert.equal(Number(result.total.toFixed(2)), 4.00);
  const todayKey = now.toISOString().substring(0, 10);
  assert.equal(Number((result.perDay[todayKey] || 0).toFixed(2)), 4.00);
});

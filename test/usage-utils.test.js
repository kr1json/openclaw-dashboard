const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { collectUsageFromSessionDirs } = require('../usage-utils');

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

test('collectUsageFromSessionDirs aggregates 5h usage across multiple agent session dirs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-utils-'));
  const nowIso = new Date().toISOString();

  const mainDir = path.join(root, 'main', 'sessions');
  const jarvisDir = path.join(root, 'jarvis', 'sessions');

  writeJsonl(path.join(mainDir, 'a.jsonl'), [
    { type: 'message', timestamp: nowIso, message: { model: 'claude-opus-4-1', usage: { input: 10, output: 100 } } }
  ]);

  writeJsonl(path.join(jarvisDir, 'b.jsonl'), [
    { type: 'message', timestamp: nowIso, message: { model: 'claude-opus-4-1', usage: { input: 20, output: 200 } } }
  ]);

  const result = collectUsageFromSessionDirs([mainDir, jarvisDir], Date.now());
  assert.equal(result.perModel5h['claude-opus-4-1'].output, 300);
  assert.equal(result.perModel5h['claude-opus-4-1'].calls, 2);
});

const fs = require('fs');
const path = require('path');

function collectUsageFromSessionDirs(sessionDirs = [], now = Date.now()) {
  const fiveHoursMs = 5 * 3600000;
  const oneWeekMs = 7 * 86400000;
  const perModel5h = {};
  const perModelWeek = {};
  const recentMessages = [];

  for (const dir of sessionDirs) {
    let files = [];
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = path.join(dir, file);
      let lines = [];
      try {
        lines = fs.readFileSync(filePath, 'utf8').split('\n');
      } catch {
        continue;
      }

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const d = JSON.parse(line);
          if (d.type !== 'message') continue;
          const msg = d.message;
          if (!msg || !msg.usage) continue;
          const ts = d.timestamp ? new Date(d.timestamp).getTime() : 0;
          if (!ts) continue;
          const model = msg.model || 'unknown';
          const inTok = (msg.usage.input || 0) + (msg.usage.cacheRead || 0) + (msg.usage.cacheWrite || 0);
          const outTok = msg.usage.output || 0;
          const cost = msg.usage.cost ? msg.usage.cost.total || 0 : 0;

          if (now - ts < fiveHoursMs) {
            if (!perModel5h[model]) perModel5h[model] = { input: 0, output: 0, cost: 0, calls: 0 };
            perModel5h[model].input += inTok;
            perModel5h[model].output += outTok;
            perModel5h[model].cost += cost;
            perModel5h[model].calls++;
            recentMessages.push({ ts, model, input: inTok, output: outTok, cost });
          }

          if (now - ts < oneWeekMs) {
            if (!perModelWeek[model]) perModelWeek[model] = { input: 0, output: 0, cost: 0, calls: 0 };
            perModelWeek[model].input += inTok;
            perModelWeek[model].output += outTok;
            perModelWeek[model].cost += cost;
            perModelWeek[model].calls++;
          }
        } catch {}
      }
    }
  }

  recentMessages.sort((a, b) => b.ts - a.ts);
  return { perModel5h, perModelWeek, recentMessages };
}

module.exports = { collectUsageFromSessionDirs };

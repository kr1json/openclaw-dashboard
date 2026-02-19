const fs = require('fs');
const path = require('path');

function collectCostFromSessionDirs(sessionDirs = []) {
  const perModel = {};
  const perDay = {};
  const perSession = {};
  let total = 0;

  for (const dir of sessionDirs) {
    let files = [];
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'));
    } catch {
      continue;
    }

    for (const file of files) {
      const sid = file.replace('.jsonl', '');
      const filePath = path.join(dir, file);
      let lines = [];
      let scost = 0;

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
          if (!msg || !msg.usage || !msg.usage.cost) continue;
          const c = msg.usage.cost.total || 0;
          if (c <= 0) continue;
          const model = msg.model || 'unknown';
          if (model.includes('delivery-mirror')) continue;
          const ts = d.timestamp || '';
          const day = ts.substring(0, 10);
          perModel[model] = (perModel[model] || 0) + c;
          perDay[day] = (perDay[day] || 0) + c;
          scost += c;
          total += c;
        } catch {}
      }

      if (scost > 0) perSession[sid] = (perSession[sid] || 0) + scost;
    }
  }

  return { perModel, perDay, perSession, total };
}

module.exports = { collectCostFromSessionDirs };

function formatCronSchedule(schedule = {}) {
  const expr = schedule.expr || '';
  if (typeof expr === 'string' && expr.trim()) {
    try {
      const parts = expr.trim().split(/\s+/);
      if (parts.length === 5) {
        const [min, hour, , , dow] = parts;
        const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let readable = '';
        if (dow !== '*') readable = dowNames[parseInt(dow, 10)] || dow;
        if (hour !== '*' && min !== '*') readable += (readable ? ' ' : '') + `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        if (schedule.tz) readable += ` (${String(schedule.tz).split('/').pop()})`;
        if (readable) return readable;
      }
    } catch {}
    return expr;
  }

  if (schedule.kind === 'every' && Number.isFinite(schedule.everyMs) && schedule.everyMs > 0) {
    const minutes = Math.round(schedule.everyMs / 60000);
    if (minutes % 60 === 0) return `every ${minutes / 60}h`;
    return `every ${minutes}m`;
  }

  if (schedule.kind === 'at' && schedule.at) return `at ${schedule.at}`;
  return '--';
}

function toCronViewModel(job = {}) {
  return {
    id: job.id,
    name: job.name || String(job.id || '').substring(0, 8),
    schedule: formatCronSchedule(job.schedule || {}),
    enabled: job.enabled !== false,
    lastStatus: job.state?.lastStatus || 'unknown',
    lastRunAt: job.state?.lastRunAtMs || 0,
    nextRunAt: job.state?.nextRunAtMs || 0,
    lastDuration: job.state?.lastDurationMs || 0
  };
}

module.exports = {
  formatCronSchedule,
  toCronViewModel
};

(function () {
  const state = {
    latestCronJobs: [],
    cronUiState: {},
    deps: null,
    bound: false
  };

  function setCronUiState(id, patch) {
    state.cronUiState[id] = { ...(state.cronUiState[id] || {}), ...patch, updatedAt: Date.now() };
  }

  function renderCronJobs(crons = []) {
    state.latestCronJobs = crons;
    const now = Date.now();
    const { formatTimeAgo, escapeHtml } = state.deps || window;

    const cardsHtml = crons.map(c => {
      const ui = state.cronUiState[c.id] || {};
      const statusIcon = c.lastStatus === 'ok' ? '✅' : c.lastStatus === 'unknown' ? '⚪' : '❌';
      const nextAgo = c.nextRunAt > now ? formatTimeAgo(c.nextRunAt - now, true) : '--';
      const lastAgo = c.lastRunAt > 0 ? formatTimeAgo(now - c.lastRunAt, false) + ' ago' : '--';
      const toggleColor = c.enabled ? 'var(--green)' : 'var(--text-muted)';
      const toggleBg = c.enabled ? 'rgba(16,185,129,0.2)' : 'var(--bg-tertiary)';
      const isBusy = !!ui.pending;
      const feedbackColor = ui.error ? 'var(--red)' : ui.message ? 'var(--green)' : 'var(--text-muted)';
      const feedbackText = ui.pending ? '처리 중…' : (ui.error ? `실패: ${ui.error}` : (ui.message || ''));

      return `<div class="cron-job-row" onclick="window.openCronDetails('${c.id}')" style="cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;">
          <div style="min-width:0;">
            <div style="font-weight:700;font-size:13px;word-break:break-word;">${statusIcon} ${c.name}</div>
            <div class="mono" style="font-size:11px;color:var(--text-muted);margin-top:4px;word-break:break-all;">${c.id}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button onclick="event.stopPropagation();window.openCronDetails('${c.id}')" style="padding:4px 10px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;font-size:11px;cursor:pointer;">📄 Details</button>
            <button onclick="event.stopPropagation();window.toggleCronJob('${c.id}')" ${isBusy ? 'disabled' : ''} style="padding:4px 10px;background:${toggleBg};color:${toggleColor};border:1px solid var(--border);border-radius:6px;font-size:11px;font-weight:600;cursor:${isBusy ? 'not-allowed' : 'pointer'};opacity:${isBusy ? '0.6' : '1'};">${isBusy ? '…' : (c.enabled ? 'ON' : 'OFF')}</button>
            <button onclick="event.stopPropagation();window.runCronJob('${c.id}')" ${isBusy ? 'disabled' : ''} style="padding:4px 10px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;font-size:11px;cursor:${isBusy ? 'not-allowed' : 'pointer'};opacity:${isBusy ? '0.6' : '1'};">${isBusy ? 'Running…' : '▶ Run'}</button>
          </div>
        </div>
        <div class="mono" style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">${c.schedule || '--'}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">🧠 Prompt: ${escapeHtml(c.promptPreview || '(none)')}</div>
        <div style="font-size:11px;color:var(--text-muted);">Next: ${c.enabled ? nextAgo : 'disabled'} · Last run: ${lastAgo} · Duration: ${c.lastDuration ? (c.lastDuration / 1000).toFixed(1) + 's' : '--'}</div>
        <div style="font-size:11px;color:${feedbackColor};margin-top:6px;min-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${feedbackText}</div>
      </div>`;
    }).join('') || '<div class="empty-state-text">No cron jobs</div>';

    const overviewEl = document.getElementById('cronJobs');
    if (overviewEl) overviewEl.innerHTML = cardsHtml;
    const pageEl = document.getElementById('cronJobsPage');
    if (pageEl) pageEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">${cardsHtml}</div>`;
    const summaryEl = document.getElementById('cronSummary');
    if (summaryEl) {
      const enabled = crons.filter(c => c.enabled).length;
      const failed = crons.filter(c => c.lastStatus && c.lastStatus !== 'ok' && c.lastStatus !== 'unknown').length;
      summaryEl.innerHTML = `
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Total Jobs</div><div class="mono" style="font-size:24px;font-weight:700;">${crons.length}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Enabled</div><div class="mono" style="font-size:24px;font-weight:700;color:var(--green);">${enabled}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Recent Failures</div><div class="mono" style="font-size:24px;font-weight:700;color:${failed ? 'var(--red)' : 'var(--text-primary)'};">${failed}</div></div>
      `;
    }
  }

  function bindActions(deps) {
    if (state.bound) return;
    state.deps = deps;
    state.bound = true;

    window.toggleCronJob = async function(id) {
      setCronUiState(id, { pending: true, error: '', message: '' });
      renderCronJobs(state.latestCronJobs);
      try {
        const res = await deps.authFetch(`/api/cron/${encodeURIComponent(id)}/toggle`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Toggle failed');
        setCronUiState(id, { pending: false, error: '', message: `상태 변경 완료 (${data.enabled ? 'ON' : 'OFF'})` });
        deps.sendNotification('Cron Updated', `${id} is now ${data.enabled ? 'enabled' : 'disabled'}`);
        await deps.fetchNewData();
      } catch (e) {
        setCronUiState(id, { pending: false, error: e.message || 'Unknown error' });
        renderCronJobs(state.latestCronJobs);
        deps.sendNotification('Cron Toggle Failed', e.message || 'Unknown error');
      }
    };

    window.runCronJob = async function(id) {
      setCronUiState(id, { pending: true, error: '', message: '' });
      renderCronJobs(state.latestCronJobs);
      try {
        const res = await deps.authFetch(`/api/cron/${encodeURIComponent(id)}/run`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Run failed');
        setCronUiState(id, { pending: false, error: '', message: '수동 실행 요청 완료' });
        renderCronJobs(state.latestCronJobs);
        deps.sendNotification('Cron Job Started', `Running cron job ${id}...`);
        setTimeout(() => deps.fetchNewData(), 1200);
      } catch (e) {
        setCronUiState(id, { pending: false, error: e.message || 'Unknown error' });
        renderCronJobs(state.latestCronJobs);
        deps.sendNotification('Cron Run Failed', e.message || 'Unknown error');
      }
    };

    window.openCronDetails = async function(id) {
      const cron = (state.latestCronJobs || []).find(x => x.id === id);
      const modal = document.getElementById('sessionModal');
      if (!modal) return;

      modal.querySelector('#modalTitle').textContent = `Cron: ${cron?.name || id}`;
      modal.querySelector('#modalKey').textContent = id;
      modal.querySelector('#modalStats').innerHTML = `
        <div style="grid-column:1 / span 2;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Prompt</div>
          <pre style="white-space:pre-wrap;word-break:break-word;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;line-height:1.5;max-height:190px;overflow:auto;">${deps.escapeHtml(cron?.prompt || '(no prompt)')}</pre>
        </div>
      `;

      const messagesEl = modal.querySelector('#modalMessages');
      messagesEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">Loading cron runs...</div>';
      modal.style.display = 'flex';

      try {
        const res = await deps.authFetch(`/api/cron/${encodeURIComponent(id)}/runs?limit=20`);
        const runs = await res.json();
        if (!res.ok) throw new Error(runs?.error || 'Failed to load runs');

        messagesEl.innerHTML = (runs || []).map((r, idx) => {
          const statusIcon = r.status === 'ok' ? '✅' : r.status === 'error' ? '❌' : '⚪';
          const runAt = r.runAtMs ? new Date(r.runAtMs).toLocaleString() : '-';
          const duration = r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '-';
          const summary = deps.escapeHtml(String(r.summary || r.error || '')).replace(/\n/g, '<br>');
          return `<div style="padding:10px 0;border-bottom:${idx === runs.length - 1 ? 'none' : '1px solid var(--border)'};">
            <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;">
              <span>${statusIcon} <strong>${deps.escapeHtml(r.status || '-')}</strong></span>
              <span class="mono" style="color:var(--text-muted);">${deps.escapeHtml(runAt)} · ${deps.escapeHtml(duration)}</span>
            </div>
            <div style="margin-top:6px;font-size:12px;color:var(--text-secondary);line-height:1.5;">${summary || '<span style="color:var(--text-muted);">(no summary)</span>'}</div>
          </div>`;
        }).join('') || '<div style="color:var(--text-muted);font-size:13px;">No runs yet.</div>';
      } catch (e) {
        messagesEl.innerHTML = `<div style="color:var(--red);font-size:13px;">Failed to load cron runs: ${deps.escapeHtml(e.message || 'Unknown error')}</div>`;
      }
    };
  }

  window.CronUI = { renderCronJobs, bindActions };
})();

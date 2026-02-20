window.checkMFAStatus = async function checkMFAStatus() {
  try {
    const res = await authFetch(API_BASE + '/api/auth/mfa-status');
    const data = await res.json();
    const enabled = data.enabled;

    const indicator = document.getElementById('mfaStatusIndicator');
    if (enabled) {
      indicator.textContent = '🔒 MFA Enabled';
      indicator.style.background = 'rgba(16,185,129,0.15)';
      indicator.style.color = 'var(--green)';
      indicator.style.border = '1px solid rgba(16,185,129,0.3)';
      document.getElementById('mfaEnabledView').style.display = 'block';
      document.getElementById('mfaDisabledView').style.display = 'none';
    } else {
      indicator.textContent = '⚠️ MFA Disabled';
      indicator.style.background = 'rgba(245,158,11,0.15)';
      indicator.style.color = 'var(--yellow)';
      indicator.style.border = '1px solid rgba(245,158,11,0.3)';
      document.getElementById('mfaEnabledView').style.display = 'none';
      document.getElementById('mfaDisabledView').style.display = 'block';
    }
    indicator.style.display = 'block';
    document.getElementById('mfaSetupView').style.display = 'none';
  } catch (err) {
    console.error('Failed to check MFA status:', err);
  }
};

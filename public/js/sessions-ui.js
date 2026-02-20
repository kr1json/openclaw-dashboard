window.showApp = function showApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  fetchData();
  fetchNewData();
  fetchHealthHistory();
  fetchMemoryFiles();
  fetchKeyFiles();
  checkMFAStatus();

  if (localStorage.getItem('usageAutoRefresh') === '1') {
    const cb = document.getElementById('usageAutoRefresh');
    if (cb) { cb.checked = true; toggleUsageAutoRefresh(true, true); }
  }
  setInterval(fetchData, 5000);
  setInterval(fetchNewData, 15000);
  setInterval(fetchHealthHistory, 60000);
  setInterval(fetchMemoryFiles, 30000);
  setInterval(fetchKeyFiles, 30000);
};

window.showLogin = function showLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
};

window.checkAuth = async function checkAuth() {
  try {
    const statusRes = await fetch(API_BASE + '/api/auth/status');
    const statusData = await statusRes.json();

    const token = getStoredToken();

    if (token) {
      const verifyRes = await fetch(API_BASE + '/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (verifyRes.ok) {
        showApp();
        return;
      } else {
        clearStoredToken();
      }
    }

    if (statusData.registered === false) {
      showRegistrationForm();
      showLogin();
    } else {
      showLoginForm();
      showLogin();
    }
  } catch (err) {
    showLoginForm();
    showLogin();
  }
};

window.handleLogout = async function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;

  try {
    await authFetch(API_BASE + '/api/auth/logout', { method: 'POST' });
  } catch (e) {
  }

  clearStoredToken();
  location.reload();
};

window.showRegistrationForm = function showRegistrationForm() {
  document.getElementById('authTitle').textContent = 'Create Account';
  document.getElementById('authSubtitle').textContent = 'Set up your dashboard credentials';
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('recoveryForm').style.display = 'none';
  setTimeout(() => {
    const el = document.getElementById('regUsername');
    if (el) el.focus();
  }, 100);
};

window.showLoginForm = function showLoginForm() {
  document.getElementById('authTitle').textContent = 'Dashboard Login';
  document.getElementById('authSubtitle').textContent = 'Enter your credentials';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('recoveryForm').style.display = 'none';
  document.getElementById('usernameInputContainer').style.display = 'block';
  document.getElementById('passwordInputContainer').style.display = 'block';
  document.getElementById('totpInputContainer').style.display = 'none';
  setTimeout(() => {
    const el = document.getElementById('username');
    if (el) el.focus();
  }, 100);
};

window.showRecoveryForm = function showRecoveryForm() {
  document.getElementById('authTitle').textContent = 'Reset Password';
  document.getElementById('authSubtitle').textContent = 'Enter recovery token and new password';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('recoveryForm').style.display = 'block';
  setTimeout(() => {
    const el = document.getElementById('recoveryToken');
    if (el) el.focus();
  }, 100);
};

window.calculatePasswordStrength = function calculatePasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
  return Math.min(strength, 100);
};

document.addEventListener('DOMContentLoaded', () => {
  const regPassword = document.getElementById('regPassword');
  const strengthBar = document.getElementById('passwordStrengthBar');
  const strengthText = document.getElementById('passwordStrengthText');

  if (regPassword && strengthBar && strengthText) {
    regPassword.addEventListener('input', (e) => {
      const password = e.target.value;
      const strength = calculatePasswordStrength(password);
      strengthBar.style.width = strength + '%';

      if (strength < 40) {
        strengthBar.style.background = 'var(--red)';
        strengthText.textContent = 'Weak password';
        strengthText.style.color = 'var(--red)';
      } else if (strength < 70) {
        strengthBar.style.background = 'var(--yellow)';
        strengthText.textContent = 'Medium strength';
        strengthText.style.color = 'var(--yellow)';
      } else {
        strengthBar.style.background = 'var(--green)';
        strengthText.textContent = 'Strong password';
        strengthText.style.color = 'var(--green)';
      }
    });
  }
});

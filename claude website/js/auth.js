// ─── PersonalQ Auth (localStorage mode) ─────────────────────────
// When Supabase is configured, swap this file for the real OAuth flow.
// For now, accounts are stored locally so the full flow works.

const USERS_KEY = 'personalq_users';

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch { return []; }
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

// ─── Card switching ──────────────────────────────────────────────
function showCard(card) {
  document.getElementById('login-card').classList.toggle('hidden', card !== 'login');
  document.getElementById('register-card').classList.toggle('hidden', card !== 'register');
  document.getElementById('otp-card').classList.toggle('hidden', card !== 'otp');
  clearErrors();
}

// ─── Helpers ─────────────────────────────────────────────────────
function isEmail(val) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); }
function isPhone(val) { return /^\+?[0-9\s\-().]{7,15}$/.test(val); }

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  if (loading) { btn.dataset.label = btn.textContent; btn.textContent = 'Please wait...'; }
  else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
}

function showError(id, msg) { document.getElementById(id).textContent = msg; }
function clearErrors() {
  ['login-error', 'reg-error', 'otp-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function togglePassword(id) {
  const input = document.getElementById(id);
  const span = input.parentElement.querySelector('.toggle-pw');
  if (input.type === 'password') { input.type = 'text'; span.textContent = 'Hide'; }
  else { input.type = 'password'; span.textContent = 'Show'; }
}

// ─── REGISTER ────────────────────────────────────────────────────
function handleRegister(e) {
  e.preventDefault();
  clearErrors();

  const name       = document.getElementById('reg-name').value.trim();
  const identifier = document.getElementById('reg-identifier').value.trim();
  const password   = document.getElementById('reg-password').value;

  if (!name) return showError('reg-error', 'Please enter your name.');
  if (!identifier) return showError('reg-error', 'Please enter an email or phone number.');
  if (!isEmail(identifier) && !isPhone(identifier)) {
    return showError('reg-error', 'Enter a valid email address or phone number.');
  }
  if (password.length < 6) return showError('reg-error', 'Password must be at least 6 characters.');

  const users = getUsers();
  const exists = users.find(u => u.identifier.toLowerCase() === identifier.toLowerCase());
  if (exists) return showError('reg-error', 'An account with this email/phone already exists.');

  // Save user
  users.push({ name, identifier, password });
  saveUsers(users);

  // Store current session
  localStorage.setItem('personalq_session', JSON.stringify({ name, identifier }));
  localStorage.setItem('personalq_first_login', 'true');

  // Go to dashboard
  window.location.href = 'index.html';
}

// ─── LOGIN ───────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  clearErrors();

  const identifier = document.getElementById('login-identifier').value.trim();
  const password   = document.getElementById('login-password').value;

  if (!identifier) return showError('login-error', 'Enter your email or phone number.');
  if (!password)   return showError('login-error', 'Enter your password.');

  const users = getUsers();

  // Find user by email, phone, or name
  const user = users.find(u =>
    u.identifier.toLowerCase() === identifier.toLowerCase() ||
    u.name.toLowerCase() === identifier.toLowerCase()
  );

  if (!user) return showError('login-error', 'No account found. Please register first.');
  if (user.password !== password) return showError('login-error', 'Incorrect password.');

  // Store session
  localStorage.setItem('personalq_session', JSON.stringify({ name: user.name, identifier: user.identifier }));
  window.location.href = 'index.html';
}

// ─── Social sign-in (placeholder until Supabase is configured) ───
function signInWithGoogle() {
  alert('Google sign-in requires Supabase setup. Coming soon!');
}
function signInWithX() {
  alert('X sign-in requires Supabase setup. Coming soon!');
}

// ─── OTP (skipped in localStorage mode) ──────────────────────────
function handleOTP(e) { e.preventDefault(); }
function resendCode() {}

// ─── Guard: redirect if already logged in ────────────────────────
(function() {
  const session = localStorage.getItem('personalq_session');
  if (session) window.location.href = 'index.html';
})();

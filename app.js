const { createClient } = window.supabase;

const SUPABASE_URL = 'https://vihbsfrwnslnmheowkhy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RNvbXKwTRLQU5WIYmX0A-g_zokdaYLe';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const SITE_URL = window.location.origin + window.location.pathname;
const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authConfirmPassword = document.getElementById('authConfirmPassword');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
const passwordStrengthBar = document.getElementById('passwordStrengthBar');
const passwordStrengthText = document.getElementById('passwordStrengthText');
const authSubmit = document.getElementById('authSubmit');
const authToggle = document.getElementById('authToggle');
const forgotPassword = document.getElementById('forgotPassword');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authMessage = document.getElementById('authMessage');
const signOut = document.getElementById('signOut');
const userEmail = document.getElementById('userEmail');

let signUpMode = false;

function showMessage(text, error = false) {
  authMessage.textContent = text;
  authMessage.className = `auth-message ${error ? 'error' : ''}`;
}

function renderAuth() {
  authScreen.classList.remove('hidden');
  appShell.classList.add('hidden');
}

function renderApp(user) {
  authScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  userEmail.textContent = user?.email || '';
}

async function checkSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) showMessage(error.message, true);
  if (data.session?.user) renderApp(data.session.user);
  else renderAuth();
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) renderApp(session.user);
  else renderAuth();
});

function setupVisibilityToggle(input, button) {
  if (!input || !button) return;
  button.addEventListener('click', () => {
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.textContent = visible ? '👁' : '🙈';
    button.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
    button.title = visible ? 'Show password' : 'Hide password';
  });
}

setupVisibilityToggle(authPassword, togglePassword);
setupVisibilityToggle(authConfirmPassword, toggleConfirmPassword);

function updatePasswordStrength() {
  if (!passwordStrengthBar || !passwordStrengthText) return;
  const password = authPassword.value;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  passwordStrengthBar.style.width = `${score * 20}%`;
  passwordStrengthText.textContent = score === 0 ? 'Use 8+ characters with uppercase, lowercase, number and symbol.' :
    score < 3 ? 'Weak password — add more character types.' :
    score < 5 ? 'Good password — add more variety.' : 'Strong password ✓';
  passwordStrengthText.className = `password-strength-text strength-${score}`;
}

authPassword.addEventListener('input', updatePasswordStrength);

try {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const errorDescription = params.get('error_description');
  if (errorDescription) showMessage(decodeURIComponent(errorDescription.replace(/\+/g, ' ')), true);
} catch (_) {}

function setAuthMode(createAccount) {
  signUpMode = createAccount;
  authTitle.textContent = createAccount ? 'Create your account' : 'Welcome back';
  authSubtitle.textContent = createAccount
    ? 'Join Veylola AI and start your private workspace'
    : 'Sign in to your private AI workspace';
  authSubmit.innerHTML = createAccount ? '<span>Create account</span><b>→</b>' : '<span>Sign in</span><b>→</b>';
  authToggle.innerHTML = createAccount
    ? 'Already have an account? <span>Sign in →</span>'
    : 'Create your Veylola account <span>→</span>';
  forgotPassword.style.display = createAccount ? 'none' : 'block';
  confirmPasswordGroup.classList.toggle('hidden-field', !createAccount);
  authConfirmPassword.required = createAccount;
  authPassword.minLength = createAccount ? 8 : 6;
  authPassword.autocomplete = createAccount ? 'new-password' : 'current-password';
  if (!createAccount) authConfirmPassword.value = '';
  updatePasswordStrength();
  showMessage('');
  if (createAccount) setTimeout(() => authPassword.focus(), 50);
}

authToggle.addEventListener('click', (event) => {
  event.preventDefault();
  setAuthMode(!signUpMode);
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const confirmPassword = authConfirmPassword.value;

  if (!email || !password) {
    showMessage('Enter your email and password.', true);
    return;
  }

  if (signUpMode) {
    if (password.length < 8) {
      showMessage('Password must be at least 8 characters.', true);
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      showMessage('Use uppercase, lowercase and at least one number in your password.', true);
      return;
    }
    if (password !== confirmPassword) {
      showMessage('Passwords do not match. Please check both password fields.', true);
      return;
    }
  }

  authSubmit.disabled = true;
  showMessage(signUpMode ? 'Creating your account...' : 'Signing you in...');

  try {
    if (signUpMode) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: SITE_URL }
      });
      if (error) throw error;

      if (data.session && data.user) {
        renderApp(data.user);
      } else {
        showMessage('Account created successfully. Check your email and confirm your account, then sign in.');
        setAuthMode(false);
        authEmail.value = email;
        authPassword.value = '';
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const message = (error.message || '').toLowerCase();
        if (message.includes('email not confirmed')) {
          throw new Error('Your email is not confirmed yet. Check your inbox, confirm your account, then sign in.');
        }
        throw error;
      }
      if (data.user) renderApp(data.user);
    }
  } catch (error) {
    const message = error.message || 'Authentication failed.';
    if (message.toLowerCase().includes('user already registered')) {
      showMessage('This email already has an account. Switch to Sign in.', true);
    } else {
      showMessage(message, true);
    }
  } finally {
    authSubmit.disabled = false;
  }
});

forgotPassword.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) {
    showMessage('Enter your email address first.', true);
    authEmail.focus();
    return;
  }
  forgotPassword.disabled = true;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL });
    if (error) throw error;
    showMessage('Password reset email sent. Check your inbox and follow the link.');
  } catch (error) {
    showMessage(error.message || 'Could not send the reset email.', true);
  } finally {
    forgotPassword.disabled = false;
  }
});

signOut.addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) showMessage(error.message, true);
});

const messages = document.getElementById('messages');
const form = document.getElementById('chatForm');
const input = document.getElementById('prompt');
const send = document.getElementById('send');
let history = [];

function addMessage(role, text) {
  const welcome = messages.querySelector('.welcome');
  if (welcome) welcome.remove();
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.innerHTML = `<div class="avatar">${role === 'user' ? 'You' : 'V'}</div><div class="message-content"></div>`;
  el.querySelector('.message-content').textContent = text;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el.querySelector('.message-content');
}

async function ask(text) {
  addMessage('user', text);
  history.push({ role: 'user', content: text });
  send.disabled = true;
  const out = addMessage('assistant', 'Thinking...');
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Request failed');
    out.textContent = data.reply;
    history.push({ role: 'assistant', content: data.reply });
  } catch (e) {
    out.textContent = 'Veylola AI could not connect right now. Check your API deployment and key.';
  } finally {
    send.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  ask(text);
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 150) + 'px';
});

document.querySelectorAll('.suggestions button').forEach((button) => {
  button.onclick = () => {
    input.value = button.textContent;
    form.requestSubmit();
  };
});

document.getElementById('newChat').onclick = () => {
  history = [];
  messages.innerHTML = '<div class="welcome"><div class="welcome-icon">V</div><h2>How can I help you today?</h2><p>Ask Veylola AI anything.</p></div>';
  input.focus();
};

checkSession();

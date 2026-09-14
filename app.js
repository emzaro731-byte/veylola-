const { createClient } = window.supabase;

const SUPABASE_URL = 'https://vihbsfrwnslnmheowkhy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RNvbXKwTRLQU5WIYmX0A-g_zokdaYLe';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmit = document.getElementById('authSubmit');
const authToggle = document.getElementById('authToggle');
const forgotPassword = document.getElementById('forgotPassword');
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
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) renderApp(data.session.user);
  else renderAuth();
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) renderApp(session.user);
  else renderAuth();
});

authToggle.addEventListener('click', () => {
  signUpMode = !signUpMode;
  authSubtitle.textContent = signUpMode ? 'Create your Veylola AI account' : 'Sign in to continue';
  authSubmit.textContent = signUpMode ? 'Create account' : 'Sign in';
  authToggle.textContent = signUpMode ? 'Already have an account? Sign in' : 'Create an account';
  forgotPassword.style.display = signUpMode ? 'none' : 'block';
  showMessage('');
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  authSubmit.disabled = true;
  showMessage(signUpMode ? 'Creating your account...' : 'Signing you in...');

  try {
    if (signUpMode) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      showMessage('Account created. Check your email to confirm your account.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (error) {
    showMessage(error.message || 'Authentication failed.', true);
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?reset=1`
    });
    if (error) throw error;
    showMessage('Password reset email sent. Check your inbox.');
  } catch (error) {
    showMessage(error.message || 'Could not send the reset email.', true);
  } finally {
    forgotPassword.disabled = false;
  }
});

signOut.addEventListener('click', async () => {
  await supabase.auth.signOut();
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

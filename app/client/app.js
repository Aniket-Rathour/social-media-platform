const apiLogs = document.getElementById('apiLogs');
const toastEl = document.getElementById('toast');
const healthBadge = document.getElementById('healthBadge');
const sessionBadge = document.getElementById('sessionBadge');
const sessionDetails = document.getElementById('sessionDetails');
const logoutBtn = document.getElementById('logoutBtn');
const postsList = document.getElementById('postsList');

function logAPI(type, method, url, status, data) {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  const time = new Date().toLocaleTimeString();
  const statusBadge = status ? `[${status}]` : '';
  entry.innerHTML = `
    <div class="log-title">
      <span>${time}</span>
      <strong>${method} ${url}</strong>
      <span>${statusBadge}</span>
    </div>
    <div class="log-json">${escapeHTML(typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data))}</div>
  `;
  apiLogs.prepend(entry);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = `toast toast-${isError ? 'error' : 'success'}`;
  setTimeout(() => {
    toastEl.className = 'toast hidden';
  }, 4000);
}

async function apiRequest(endpoint, options = {}) {
  const url = endpoint;
  const method = options.method || 'GET';
  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(url, fetchOptions);
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const errMsg = (data && data.error) ? data.error : `HTTP ${res.status}`;
      logAPI('error', method, url, res.status, data);
      throw new Error(errMsg);
    }

    logAPI('success', method, url, res.status, data);
    return data;
  } catch (err) {
    if (!err.message.includes('HTTP')) {
      logAPI('error', method, url, 'FAIL', err.message);
    }
    throw err;
  }
}

async function checkHealth() {
  try {
    const data = await apiRequest('/health');
    healthBadge.textContent = 'API Online';
    healthBadge.className = 'badge badge-online';
  } catch (err) {
    healthBadge.textContent = 'API Offline';
    healthBadge.className = 'badge badge-neutral';
  }
}

let currentUser = null;

async function checkSession() {
  try {
    const data = await apiRequest('/me');
    currentUser = data;
    sessionBadge.textContent = `@${data.username} (id: ${data.user_id})`;
    sessionBadge.className = 'badge badge-active-user';
    sessionDetails.innerHTML = `
      <div><strong>Authenticated as:</strong> ${escapeHTML(data.username)}</div>
      <div><strong>User ID:</strong> ${data.user_id}</div>
      <div class="muted">Cookie session is active and verified by server.</div>
    `;
    logoutBtn.classList.remove('hidden');
  } catch (err) {
    currentUser = null;
    sessionBadge.textContent = 'Guest';
    sessionBadge.className = 'badge badge-neutral';
    sessionDetails.innerHTML = `<p class="muted">No active session detected. Log in or sign up above.</p>`;
    logoutBtn.classList.add('hidden');
  }
}

async function loadPosts(userId = null) {
  postsList.innerHTML = '<p class="muted">Loading posts...</p>';
  try {
    const endpoint = userId ? `/posts?user_id=${encodeURIComponent(userId)}` : '/posts';
    const data = await apiRequest(endpoint);
    const posts = data.posts || [];
    if (posts.length === 0) {
      postsList.innerHTML = '<p class="muted">No posts found.</p>';
      return;
    }

    postsList.innerHTML = posts.map(post => `
      <div class="post-item">
        <div class="post-header">
          <span class="post-title">${escapeHTML(post.title)}</span>
          <div class="post-meta">
            <span>Author: ${post.user_id !== null ? `#${post.user_id}` : '<em>Unlinked</em>'}</span>
            <span>&bull;</span>
            <span>${new Date(post.created_at).toLocaleString()}</span>
          </div>
        </div>
        <div class="post-body">${escapeHTML(post.content)}</div>
      </div>
    `).join('');
  } catch (err) {
    postsList.innerHTML = `<p class="muted" style="color: var(--danger)">Failed to load posts: ${escapeHTML(err.message)}</p>`;
  }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  try {
    const data = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    showToast(`Account created for @${data.user.username}!`);
    document.getElementById('signupForm').reset();
    await checkSession();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    showToast(`Welcome back, @${data.user.username}!`);
    document.getElementById('loginForm').reset();
    await checkSession();
  } catch (err) {
    showToast(err.message, true);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await apiRequest('/logout', { method: 'POST' });
    showToast('Logged out successfully');
    await checkSession();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById('refreshSessionBtn').addEventListener('click', checkSession);

document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  const rawUserId = document.getElementById('postUserId').value.trim();

  const payload = { title, content };
  if (rawUserId !== '') {
    payload.user_id = parseInt(rawUserId, 10);
  }

  try {
    await apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast('Post created successfully!');
    document.getElementById('postForm').reset();
    await loadPosts();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById('filterBtn').addEventListener('click', () => {
  const userId = document.getElementById('filterUserId').value.trim();
  loadPosts(userId || null);
});

document.getElementById('refreshPostsBtn').addEventListener('click', () => {
  document.getElementById('filterUserId').value = '';
  loadPosts();
});

document.getElementById('clearConsoleBtn').addEventListener('click', () => {
  apiLogs.innerHTML = '<div class="log-entry log-info">Logs cleared.</div>';
});

checkHealth();
checkSession();
loadPosts();

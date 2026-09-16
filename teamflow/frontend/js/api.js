/**
 * FlowVibe Core API Client & Utilities
 * Pure Vanilla JavaScript ES6+ Fetch Wrapper
 */

const API_BASE = window.location.origin.includes('5500') || window.location.origin.includes('3000') || window.location.protocol === 'file:'
  ? 'http://127.0.0.1:8000/api'
  : '/api';

let cachedCsrfToken = null;

/**
 * Get cookie value by name
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Fetch fresh CSRF Token from backend
 */
async function fetchCsrfToken() {
  const cookieVal = getCookie('csrftoken');
  if (cookieVal) {
    cachedCsrfToken = cookieVal;
    return cookieVal;
  }
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const res = await fetch(`${API_BASE}/auth/csrf/`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      cachedCsrfToken = data.csrfToken || getCookie('csrftoken');
      return cachedCsrfToken;
    }
  } catch (err) {
    console.warn('Could not fetch CSRF token automatically:', err);
  }
  return '';
}

/**
 * Core Request wrapper
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  // Attach CSRF for mutating methods
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = await fetchCsrfToken();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const config = {
    ...options,
    method,
    headers,
    credentials: 'include', // essential for session auth cookies
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // Handle 204 No Content
    if (response.status === 204) {
      return { ok: true, status: 204 };
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // If 401 Unauthorized, notify or handle redirect
      if (response.status === 401 && !window.location.pathname.includes('login') && !window.location.pathname.includes('register') && window.location.pathname !== '/' && !window.location.pathname.includes('index')) {
        console.warn('Unauthorized request - session expired');
      }
      
      const errorMsg = data.detail || (typeof data === 'object' ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ') : 'An unexpected error occurred');
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`API Error [${method} ${url}]:`, error);
    throw error;
  }
}

export const api = {
  get: (endpoint, params = {}) => {
    let url = endpoint;
    const query = new URLSearchParams(params).toString();
    if (query) url += (url.includes('?') ? '&' : '?') + query;
    return request(url, { method: 'GET' });
  },
  post: (endpoint, data) => request(endpoint, { method: 'POST', body: data }),
  put: (endpoint, data) => request(endpoint, { method: 'PUT', body: data }),
  patch: (endpoint, data) => request(endpoint, { method: 'PATCH', body: data }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

/**
 * Toast Notification System
 */
export function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  
  toast.innerHTML = `
    <span style="font-weight: 700; font-size: 1.1rem;">${icon}</span>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button style="color: var(--text-muted); font-size: 1rem; padding: 0 4px;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Helper to escape HTML to prevent XSS
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Relative time formatter
 */
export function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format Date (YYYY-MM-DD or readable)
 */
export function formatDate(dateString) {
  if (!dateString) return 'No due date';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

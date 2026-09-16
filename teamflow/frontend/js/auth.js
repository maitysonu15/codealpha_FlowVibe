/**
 * FlowVibe Authentication & Session Manager
 */

import { api, showToast, escapeHtml } from './api.js';
import { firebaseAuthService } from './firebase-auth.js';

let currentUser = null;

export const auth = {
  /**
   * Get current authenticated user
   */
  async getCurrentUser(forceRefresh = false) {
    if (currentUser && !forceRefresh) return currentUser;
    try {
      currentUser = await api.get('/auth/user/');
      return currentUser;
    } catch (err) {
      currentUser = null;
      return null;
    }
  },

  /**
   * Login with username/email and password
   */
  async login(username, password) {
    try {
      const user = await api.post('/auth/login/', { username, password });
      currentUser = user;
      showToast(`Welcome back, ${user.first_name || user.username}!`, 'success');
      return user;
    } catch (err) {
      showToast(err.message || 'Login failed. Please check credentials.', 'error');
      throw err;
    }
  },

  /**
   * Register new user
   */
  async register(data) {
    try {
      const user = await api.post('/auth/register/', data);
      currentUser = user;
      showToast('Account created successfully!', 'success');
      return user;
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
      throw err;
    }
  },

  /**
   * Logout current user from FlowVibe and Firebase
   */
  async logout() {
    try {
      await firebaseAuthService.signOut();
      await api.post('/auth/logout/');
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      currentUser = null;
      try {
        sessionStorage.setItem('flowvibe_logout_toast', '1');
      } catch (e) {}
      showToast('Logged out successfully.', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 350);
    }
  },

  /**
   * Require authenticated session; redirect to login if not authenticated
   */
  async requireAuth() {
    const user = await this.getCurrentUser();
    if (!user) {
      const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `login.html?redirect=${currentUrl}`;
      return null;
    }
    this.renderUserNav(user);
    return user;
  },

  /**
   * Redirect to dashboard if already authenticated
   */
  async redirectIfAuth() {
    const user = await this.getCurrentUser();
    if (user) {
      window.location.href = 'dashboard.html';
      return user;
    }
    return null;
  },

  /**
   * Populate sidebar and navbar with current user data
   */
  renderUserNav(user) {
    if (!user) return;

    // Mini user in sidebar
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarRole = document.getElementById('sidebar-user-role');
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');

    if (sidebarName) sidebarName.textContent = user.first_name ? `${user.first_name} ${user.last_name}` : user.username;
    if (sidebarRole) sidebarRole.textContent = user.role_title || user.email;
    if (sidebarAvatar) {
      sidebarAvatar.textContent = user.initials;
      sidebarAvatar.style.backgroundColor = user.avatar_color || '#6366F1';
    }

    // Topbar User
    const topbarName = document.getElementById('topbar-user-name');
    const topbarAvatar = document.getElementById('topbar-user-avatar');

    if (topbarName) topbarName.textContent = user.first_name ? `${user.first_name} ${user.last_name}` : user.username;
    if (topbarAvatar) {
      topbarAvatar.textContent = user.initials;
      topbarAvatar.style.backgroundColor = user.avatar_color || '#6366F1';
    }

    // Logout button handler
    const logoutBtns = document.querySelectorAll('.btn-logout');
    logoutBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.logout();
      };
    });
  }
};

// Global Sidebar Toggle Helper
window.toggleSidebarCollapse = () => {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  if (window.innerWidth <= 1024) {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  } else {
    sidebar.classList.toggle('sidebar-collapsed');
    const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
    try {
      localStorage.setItem('flowvibe_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    } catch (e) {}
  }
};

window.toggleMobileSidebar = () => {
  window.toggleSidebarCollapse();
};

// Auto-restore desktop collapsed state if saved
try {
  if (window.innerWidth > 1024 && (localStorage.getItem('flowvibe_sidebar_collapsed') === 'true' || localStorage.getItem('syncspace_sidebar_collapsed') === 'true')) {
    document.addEventListener('DOMContentLoaded', () => {
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar) sidebar.classList.add('sidebar-collapsed');
    });
  }
} catch (e) {}

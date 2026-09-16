
/**
 * FlowVibe Project Details & Kanban Page Controller
 */

import { api, showToast, escapeHtml } from './api.js';
import { auth } from './auth.js';
import { tasksManager } from './tasks.js';
import { commentsManager } from './comments.js';
import { ProjectSocket } from './websocket.js';
import { SyncDatePicker } from './datepicker.js';

let currentProject = null;
let currentUser = null;
let projectSocket = null;
let searchTimeout = null;

async function initProjectPage() {
  currentUser = await auth.requireAuth();
  if (!currentUser) return;

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  if (!projectId) {
    showToast('Project ID not specified.', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
    return;
  }

  // Initialize custom glassmorphic datepickers across the page
  SyncDatePicker.initAll();

  await loadProject(projectId);
  setupEvents();
  initWebSocket(projectId);
}

async function loadProject(projectId) {
  try {
    const project = await api.get(`/projects/${projectId}/`);
    currentProject = project;

    renderProjectHeader(project);

    // Initialize tasks manager
    tasksManager.init(project.id, project.members, currentUser);
    await tasksManager.loadTasks();

    // Populate filter assignee dropdown
    renderFilterAssignees(project.members);
  } catch (err) {
    showToast(err.message || 'Failed to load project.', 'error');
    if (err.status === 403 || err.status === 404) {
      setTimeout(() => window.location.href = 'dashboard.html', 2000);
    }
  }
}

function renderProjectHeader(project) {
  document.title = `${project.name} — FlowVibe`;

  const titleEl = document.getElementById('project-title');
  const descEl = document.getElementById('project-desc');
  const membersGroup = document.getElementById('project-members-group');
  const ownerBadge = document.getElementById('project-owner-badge');
  const metaBadges = document.getElementById('project-meta-badges');

  if (titleEl) titleEl.textContent = project.name;
  if (descEl) descEl.textContent = project.description || '⚡ Collaborative Kanban workspace — Track tasks, assign teammates, and synchronize progress in real-time.';
  
  if (ownerBadge) {
    ownerBadge.style.display = project.is_owner ? 'inline-flex' : 'none';
  }

  // Render Category, Status, and Timeline Badges
  if (metaBadges) {
    const categoryLabels = {
      'PRODUCT': '🚀 Product & Engineering',
      'DESIGN': '🎨 UI/UX & Brand Design',
      'MARKETING': '📈 Marketing & Growth',
      'OPERATIONS': '💼 Client & Operations',
      'INFRA': '🛡️ Security & Infrastructure'
    };

    const statusLabels = {
      'ACTIVE': { text: '🟢 Active', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#10B981' },
      'PLANNING': { text: '🟡 Planning', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#F59E0B' },
      'ON_HOLD': { text: '⏸️ On Hold', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.35)', color: '#CBD5E1' },
      'COMPLETED': { text: '🏁 Shipped', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)', color: '#818CF8' }
    };

    const catText = categoryLabels[project.category] || '🚀 Product & Engineering';
    const statInfo = statusLabels[project.status] || statusLabels['ACTIVE'];

    let timelineHtml = '';
    if (project.start_date || project.target_date) {
      const startStr = project.start_date ? project.start_date : '';
      const endStr = project.target_date ? project.target_date : '';
      const dateText = startStr && endStr ? `${startStr} → ${endStr}` : (endStr ? `Target: ${endStr}` : `Started: ${startStr}`);
      timelineHtml = `
        <span class="badge" style="background: rgba(56, 189, 248, 0.12); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.82rem; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
          📅 ${dateText}
        </span>
      `;
    }

    metaBadges.innerHTML = `
      <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #C7D2FE; border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.82rem; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
        ${catText}
      </span>
      <span class="badge" style="background: ${statInfo.bg}; color: ${statInfo.color}; border: 1px solid ${statInfo.border}; font-size: 0.82rem; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
        ${statInfo.text}
      </span>
      ${timelineHtml}
    `;
  }

  if (membersGroup) {
    membersGroup.innerHTML = (project.members || []).map(m => `
      <div class="avatar" title="${escapeHtml(m.first_name ? `${m.first_name} ${m.last_name}` : m.username)} (@${m.username})" style="background-color: ${m.avatar_color || '#6366F1'};">
        ${escapeHtml(m.initials || 'U')}
      </div>
    `).join('');
  }
}

function renderFilterAssignees(members) {
  const select = document.getElementById('filter-assignee');
  if (!select) return;

  select.innerHTML = `
    <option value="">All Members</option>
    <option value="unassigned">Unassigned</option>
    ${members.map(m => `
      <option value="${m.id}">${escapeHtml(m.first_name ? `${m.first_name} ${m.last_name}` : m.username)}</option>
    `).join('')}
  `;
}

function initWebSocket(projectId) {
  if (projectSocket) projectSocket.destroy();
  projectSocket = new ProjectSocket(projectId);

  // Task events
  projectSocket.on('task_created', (data) => tasksManager.handleWsTaskEvent(data, 'task_created'));
  projectSocket.on('task_updated', (data) => tasksManager.handleWsTaskEvent(data, 'task_updated'));
  projectSocket.on('task_moved', (data) => tasksManager.handleWsTaskEvent(data, 'task_moved'));
  projectSocket.on('task_deleted', (data) => tasksManager.handleWsTaskEvent(data, 'task_deleted'));

  // Comment events
  projectSocket.on('comment_created', (data) => {
    const commentsContainer = document.getElementById('task-comments-list');
    commentsManager.handleWsCommentEvent(data, 'comment_created', currentUser, commentsContainer);
  });
  projectSocket.on('comment_updated', (data) => {
    const commentsContainer = document.getElementById('task-comments-list');
    commentsManager.handleWsCommentEvent(data, 'comment_updated', currentUser, commentsContainer);
  });
  projectSocket.on('comment_deleted', (data) => {
    const commentsContainer = document.getElementById('task-comments-list');
    commentsManager.handleWsCommentEvent(data, 'comment_deleted', currentUser, commentsContainer);
  });

  // Member events
  projectSocket.on('member_added', (data) => {
    if (data && data.member) {
      const exists = currentProject.members.some(m => m.id === data.member.id);
      if (!exists) {
        currentProject.members.push(data.member);
        renderProjectHeader(currentProject);
        renderFilterAssignees(currentProject.members);
        showToast(`${data.member.username} joined the project!`, 'info');
      }
    }
  });

  projectSocket.on('member_removed', (data) => {
    if (data && data.user_id) {
      currentProject.members = currentProject.members.filter(m => m.id !== data.user_id);
      renderProjectHeader(currentProject);
      renderFilterAssignees(currentProject.members);
    }
  });
}

function setupEvents() {
  // Add Member Modal
  window.openMembersModal = () => {
    const modal = document.getElementById('members-modal');
    renderMembersListModal();
    if (modal) modal.classList.add('active');
  };

  // Edit Project Settings Modal
  window.openEditProjectModal = () => {
    const modal = document.getElementById('edit-project-modal');
    if (!modal || !currentProject) return;

    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;

    document.getElementById('edit-project-name').value = currentProject.name || '';
    document.getElementById('edit-project-desc').value = currentProject.description || '';
    
    const catSelect = document.getElementById('edit-project-category');
    if (catSelect) catSelect.value = currentProject.category || 'PRODUCT';

    const statSelect = document.getElementById('edit-project-status');
    if (statSelect) statSelect.value = currentProject.status || 'ACTIVE';

    const startInput = document.getElementById('edit-project-startdate');
    if (startInput) {
      startInput.value = currentProject.start_date || '';
      if (startInput._syncDatePicker) {
        startInput._syncDatePicker.setDate(startInput._syncDatePicker.parseDate(currentProject.start_date), false);
      }
    }

    const targetInput = document.getElementById('edit-project-targetdate');
    if (targetInput) {
      targetInput.value = currentProject.target_date || '';
      if (targetInput._syncDatePicker) {
        targetInput._syncDatePicker.setDate(targetInput._syncDatePicker.parseDate(currentProject.target_date), false);
      }
    }

    const colorInput = document.getElementById('edit-project-color');
    const projectColor = currentProject.color || '#6366F1';
    if (colorInput) colorInput.value = projectColor;

    // Set Active Swatch
    document.querySelectorAll('#project-color-swatches .color-swatch-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.color === projectColor);
    });

    // Populate Telemetry
    const stats = currentProject.stats || { total_tasks: 0, done_tasks: 0, progress_percent: 0 };
    const totalEl = document.getElementById('settings-total-tasks');
    const doneEl = document.getElementById('settings-done-tasks');
    const barEl = document.getElementById('settings-progress-bar');
    const badgeEl = document.getElementById('settings-progress-badge');
    const ownerEl = document.getElementById('settings-owner-name');

    if (totalEl) totalEl.textContent = stats.total_tasks || 0;
    if (doneEl) doneEl.textContent = stats.done_tasks || 0;
    if (barEl) barEl.style.width = `${stats.progress_percent || 0}%`;
    if (badgeEl) badgeEl.textContent = `${stats.progress_percent || 0}% Shipped`;
    if (ownerEl) {
      ownerEl.textContent = currentProject.owner ? (currentProject.owner.first_name ? `${currentProject.owner.first_name} ${currentProject.owner.last_name}` : currentProject.owner.username) : 'Owner';
    }

    // Toggle Danger Zone (Owner Only)
    const dangerZone = document.getElementById('project-danger-zone');
    if (dangerZone) {
      dangerZone.style.display = currentProject.is_owner ? 'flex' : 'none';
    }

    modal.classList.add('active');
  };

  // Color Swatches Click Event
  document.querySelectorAll('#project-color-swatches .color-swatch-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#project-color-swatches .color-swatch-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const colorInput = document.getElementById('edit-project-color');
      if (colorInput) colorInput.value = chip.dataset.color;
    });
  });

  // Danger Zone - Delete Project Button
  const btnDeleteProject = document.getElementById('btn-delete-project');
  if (btnDeleteProject) {
    btnDeleteProject.addEventListener('click', async () => {
      if (!confirm(`Are you sure you want to permanently delete "${currentProject.name}"?\n\nThis will permanently remove all Kanban tasks, discussion threads, and member access. This action cannot be undone.`)) {
        return;
      }

      btnDeleteProject.disabled = true;
      btnDeleteProject.textContent = 'Deleting Project...';

      try {
        await api.delete(`/projects/${currentProject.id}/`);
        showToast('Project deleted successfully.', 'info');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      } catch (err) {
        btnDeleteProject.disabled = false;
        btnDeleteProject.textContent = '🗑 Delete Project';
        showToast(err.message || 'Failed to delete project.', 'error');
      }
    });
  }

  // Close modals
  window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  };

  // Edit Project Form Submit
  const editProjectForm = document.getElementById('edit-project-form');
  if (editProjectForm) {
    editProjectForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-project-name').value.trim();
      const description = document.getElementById('edit-project-desc').value.trim();
      const category = document.getElementById('edit-project-category').value;
      const status = document.getElementById('edit-project-status').value;
      const start_date = document.getElementById('edit-project-startdate').value || null;
      const target_date = document.getElementById('edit-project-targetdate').value || null;
      const color = document.getElementById('edit-project-color').value || '#6366F1';

      if (!name) {
        showToast('Please provide a project name.', 'warning');
        return;
      }

      try {
        const updated = await api.patch(`/projects/${currentProject.id}/`, {
          name,
          description,
          category,
          status,
          start_date,
          target_date,
          color
        });

        currentProject = { ...currentProject, ...updated };
        renderProjectHeader(currentProject);
        closeModals();
        showToast('Project settings updated!', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to update project.', 'error');
      }
    };
  }

  // Member search input
  const memberSearchInput = document.getElementById('member-search-input');
  if (memberSearchInput) {
    memberSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      searchTimeout = setTimeout(() => searchUsersToAdd(query), 300);
    });
  }

  // Filter controls
  const searchInput = document.getElementById('filter-search');
  const prioritySelect = document.getElementById('filter-priority');
  const assigneeSelect = document.getElementById('filter-assignee');

  const applyFilters = () => {
    const filters = {};
    if (searchInput && searchInput.value.trim()) filters.search = searchInput.value.trim();
    if (prioritySelect && prioritySelect.value) filters.priority = prioritySelect.value;
    if (assigneeSelect && assigneeSelect.value) filters.assigned_to = assigneeSelect.value;
    tasksManager.loadTasks(filters);
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFilters, 300);
    });
  }
  if (prioritySelect) prioritySelect.addEventListener('change', applyFilters);
  if (assigneeSelect) assigneeSelect.addEventListener('change', applyFilters);
}

async function searchUsersToAdd(query) {
  const resultsContainer = document.getElementById('member-search-results');
  if (!resultsContainer) return;

  if (!query) {
    resultsContainer.innerHTML = '';
    return;
  }

  try {
    const users = await api.get('/auth/users/search/', { q: query });
    const existingIds = new Set(currentProject.members.map(m => m.id));

    if (users.length === 0) {
      resultsContainer.innerHTML = `<div style="padding: 1rem; color: #94A3B8; font-size: 1.05rem; font-weight: 600; text-align: center; background: rgba(15,23,42,0.65); border: 1px dashed rgba(255,255,255,0.14); border-radius: 12px; margin-top: 0.5rem;">No users found matching "${escapeHtml(query)}"</div>`;
      return;
    }

    resultsContainer.innerHTML = users.map(u => {
      const isAlreadyMember = existingIds.has(u.id);
      return `
        <div class="member-row-card" style="padding: 0.85rem 1.15rem; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 1rem; min-width: 0;">
            <div class="avatar" style="background-color: ${u.avatar_color || '#6366F1'}; width: 42px; height: 42px; font-size: 0.95rem; font-weight: 800; border: 2px solid rgba(255,255,255,0.25); box-shadow: 0 0 10px rgba(99,102,241,0.3);">${escapeHtml(u.initials || 'U')}</div>
            <div style="min-width: 0;">
              <div style="font-size: 1.18rem; font-weight: 800; color: #FFFFFF; line-height: 1.25;">${escapeHtml(u.first_name ? `${u.first_name} ${u.last_name}` : u.username)}</div>
              <div style="font-size: 0.95rem; color: #CBD5E1; font-weight: 600; margin-top: 2px;">@${escapeHtml(u.username)} • ${escapeHtml(u.email)}</div>
            </div>
          </div>
          ${isAlreadyMember ? `
            <span class="badge" style="background: rgba(255, 255, 255, 0.1); color: #94A3B8; font-size: 0.88rem; font-weight: 800; padding: 4px 10px; border-radius: 8px;">Member</span>
          ` : `
            <button class="btn btn-primary" style="padding: 0.45rem 1.15rem; font-size: 0.95rem; font-weight: 800; border-radius: 10px; box-shadow: 0 4px 14px rgba(99,102,241,0.4);" onclick="addMemberToProject('${u.username}')">+ Add Member</button>
          `}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Search users error:', err);
  }
}

window.addMemberToProject = async (usernameOrEmail) => {
  try {
    const res = await api.post(`/projects/${currentProject.id}/members/`, {
      username_or_email: usernameOrEmail
    });
    
    if (res.member) {
      currentProject.members.push(res.member);
      renderProjectHeader(currentProject);
      renderFilterAssignees(currentProject.members);
      renderMembersListModal();
      document.getElementById('member-search-results').innerHTML = '';
      document.getElementById('member-search-input').value = '';
      showToast(`Added ${res.member.username} to project!`, 'success');
    }
  } catch (err) {
    showToast(err.message || 'Failed to add member.', 'error');
  }
};

window.removeMemberFromProject = async (userId, username) => {
  if (!confirm(`Are you sure you want to remove ${username} from the project?`)) return;

  try {
    await api.delete(`/projects/${currentProject.id}/members/${userId}/`);
    currentProject.members = currentProject.members.filter(m => m.id !== userId);
    renderProjectHeader(currentProject);
    renderFilterAssignees(currentProject.members);
    renderMembersListModal();
    showToast(`Removed ${username} from project.`, 'info');
  } catch (err) {
    showToast(err.message || 'Failed to remove member.', 'error');
  }
};

function renderMembersListModal() {
  const container = document.getElementById('current-members-list');
  const countBadge = document.getElementById('current-members-count-badge');
  if (!container || !currentProject) return;

  if (countBadge) {
    countBadge.textContent = currentProject.members ? currentProject.members.length : '0';
  }

  const isOwner = currentProject.is_owner;

  container.innerHTML = currentProject.members.map(m => {
    const isProjectOwner = currentProject.owner && currentProject.owner.id === m.id;
    return `
      <div class="member-row-card">
        <div style="display: flex; align-items: center; gap: 1.15rem; min-width: 0;">
          <div class="avatar" style="background-color: ${m.avatar_color || '#6366F1'}; width: 48px; height: 48px; font-size: 1.15rem; font-weight: 800; border: 2.5px solid rgba(255,255,255,0.25); box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);">
            ${escapeHtml(m.initials || 'U')}
          </div>
          <div style="min-width: 0;">
            <div class="member-info-name">
              <span>${escapeHtml(m.first_name ? `${m.first_name} ${m.last_name}` : m.username)}</span>
              ${isProjectOwner ? `<span class="badge" style="font-size: 0.82rem; font-weight: 800; padding: 3px 11px; background: linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.35)); color: #E0E7FF; border: 1px solid rgba(129,140,248,0.6); box-shadow: 0 0 12px rgba(99,102,241,0.35); border-radius: 9999px;">Owner</span>` : `<span class="badge" style="font-size: 0.82rem; font-weight: 700; background: rgba(255,255,255,0.1); color: #E2E8F0; border: 1px solid rgba(255,255,255,0.18); border-radius: 9999px; padding: 3px 11px;">Member</span>`}
            </div>
            <div class="member-info-sub">
              @${escapeHtml(m.username)} ${m.email ? `• ${escapeHtml(m.email)}` : ''}
            </div>
          </div>
        </div>

        ${(isOwner && !isProjectOwner) ? `
          <button class="btn-remove-member" onclick="removeMemberFromProject(${m.id}, '${m.username}')">Remove</button>
        ` : ''}
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', initProjectPage);

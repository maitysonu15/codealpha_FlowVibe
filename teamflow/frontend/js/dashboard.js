/**
 * FlowVibe Dashboard Controller
 */

import { api, showToast, escapeHtml, formatDate, timeAgo } from './api.js';
import { auth } from './auth.js';

let currentUser = null;
let projectsList = [];
let myTasksList = [];

async function initDashboard() {
  currentUser = await auth.requireAuth();
  if (!currentUser) return;

  setupEvents();
  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    const [projects, tasks, userStats] = await Promise.all([
      api.get('/projects/'),
      api.get('/tasks/my-tasks/'),
      api.get('/auth/user/')
    ]);

    projectsList = projects;
    myTasksList = tasks;
    currentUser = userStats;

    renderStats(userStats);
    renderProjects(projectsList);
    renderMyTasks(myTasksList);
  } catch (err) {
    showToast(err.message || 'Failed to load dashboard data.', 'error');
  }
}

function renderStats(user) {
  const stats = user.stats || {};
  
  const totalProjectsEl = document.getElementById('stat-total-projects');
  const activeTasksEl = document.getElementById('stat-active-tasks');
  const completedTasksEl = document.getElementById('stat-completed-tasks');
  const completionRateEl = document.getElementById('stat-completion-rate');

  if (totalProjectsEl) totalProjectsEl.textContent = projectsList.length;
  if (activeTasksEl) {
    const active = myTasksList.filter(t => t.status !== 'DONE').length;
    activeTasksEl.textContent = active;
  }
  if (completedTasksEl) {
    const completed = myTasksList.filter(t => t.status === 'DONE').length;
    completedTasksEl.textContent = completed;
  }
  if (completionRateEl) {
    const total = myTasksList.length;
    const completed = myTasksList.filter(t => t.status === 'DONE').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    completionRateEl.textContent = `${rate}%`;
  }
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (projects.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%); border: 1.5px dashed rgba(255, 255, 255, 0.16); border-radius: 20px; backdrop-filter: blur(20px); box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
        <div style="width: 64px; height: 64px; border-radius: 20px; background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25)); border: 1px solid rgba(99,102,241,0.45); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 2rem;">🚀</div>
        <h3 style="font-size: 1.65rem; font-weight: 800; color: #FFFFFF; margin-bottom: 0.65rem;">No Active Projects Yet</h3>
        <p class="text-secondary" style="font-size: 1.12rem; margin-bottom: 1.75rem; max-width: 520px; margin-left: auto; margin-right: auto; line-height: 1.6;">Create your first team workspace project to start assigning tasks, tracking Kanban sprints, and collaborating in real-time.</p>
        <button class="btn btn-primary" onclick="openCreateProjectModal()" style="font-size: 1.1rem; font-weight: 800; padding: 0.8rem 1.85rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.45);">+ Create New Project</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = projects.map(p => {
    const isOwner = p.is_owner;
    const stats = p.stats || { total_tasks: 0, progress_percent: 0, done_tasks: 0 };
    const categoryLabels = {
      'PRODUCT': '🚀 Product',
      'DESIGN': '🎨 Design',
      'MARKETING': '📈 Growth',
      'OPERATIONS': '💼 Ops',
      'INFRA': '🛡️ Infra'
    };
    const catText = categoryLabels[p.category] || '🚀 Product';

    return `
      <div class="project-card" onclick="window.location.href='project.html?id=${p.id}'" style="border-top: 3px solid ${p.color || '#6366F1'};">
        <div>
          <div class="project-card-header">
            <div style="display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap;">
              <h3 class="project-card-title">${escapeHtml(p.name)}</h3>
              <span class="badge" style="background: rgba(255, 255, 255, 0.08); color: #CBD5E1; font-size: 0.78rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
                ${catText}
              </span>
            </div>
            ${isOwner ? `
              <span class="badge" style="background: linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.4)); color: #FFFFFF; border: 1px solid rgba(168,85,247,0.7); font-weight: 800; font-size: 0.95rem; padding: 4px 14px; border-radius: 9999px; box-shadow: 0 0 14px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.3);">
                Owner
              </span>
            ` : `
              <span class="badge" style="background: rgba(255, 255, 255, 0.12); color: #E2E8F0; border: 1px solid rgba(255, 255, 255, 0.2); font-weight: 700; font-size: 0.95rem; padding: 4px 14px; border-radius: 9999px;">
                Member
              </span>
            `}
          </div>
          <p class="project-card-desc" style="margin-top: 0.95rem;">
            ${escapeHtml(p.description || '⚡ Real-time Kanban sprint matrix — Collaborate seamlessly with your team.')}
          </p>
        </div>

        <div>
          <div class="progress-bar-container">
            <div class="progress-bar-label">
              <span style="font-size: 1.08rem; font-weight: 700; color: #E2E8F0;">Sprint Progress</span>
              <span style="font-size: 1.08rem; font-weight: 800; color: #38BDF8;">${stats.progress_percent}% (${stats.done_tasks}/${stats.total_tasks} done)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${stats.progress_percent}%;"></div>
            </div>
          </div>

          <div class="project-card-footer">
            <div class="avatar-group">
              ${(p.members || []).slice(0, 4).map(m => `
                <div class="avatar" title="${escapeHtml(m.first_name ? `${m.first_name} ${m.last_name}` : m.username)}" style="background-color: ${m.avatar_color || '#6366F1'}; width: 40px; height: 40px; font-size: 0.95rem; font-weight: 800; border: 2.5px solid rgba(255,255,255,0.3); box-shadow: 0 0 12px rgba(99,102,241,0.35);">
                  ${escapeHtml(m.initials || 'U')}
                </div>
              `).join('')}
              ${(p.members || []).length > 4 ? `
                <div class="avatar" style="background-color: #1E293B; color: #CBD5E1; width: 40px; height: 40px; font-size: 0.88rem; font-weight: 800; border: 2.5px solid rgba(255,255,255,0.25);">
                  +${p.members.length - 4}
                </div>
              ` : ''}
            </div>

            <div style="display: flex; gap: 0.85rem; align-items: center;" onclick="event.stopPropagation();">
              <a href="project.html?id=${p.id}" class="btn btn-secondary btn-sm" style="font-size: 1.08rem; font-weight: 700; padding: 0.65rem 1.45rem; border-radius: 13px;">Open Board →</a>
              ${isOwner ? `
                <button class="btn-action-delete" title="Delete Project" onclick="deleteProject(${p.id})" aria-label="Delete Project" style="width: 48px; height: 48px; min-width: 48px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(244, 63, 94, 0.22) 0%, rgba(225, 29, 72, 0.35) 100%), rgba(20, 27, 45, 0.9); border: 1.5px solid rgba(244, 63, 94, 0.55); box-shadow: 0 4px 16px rgba(244, 63, 94, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35); cursor: pointer; color: #FDA4AF; transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);">
                  <svg class="trash-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FDA4AF" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display: block; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); pointer-events: none;">
                    <g class="trash-lid">
                      <path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2H9V4z"></path>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                    </g>
                    <g class="trash-can">
                      <path d="M5.5 6l1.2 13.2A2 2 0 0 0 8.7 21h6.6a2 2 0 0 0 2-1.8L18.5 6"></path>
                      <line x1="10" y1="10.5" x2="10" y2="16.5"></line>
                      <line x1="14" y1="10.5" x2="14" y2="16.5"></line>
                    </g>
                  </svg>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderMyTasks(tasks) {
  const container = document.getElementById('my-tasks-list');
  if (!container) return;

  if (tasks.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3.5rem 2rem; background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%); border-radius: 22px; border: 1.5px dashed rgba(255, 255, 255, 0.16); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.85rem; box-shadow: 0 8px 30px rgba(0,0,0,0.35);">
        <div style="width: 60px; height: 60px; border-radius: 18px; background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.45); display: flex; align-items: center; justify-content: center; margin-bottom: 0.35rem; box-shadow: 0 0 22px rgba(16, 185, 129, 0.3);">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div style="font-size: 1.55rem; font-weight: 800; color: #FFFFFF;">All Caught Up!</div>
        <div style="font-size: 1.15rem; color: #94A3B8; max-width: 480px; line-height: 1.6; font-weight: 500;">You have no pending assigned tasks right now. Great job keeping your workspace clean!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.15rem;">
      ${tasks.slice(0, 8).map(t => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.35rem 1.85rem; background: linear-gradient(135deg, rgba(30, 41, 59, 0.88) 0%, rgba(15, 23, 42, 0.96) 100%); border: 1.5px solid rgba(255, 255, 255, 0.16); border-radius: 18px; box-shadow: 0 6px 20px rgba(0,0,0,0.35); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);" onmouseover="this.style.borderColor='rgba(99,102,241,0.65)'; this.style.transform='translateX(4px) translateY(-2px)'; this.style.boxShadow='0 12px 30px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.2)';" onmouseout="this.style.borderColor='rgba(255,255,255,0.16)'; this.style.transform='translateX(0) translateY(0)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.35)';">
          <div style="display: flex; align-items: center; gap: 1.35rem; min-width: 0;">
            <span class="badge badge-${t.status.toLowerCase().replace('_', '-')}" style="flex-shrink: 0; font-size: 0.95rem; font-weight: 800; padding: 5px 14px;">
              ${escapeHtml(t.status_display)}
            </span>
            <div style="min-width: 0;">
              <a href="project.html?id=${t.project}" style="font-weight: 800; font-size: 1.35rem; color: #FFFFFF; text-decoration: none; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.35;">
                ${escapeHtml(t.title)}
              </a>
              <span class="text-muted" style="font-size: 1.05rem; font-weight: 600;">Project: <strong style="color: #CBD5E1;">${escapeHtml(t.project_name)}</strong></span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 1.25rem; flex-shrink: 0;">
            ${t.due_date ? `
              <span class="badge ${t.is_overdue ? 'badge-overdue' : ''}" style="font-size: 0.95rem; font-weight: 700; padding: 5px 12px;">
                📅 ${formatDate(t.due_date)}
              </span>
            ` : ''}
            <span class="badge badge-priority-${t.priority.toLowerCase()}" style="font-size: 0.95rem; font-weight: 800; padding: 5px 14px;">
              ${escapeHtml(t.priority_display)}
            </span>
            <a href="project.html?id=${t.project}" class="btn btn-secondary btn-sm" style="padding: 0.6rem 1.35rem; font-size: 1.05rem; font-weight: 700; border-radius: 12px;">View →</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function setupEvents() {
  // Create Project Modal Handlers
  const modal = document.getElementById('create-project-modal');
  const form = document.getElementById('create-project-form');

  window.openCreateProjectModal = () => {
    if (modal) {
      const modalBody = modal.querySelector('.modal-body');
      if (modalBody) modalBody.scrollTop = 0;
      modal.classList.add('active');
    }
    if (form) form.reset();
  };

  window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  };

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('project-name-input').value.trim();
      const description = document.getElementById('project-desc-input').value.trim();

      if (!name) {
        showToast('Please provide a project name.', 'warning');
        return;
      }

      try {
        const newProject = await api.post('/projects/', { name, description });
        projectsList.unshift(newProject);
        renderProjects(projectsList);
        closeModals();
        showToast('Project created successfully!', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to create project.', 'error');
      }
    };
  }

  // Delete Project Window Handler
  window.deleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${projectId}/`);
      projectsList = projectsList.filter(p => p.id !== projectId);
      renderProjects(projectsList);
      showToast('Project deleted.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete project.', 'error');
    }
  };
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initDashboard);

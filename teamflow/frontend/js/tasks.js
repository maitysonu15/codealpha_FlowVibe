/**
 * FlowVibe Tasks & Interactive Kanban Board Module
 * Pure Vanilla JS Drag & Drop with Real-Time Updates
 */

import { api, showToast, escapeHtml, formatDate, timeAgo } from './api.js';
import { commentsManager } from './comments.js';
import { SyncDatePicker } from './datepicker.js';

let projectTasks = [];
let currentProjectId = null;
let currentProjectMembers = [];
let currentUser = null;
let activeTask = null;
let draggedTaskId = null;

export const tasksManager = {
  init(projectId, members, user) {
    currentProjectId = projectId;
    currentProjectMembers = members || [];
    currentUser = user;
    this.setupDragAndDrop();
    this.setupModalEvents();
    SyncDatePicker.initAll();
  },

  async loadTasks(filters = {}) {
    if (!currentProjectId) return;
    try {
      const data = await api.get(`/projects/${currentProjectId}/tasks/`, filters);
      projectTasks = data;
      this.renderKanban();
      return projectTasks;
    } catch (err) {
      showToast(err.message || 'Failed to load tasks.', 'error');
    }
  },

  renderKanban() {
    const todoContainer = document.getElementById('tasks-todo');
    const inProgressContainer = document.getElementById('tasks-in-progress');
    const doneContainer = document.getElementById('tasks-done');

    const countTodo = document.getElementById('count-todo');
    const countInProgress = document.getElementById('count-in-progress');
    const countDone = document.getElementById('count-done');

    if (!todoContainer || !inProgressContainer || !doneContainer) return;

    const todoTasks = projectTasks.filter(t => t.status === 'TODO');
    const inProgressTasks = projectTasks.filter(t => t.status === 'IN_PROGRESS');
    const doneTasks = projectTasks.filter(t => t.status === 'DONE');

    if (countTodo) countTodo.textContent = todoTasks.length;
    if (countInProgress) countInProgress.textContent = inProgressTasks.length;
    if (countDone) countDone.textContent = doneTasks.length;

    todoContainer.innerHTML = todoTasks.map(t => this.renderTaskCard(t)).join('') || this.renderEmptyColumn('To Do');
    inProgressContainer.innerHTML = inProgressTasks.map(t => this.renderTaskCard(t)).join('') || this.renderEmptyColumn('In Progress');
    doneContainer.innerHTML = doneTasks.map(t => this.renderTaskCard(t)).join('') || this.renderEmptyColumn('Done');

    this.attachCardEventListeners();
  },

  renderEmptyColumn(statusLabel) {
    const statusIcons = {
      'To Do': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>`,
      'In Progress': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
      'Done': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    };
    const icon = statusIcons[statusLabel] || '';
    const statusMap = { 'To Do': 'TODO', 'In Progress': 'IN_PROGRESS', 'Done': 'DONE' };
    const code = statusMap[statusLabel] || 'TODO';

    return `
      <div class="kanban-empty-card">
        <div class="empty-icon-wrap">${icon}</div>
        <div class="empty-title">No tasks in ${statusLabel}</div>
        <div class="empty-desc">Get started or drag tasks into this column</div>
        <button class="empty-create-btn" onclick="tasksManager.openCreateTaskModal('${code}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Create Task</span>
        </button>
      </div>
    `;
  },

  renderTaskCard(task) {
    const priorityClass = `badge-priority-${task.priority.toLowerCase()}`;
    const isOverdue = task.is_overdue;

    return `
      <div class="task-card" draggable="true" data-task-id="${task.id}" id="task-card-${task.id}">
        <div class="task-card-header">
          <span class="badge ${priorityClass}">
            ${escapeHtml(task.priority_display || task.priority)}
          </span>
          <div class="task-quick-move" onclick="event.stopPropagation();">
            <select class="form-select task-move-select" onchange="tasksManager.quickChangeStatus(${task.id}, this.value)" title="Move Task">
              <option value="TODO" ${task.status === 'TODO' ? 'selected' : ''}>To Do</option>
              <option value="IN_PROGRESS" ${task.status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
              <option value="DONE" ${task.status === 'DONE' ? 'selected' : ''}>Done</option>
            </select>
          </div>
        </div>

        <div class="task-card-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-card-desc">${escapeHtml(task.description)}</div>` : ''}

        <div class="task-card-footer">
          <div class="task-meta-left">
            ${task.due_date ? `
              <span class="task-meta-item ${isOverdue ? 'badge badge-overdue' : ''}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${formatDate(task.due_date)}
              </span>
            ` : ''}
            ${task.comments_count > 0 ? `
              <span class="task-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                ${task.comments_count}
              </span>
            ` : ''}
          </div>

          <div class="task-meta-right">
            ${task.assigned_to ? `
              <div class="avatar avatar-sm" title="Assigned to ${escapeHtml(task.assigned_to.first_name || task.assigned_to.username)}" style="background-color: ${task.assigned_to.avatar_color || '#6366F1'}; font-size: 0.75rem; width: 28px; height: 28px;">
                ${escapeHtml(task.assigned_to.initials || 'U')}
              </div>
            ` : `
              <span class="unassigned-text">Unassigned</span>
            `}
          </div>
        </div>
      </div>
    `;
  },

  attachCardEventListeners() {
    const cards = document.querySelectorAll('.task-card');
    cards.forEach(card => {
      // Drag events
      card.addEventListener('dragstart', (e) => {
        draggedTaskId = card.getAttribute('data-task-id');
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', draggedTaskId);
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedTaskId = null;
      });

      // Click to open details
      card.addEventListener('click', () => {
        const taskId = card.getAttribute('data-task-id');
        this.openTaskDetails(taskId);
      });
    });
  },

  setupDragAndDrop() {
    const columns = [
      { el: document.getElementById('tasks-todo'), status: 'TODO' },
      { el: document.getElementById('tasks-in-progress'), status: 'IN_PROGRESS' },
      { el: document.getElementById('tasks-done'), status: 'DONE' }
    ];

    columns.forEach(({ el, status }) => {
      if (!el) return;

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('drag-over');
      });

      el.addEventListener('dragleave', (e) => {
        if (!el.contains(e.relatedTarget)) {
          el.classList.remove('drag-over');
        }
      });

      el.addEventListener('drop', async (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
        if (!taskId) return;

        const task = projectTasks.find(t => t.id == taskId);
        if (task && task.status !== status) {
          await this.updateTaskStatus(taskId, status);
        }
      });
    });
  },

  async updateTaskStatus(taskId, newStatus) {
    const task = projectTasks.find(t => t.id == taskId);
    if (!task) return;

    const oldStatus = task.status;
    task.status = newStatus; // Optimistic update
    this.renderKanban();

    try {
      const updated = await api.patch(`/tasks/${taskId}/status/`, { status: newStatus });
      const idx = projectTasks.findIndex(t => t.id == taskId);
      if (idx !== -1) projectTasks[idx] = updated;
      this.renderKanban();
      showToast(`Task moved to ${updated.status_display}`, 'info', 2000);
    } catch (err) {
      task.status = oldStatus; // Revert
      this.renderKanban();
      showToast(err.message || 'Failed to move task.', 'error');
    }
  },

  async quickChangeStatus(taskId, newStatus) {
    await this.updateTaskStatus(taskId, newStatus);
  },

  openCreateTaskModal(defaultStatus = 'TODO') {
    const modal = document.getElementById('create-task-modal');
    const form = document.getElementById('create-task-form');
    const statusSelect = document.getElementById('task-create-status');
    const memberSelect = document.getElementById('task-create-assignee');

    if (modal) {
      const modalBody = modal.querySelector('.modal-body');
      if (modalBody) modalBody.scrollTop = 0;
    }

    if (form) form.reset();
    const dueDateInput = document.getElementById('task-create-duedate');
    if (dueDateInput) {
      dueDateInput.value = '';
      if (dueDateInput._syncDatePicker) {
        dueDateInput._syncDatePicker.setDate(null, false);
      }
    }
    if (statusSelect) statusSelect.value = defaultStatus;

    if (memberSelect) {
      memberSelect.innerHTML = `
        <option value="">Unassigned</option>
        ${currentProjectMembers.map(m => `
          <option value="${m.id}">${escapeHtml(m.first_name ? `${m.first_name} ${m.last_name} (@${m.username})` : m.username)}</option>
        `).join('')}
      `;
    }

    if (modal) modal.classList.add('active');
  },

  async openTaskDetails(taskId) {
    try {
      const task = await api.get(`/tasks/${taskId}/`);
      activeTask = task;
      const modal = document.getElementById('task-details-modal');
      if (!modal) return;

      const modalBody = modal.querySelector('.modal-body');
      if (modalBody) modalBody.scrollTop = 0;

      // Populate fields
      document.getElementById('task-detail-id').value = task.id;
      document.getElementById('task-detail-title').value = task.title;
      document.getElementById('task-detail-desc').value = task.description || '';
      document.getElementById('task-detail-status').value = task.status;
      document.getElementById('task-detail-priority').value = task.priority;
      
      const dueDateInput = document.getElementById('task-detail-duedate');
      if (dueDateInput) {
        dueDateInput.value = task.due_date || '';
        if (dueDateInput._syncDatePicker) {
          dueDateInput._syncDatePicker.setDate(dueDateInput._syncDatePicker.parseDate(task.due_date), false);
        }
      }

      document.getElementById('task-detail-creator').textContent = task.created_by ? (task.created_by.first_name ? `${task.created_by.first_name} ${task.created_by.last_name}` : task.created_by.username) : 'Unknown';
      document.getElementById('task-detail-createdat').textContent = timeAgo(task.created_at);

      // Populate assignee select
      const assigneeSelect = document.getElementById('task-detail-assignee');
      if (assigneeSelect) {
        assigneeSelect.innerHTML = `
          <option value="">Unassigned</option>
          ${currentProjectMembers.map(m => `
            <option value="${m.id}" ${task.assigned_to && task.assigned_to.id === m.id ? 'selected' : ''}>
              ${escapeHtml(m.first_name ? `${m.first_name} ${m.last_name} (@${m.username})` : m.username)}
            </option>
          `).join('')}
        `;
      }

      // Load comments
      const commentsContainer = document.getElementById('task-comments-list');
      commentsManager.loadComments(task.id, commentsContainer, currentUser);

      modal.classList.add('active');
    } catch (err) {
      showToast(err.message || 'Failed to load task details.', 'error');
    }
  },

  setupModalEvents() {
    // Create Task Form Submit
    const createForm = document.getElementById('create-task-form');
    if (createForm) {
      createForm.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('task-create-title').value.trim();
        const description = document.getElementById('task-create-desc').value.trim();
        const status = document.getElementById('task-create-status').value;
        const priority = document.getElementById('task-create-priority').value;
        const due_date = document.getElementById('task-create-duedate').value || null;
        const assigned_to_id = document.getElementById('task-create-assignee').value || null;

        if (!title) {
          showToast('Please enter a task title.', 'warning');
          return;
        }

        try {
          const newTask = await api.post(`/projects/${currentProjectId}/tasks/`, {
            title,
            description,
            status,
            priority,
            due_date,
            assigned_to_id: assigned_to_id ? parseInt(assigned_to_id) : null
          });

          projectTasks.push(newTask);
          this.renderKanban();
          this.closeModals();
          showToast('Task created successfully!', 'success');
        } catch (err) {
          showToast(err.message || 'Failed to create task.', 'error');
        }
      };
    }

    // Update Task Details Form Submit
    const detailsForm = document.getElementById('task-details-form');
    if (detailsForm) {
      detailsForm.onsubmit = async (e) => {
        e.preventDefault();
        const taskId = document.getElementById('task-detail-id').value;
        const title = document.getElementById('task-detail-title').value.trim();
        const description = document.getElementById('task-detail-desc').value.trim();
        const status = document.getElementById('task-detail-status').value;
        const priority = document.getElementById('task-detail-priority').value;
        const due_date = document.getElementById('task-detail-duedate').value || null;
        const assigned_to_id = document.getElementById('task-detail-assignee').value || null;

        try {
          const updated = await api.patch(`/tasks/${taskId}/`, {
            title,
            description,
            status,
            priority,
            due_date,
            assigned_to_id: assigned_to_id ? parseInt(assigned_to_id) : null
          });

          const idx = projectTasks.findIndex(t => t.id == taskId);
          if (idx !== -1) projectTasks[idx] = updated;
          this.renderKanban();
          this.closeModals();
          showToast('Task updated.', 'success');
        } catch (err) {
          showToast(err.message || 'Failed to update task.', 'error');
        }
      };
    }

    // Delete Task Button
    const deleteBtn = document.getElementById('btn-delete-task');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        const taskId = document.getElementById('task-detail-id').value;
        if (!confirm('Are you sure you want to permanently delete this task?')) return;

        try {
          await api.delete(`/tasks/${taskId}/`);
          projectTasks = projectTasks.filter(t => t.id != taskId);
          this.renderKanban();
          this.closeModals();
          showToast('Task deleted.', 'info');
        } catch (err) {
          showToast(err.message || 'Failed to delete task.', 'error');
        }
      };
    }

    // Post Comment Form in Task Details
    const commentForm = document.getElementById('task-comment-form');
    if (commentForm) {
      commentForm.onsubmit = async (e) => {
        e.preventDefault();
        const taskId = document.getElementById('task-detail-id').value;
        const input = document.getElementById('task-comment-input');
        if (!input || !input.value.trim()) return;

        const commentsContainer = document.getElementById('task-comments-list');
        await commentsManager.postComment(taskId, input.value, currentUser, commentsContainer);
        input.value = '';
      };
    }
  },

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  },

  /**
   * Real-time WebSocket Event Handler for Tasks
   */
  handleWsTaskEvent(eventData, eventType) {
    if (!eventData) return;

    if (eventType === 'task_created') {
      const exists = projectTasks.some(t => t.id === eventData.id);
      if (!exists) {
        projectTasks.push(eventData);
        this.renderKanban();
        showToast(`New task: "${eventData.title}"`, 'info', 3000);
      }
    } else if (eventType === 'task_updated') {
      const idx = projectTasks.findIndex(t => t.id === eventData.id);
      if (idx !== -1) {
        projectTasks[idx] = eventData;
        this.renderKanban();
      }
    } else if (eventType === 'task_moved') {
      const taskObj = eventData.task;
      if (taskObj) {
        const idx = projectTasks.findIndex(t => t.id === taskObj.id);
        if (idx !== -1) {
          projectTasks[idx] = taskObj;
        } else {
          projectTasks.push(taskObj);
        }
        this.renderKanban();
      }
    } else if (eventType === 'task_deleted') {
      projectTasks = projectTasks.filter(t => t.id != eventData.task_id);
      this.renderKanban();
    }
  }
};

window.tasksManager = tasksManager;

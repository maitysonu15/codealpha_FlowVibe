/**
 * FlowVibe Task Comments Manager
 */

import { api, showToast, escapeHtml, timeAgo } from './api.js';

let activeComments = [];
let currentTaskId = null;

export const commentsManager = {
  /**
   * Load comments for a task
   */
  async loadComments(taskId, containerElement, currentUser) {
    currentTaskId = taskId;
    if (!containerElement) return;

    containerElement.innerHTML = `
      <div style="text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.85rem;">
        Loading discussion...
      </div>
    `;

    try {
      const data = await api.get(`/comments/task/${taskId}/`);
      activeComments = data;
      this.renderComments(activeComments, containerElement, currentUser);
    } catch (err) {
      containerElement.innerHTML = `
        <div style="text-align: center; padding: 1rem; color: var(--accent-rose); font-size: 0.85rem;">
          Failed to load comments: ${escapeHtml(err.message)}
        </div>
      `;
    }
  },

  /**
   * Render list of comments
   */
  renderComments(comments, containerElement, currentUser) {
    if (!containerElement) return;

    if (!comments || comments.length === 0) {
      containerElement.innerHTML = `
        <div style="text-align: center; padding: 2rem 1.5rem; color: #94A3B8; font-size: 1.05rem; font-weight: 600; border: 1px dashed rgba(255, 255, 255, 0.14); border-radius: 14px; background: rgba(15, 23, 42, 0.4);">
          💬 No comments yet. Be the first to share an update with your team!
        </div>
      `;
      return;
    }

    containerElement.innerHTML = comments.map(comment => {
      const isAuthor = currentUser && comment.author && comment.author.id === currentUser.id;
      const canDelete = isAuthor || comment.can_delete;

      return `
        <div class="comment-item" id="comment-item-${comment.id}" style="padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);">
          <div class="avatar" style="background-color: ${comment.author.avatar_color || '#6366F1'}; width: 40px; height: 40px; font-size: 0.95rem; font-weight: 800; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 0 10px rgba(99,102,241,0.3);">
            ${escapeHtml(comment.author.initials || 'U')}
          </div>
          <div class="comment-content-wrap" style="flex-grow: 1; min-width: 0;">
            <div class="comment-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
              <span class="comment-author-name" style="font-size: 1.12rem; font-weight: 800; color: #FFFFFF;">
                ${escapeHtml(comment.author.first_name ? `${comment.author.first_name} ${comment.author.last_name}` : comment.author.username)}
              </span>
              <span class="comment-time" style="font-size: 0.88rem; color: #94A3B8; font-weight: 600;">${timeAgo(comment.created_at)}</span>
            </div>
            
            <div class="comment-text" id="comment-text-${comment.id}" style="font-size: 1.05rem; color: #E2E8F0; line-height: 1.55; word-break: break-word;">${escapeHtml(comment.content)}</div>
            
            <!-- Inline Edit Form (Hidden by default) -->
            <div id="comment-edit-form-${comment.id}" style="display: none; margin-top: 0.75rem;">
              <textarea class="form-textarea" id="comment-edit-input-${comment.id}" style="min-height: 70px; font-size: 1.02rem; margin-bottom: 0.5rem;">${escapeHtml(comment.content)}</textarea>
              <div style="display: flex; gap: 0.65rem; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="commentsManager.cancelEdit(${comment.id})" style="font-size: 0.92rem; font-weight: 700;">Cancel</button>
                <button type="button" class="btn btn-primary btn-sm" onclick="commentsManager.saveEdit(${comment.id})" style="font-size: 0.92rem; font-weight: 700;">Save Edit</button>
              </div>
            </div>

            ${(isAuthor || canDelete) ? `
              <div class="comment-actions" id="comment-actions-${comment.id}" style="display: flex; gap: 0.85rem; margin-top: 0.55rem;">
                ${isAuthor ? `<span class="comment-action-btn" onclick="commentsManager.startEdit(${comment.id})" style="font-size: 0.88rem; font-weight: 700; color: #818CF8; cursor: pointer;">Edit</span>` : ''}
                ${canDelete ? `<span class="comment-action-btn" style="color: #FDA4AF; font-size: 0.88rem; font-weight: 700; cursor: pointer;" onclick="commentsManager.deleteComment(${comment.id})">Delete</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Post new comment
   */
  async postComment(taskId, content, currentUser, containerElement) {
    if (!content || !content.trim()) {
      showToast('Comment cannot be empty.', 'warning');
      return;
    }

    try {
      const newComment = await api.post(`/comments/task/${taskId}/`, { content: content.trim() });
      activeComments.push(newComment);
      this.renderComments(activeComments, containerElement, currentUser);
      showToast('Comment posted.', 'success');
      return newComment;
    } catch (err) {
      showToast(err.message || 'Failed to post comment.', 'error');
      throw err;
    }
  },

  startEdit(commentId) {
    const textEl = document.getElementById(`comment-text-${commentId}`);
    const editForm = document.getElementById(`comment-edit-form-${commentId}`);
    const actionsEl = document.getElementById(`comment-actions-${commentId}`);

    if (textEl) textEl.style.display = 'none';
    if (actionsEl) actionsEl.style.display = 'none';
    if (editForm) editForm.style.display = 'block';
  },

  cancelEdit(commentId) {
    const textEl = document.getElementById(`comment-text-${commentId}`);
    const editForm = document.getElementById(`comment-edit-form-${commentId}`);
    const actionsEl = document.getElementById(`comment-actions-${commentId}`);

    if (textEl) textEl.style.display = 'block';
    if (actionsEl) actionsEl.style.display = 'flex';
    if (editForm) editForm.style.display = 'none';
  },

  async saveEdit(commentId) {
    const input = document.getElementById(`comment-edit-input-${commentId}`);
    if (!input || !input.value.trim()) {
      showToast('Comment cannot be empty.', 'warning');
      return;
    }

    try {
      const updated = await api.patch(`/comments/${commentId}/`, { content: input.value.trim() });
      
      const idx = activeComments.findIndex(c => c.id === commentId);
      if (idx !== -1) activeComments[idx] = updated;

      const textEl = document.getElementById(`comment-text-${commentId}`);
      if (textEl) textEl.textContent = updated.content;

      this.cancelEdit(commentId);
      showToast('Comment updated.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update comment.', 'error');
    }
  },

  async deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(`/comments/${commentId}/`);
      activeComments = activeComments.filter(c => c.id !== commentId);
      const itemEl = document.getElementById(`comment-item-${commentId}`);
      if (itemEl) itemEl.remove();
      showToast('Comment deleted.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete comment.', 'error');
    }
  },

  /**
   * Handle real-time incoming WebSocket comment events
   */
  handleWsCommentEvent(eventData, eventType, currentUser, containerElement) {
    if (!containerElement || !eventData || eventData.task_id != currentTaskId) return;

    if (eventType === 'comment_created') {
      const exists = activeComments.some(c => c.id === eventData.comment.id);
      if (!exists) {
        activeComments.push(eventData.comment);
        this.renderComments(activeComments, containerElement, currentUser);
      }
    } else if (eventType === 'comment_updated') {
      const idx = activeComments.findIndex(c => c.id === eventData.comment.id);
      if (idx !== -1) {
        activeComments[idx] = eventData.comment;
        this.renderComments(activeComments, containerElement, currentUser);
      }
    } else if (eventType === 'comment_deleted') {
      activeComments = activeComments.filter(c => c.id !== eventData.comment_id);
      this.renderComments(activeComments, containerElement, currentUser);
    }
  }
};

window.commentsManager = commentsManager;

  /**
 * FlowVibe Real-Time WebSocket Client
 * Connects to Django Channels ASGI WebSocket Room for Projects
 */

export class ProjectSocket {
  constructor(projectId) {
    this.projectId = projectId;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000;
    this.pingInterval = null;
    this.listeners = new Map();
    this.isConnected = false;

    this.init();
  }

  getWsUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    // Fallback if running from separate dev port (e.g. 5500 / 3000)
    if (host.includes('5500') || host.includes('3000') || !host) {
      host = '127.0.0.1:8000';
    }
    return `${protocol}//${host}/ws/projects/${this.projectId}/`;
  }

  init() {
    const url = this.getWsUrl();
    console.log(`[WS] Connecting to ${url}...`);
    this.updateStatus('connecting');

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log(`[WS] Connected to project room ${this.projectId}`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleEvent(payload);
        } catch (e) {
          console.error('[WS] Failed to parse message:', event.data);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[WS] WebSocket error:', err);
      };

      this.socket.onclose = (event) => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.updateStatus('disconnected');

        if (event.code === 4001 || event.code === 4003) {
          console.warn('[WS] Unauthorized or permission denied, will not reconnect.');
          return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 15000);
          console.log(`[WS] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => this.init(), delay);
        }
      };
    } catch (e) {
      console.error('[WS] Connection init error:', e);
      this.updateStatus('disconnected');
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  send(data) {
    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    if (!this.listeners.has(eventType)) return;
    const list = this.listeners.get(eventType).filter(cb => cb !== callback);
    this.listeners.set(eventType, list);
  }

  handleEvent(payload) {
    const type = payload.type || payload.event_type;
    console.log(`[WS Event received]: ${type}`, payload);

    // Call specific listeners
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach(cb => cb(payload.data, payload));
    }

    // Call wildcard listeners
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => cb(payload.data, payload));
    }
  }

  updateStatus(status) {
    const indicator = document.getElementById('live-ws-indicator');
    const label = document.getElementById('live-ws-label');
    if (!indicator) return;

    if (status === 'connected') {
      indicator.className = 'live-indicator';
      indicator.style.display = 'inline-flex';
      indicator.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      indicator.style.color = 'var(--accent-emerald)';
      if (label) label.textContent = 'Live Sync';
    } else if (status === 'connecting') {
      indicator.className = 'live-indicator';
      indicator.style.display = 'inline-flex';
      indicator.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      indicator.style.color = 'var(--accent-amber)';
      if (label) label.textContent = 'Connecting...';
    } else {
      indicator.className = 'live-indicator';
      indicator.style.borderColor = 'rgba(148, 163, 184, 0.3)';
      indicator.style.color = 'var(--text-muted)';
      if (label) label.textContent = 'Offline';
    }
  }

  destroy() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
  }
}

/* ═══════════════════════════════════════════════════
   SOET Portal — Main JavaScript
   KR Mangalam University
═══════════════════════════════════════════════════ */

// ─── Toast Notification System ─────────────────────
const Toast = {
  container: null,

  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  icons: {
    success: 'bi-check-circle-fill',
    error:   'bi-exclamation-triangle-fill',
    info:    'bi-info-circle-fill',
    warning: 'bi-exclamation-circle-fill',
  },

  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `soet-toast toast-${type}`;
    toast.innerHTML = `
      <i class="bi ${this.icons[type]} toast-icon"></i>
      <span class="flex-grow-1">${message}</span>
      <button class="toast-close" onclick="this.closest('.soet-toast').remove()">
        <i class="bi bi-x-lg"></i>
      </button>
    `;
    this.container.appendChild(toast);

    // Auto dismiss
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg, dur) { this.show(msg, 'success', dur); },
  error(msg, dur)   { this.show(msg, 'error',   dur); },
  info(msg, dur)    { this.show(msg, 'info',     dur); },
  warning(msg, dur) { this.show(msg, 'warning',  dur); },
};

// ─── Loading Overlay ────────────────────────────────
const Loader = {
  overlay: null,

  show(text = 'Please wait...') {
    if (this.overlay) return;
    this.overlay = document.createElement('div');
    this.overlay.className = 'soet-loading-overlay';
    this.overlay.innerHTML = `
      <div class="soet-spinner"></div>
      <div class="soet-loading-text">${text}</div>
    `;
    document.body.appendChild(this.overlay);
  },

  hide() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
};

// ─── Session Timeout Warning ────────────────────────
// JWT expires in 7 days — warn 10 minutes before
const SessionManager = {
  warningTimeout: null,
  logoutTimeout: null,

  init(expiresInMs) {
    const warnAt = expiresInMs - (10 * 60 * 1000); // warn 10 min before
    if (warnAt > 0) {
      this.warningTimeout = setTimeout(() => this.showWarning(), warnAt);
    }
    this.logoutTimeout = setTimeout(() => {
      window.location.href = '/auth/logout';
    }, expiresInMs);
  },

  showWarning() {
    const banner = document.createElement('div');
    banner.className = 'session-warning-banner';
    banner.innerHTML = `
      <i class="bi bi-clock-history fs-5"></i>
      <span>Your session expires in <strong>10 minutes</strong></span>
      <a href="/auth/logout" 
         style="color:white;text-decoration:underline;font-weight:700;white-space:nowrap;">
        Logout now
      </a>
      <button onclick="this.closest('.session-warning-banner').remove()"
              style="background:none;border:none;color:rgba(255,255,255,0.8);cursor:pointer;padding:0;">
        <i class="bi bi-x-lg"></i>
      </button>
    `;
    document.body.appendChild(banner);
  },

  clear() {
    clearTimeout(this.warningTimeout);
    clearTimeout(this.logoutTimeout);
  }
};

// ─── File Validation ────────────────────────────────
const FileValidator = {
  MAX_SIZE_MB: 20,

  validate(input, msgElementId) {
    const msgEl = document.getElementById(msgElementId);
    if (!input.files || !input.files[0]) return true;

    const file = input.files[0];
    const sizeMB = file.size / (1024 * 1024);
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext !== 'pdf' || file.type !== 'application/pdf') {
      if (msgEl) {
        msgEl.textContent = '❌ Only PDF files are allowed.';
        msgEl.className = 'file-validation-msg show invalid';
      }
      input.value = '';
      return false;
    }

    if (sizeMB > this.MAX_SIZE_MB) {
      if (msgEl) {
        msgEl.textContent = `❌ File too large (${sizeMB.toFixed(1)}MB). Maximum allowed: ${this.MAX_SIZE_MB}MB.`;
        msgEl.className = 'file-validation-msg show invalid';
      }
      input.value = '';
      return false;
    }

    if (msgEl) {
      msgEl.textContent = `✅ ${file.name} · ${sizeMB.toFixed(2)}MB · PDF`;
      msgEl.className = 'file-validation-msg show valid';
    }
    return true;
  }
};

// ─── Form Submit with Loader ────────────────────────
function initFormLoaders() {
  document.querySelectorAll('form[data-loading]').forEach(form => {
    form.addEventListener('submit', function(e) {
      // Don't show loader if form is invalid
      if (!this.checkValidity()) return;
      const msg = this.dataset.loading || 'Uploading... Please wait';
      Loader.show(msg);
    });
  });
}

// ─── Page Transition ────────────────────────────────
function initPageTransitions() {
  document.querySelectorAll('a[data-fade]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const href = this.href;
      document.body.classList.add('fade-out');
      setTimeout(() => { window.location.href = href; }, 150);
    });
  });
}

// ─── Confirm Delete ─────────────────────────────────
function initDeleteConfirms() {
  document.querySelectorAll('form[data-confirm]').forEach(form => {
    form.addEventListener('submit', function(e) {
      const msg = this.dataset.confirm || 'Are you sure you want to delete this?';
      if (!confirm(msg)) e.preventDefault();
    });
  });
}

// ─── Auto-dismiss Bootstrap Alerts ──────────────────
function initAlertDismiss() {
  document.querySelectorAll('.alert-auto-dismiss').forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 500);
    }, 4000);
  });
}

// ─── Initialise on DOM Ready ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  initFormLoaders();
  initPageTransitions();
  initDeleteConfirms();
  initAlertDismiss();

  // Show toasts from data attributes (set by EJS)
  const toastEl = document.getElementById('page-toast');
  if (toastEl) {
    Toast.show(toastEl.dataset.message, toastEl.dataset.type || 'info');
  }

  // Session timer (7 days in ms, minus time already elapsed)
  // Only on authenticated pages
  if (document.body.dataset.authenticated === 'true') {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    SessionManager.init(sevenDays);
  }
});

// ─── Notification System ────────────────────────
const NotifSystem = {

  isOpen: false,

  init() {
    if (!document.getElementById('notif-bell')) return;
    this.loadBadge();
    setInterval(() => this.loadBadge(), 30000);
    document.addEventListener('click', (e) => {
      if (!document.getElementById('notif-wrapper').contains(e.target)) {
        this.closeDropdown();
      }
    });
  },

  async loadBadge() {
    try {
      const res = await fetch('/notifications/unread-count');
      const data = await res.json();
      const badge = document.getElementById('notif-badge');
      if (data.count > 0) {
        badge.textContent = data.count > 99 ? '99+' : data.count;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    } catch {}
  },

  async loadDropdown() {
    try {
      const res = await fetch('/notifications/dropdown');
      const data = await res.json();
      const list = document.getElementById('notif-list');
      const empty = document.getElementById('notif-empty');

      if (!data.notifications || data.notifications.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
      }
      if (empty) empty.style.display = 'none';

      const icons = {
        new_material: { icon: 'bi-file-earmark-text-fill', color: '#003399', bg: '#eef2ff' },
        new_pyq:      { icon: 'bi-file-earmark-pdf-fill',  color: '#7b1fa2', bg: '#f3e5f5' },
        new_announcement: { icon: 'bi-megaphone-fill',     color: '#e65100', bg: '#fff3e0' },
        system:       { icon: 'bi-info-circle-fill',       color: '#1565c0', bg: '#e3f2fd' }
      };

      list.innerHTML = data.notifications.map(n => {
        const ic = icons[n.type] || icons.system;
        const time = this.timeAgo(new Date(n.createdAt));
        return `
          <div class="notif-item" data-id="${n._id}" onclick="NotifSystem.markRead('${n._id}', this)"
            style="padding:12px 16px;border-bottom:0.5px solid #f5f5f5;cursor:pointer;
              background:${n.isRead ? 'white' : '#fafcff'};
              display:flex;gap:12px;align-items:flex-start;transition:background 0.15s;">
            <div style="width:36px;height:36px;border-radius:10px;background:${ic.bg};
              display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="bi ${ic.icon}" style="color:${ic.color};font-size:0.95rem;"></i>
            </div>
            <div style="flex-grow:1;min-width:0;">
              <div style="font-size:0.82rem;font-weight:${n.isRead ? '500' : '700'};
                color:#1a1a1a;line-height:1.3;margin-bottom:2px;">${n.title}</div>
              <div style="font-size:0.72rem;color:#888;line-height:1.4;">${n.message}</div>
              <div style="font-size:0.68rem;color:#bbb;margin-top:4px;">
                ${n.subjectCode ? `<span style="background:#eef2ff;color:#003399;padding:1px 6px;border-radius:4px;font-weight:600;margin-right:4px;">${n.subjectCode}</span>` : ''}
                ${time}
              </div>
            </div>
            ${!n.isRead ? `<div style="width:7px;height:7px;background:#003399;border-radius:50%;flex-shrink:0;margin-top:5px;"></div>` : ''}
          </div>`;
      }).join('');

      this.loadBadge();
    } catch {}
  },

  async markRead(id, el) {
    try {
      await fetch(`/notifications/${id}/read`, { method: 'POST' });
      if (el) {
        el.style.background = 'white';
        const dot = el.querySelector('[style*="border-radius:50%"]');
        if (dot) dot.remove();
        const title = el.querySelector('[style*="font-weight:700"]');
        if (title) title.style.fontWeight = '500';
      }
      this.loadBadge();
    } catch {}
  },

  async markAllRead() {
    try {
      await fetch('/notifications/read-all', { method: 'POST' });
      document.querySelectorAll('.notif-item').forEach(item => {
        item.style.background = 'white';
        const dot = item.querySelector('[style*="border-radius:50%"]');
        if (dot) dot.remove();
      });
      this.loadBadge();
    } catch {}
  },

  openDropdown() {
    const dd = document.getElementById('notif-dropdown');
    dd.style.display = 'block';
    this.isOpen = true;
    this.loadDropdown();
  },

  closeDropdown() {
    const dd = document.getElementById('notif-dropdown');
    if (dd) dd.style.display = 'none';
    this.isOpen = false;
  },

  timeAgo(date) {
    const diff = Math.floor((Date.now() - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }
};

function toggleNotifDropdown() {
  if (NotifSystem.isOpen) {
    NotifSystem.closeDropdown();
  } else {
    NotifSystem.openDropdown();
  }
}

function markAllRead() {
  NotifSystem.markAllRead();
}

document.addEventListener('DOMContentLoaded', function() {
  NotifSystem.init();
});
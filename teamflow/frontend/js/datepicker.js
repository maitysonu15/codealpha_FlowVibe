/**
 * FlowVibe Ultra-Glossy Glassmorphic Datepicker Engine
 * Replaces default browser date pickers with a sleek, futuristic, and highly responsive calendar.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class SyncDatePicker {
  constructor(inputElement, options = {}) {
    this.input = typeof inputElement === 'string' ? document.querySelector(inputElement) : inputElement;
    if (!this.input) return;

    // Prevent double instantiation
    if (this.input._syncDatePicker) {
      return this.input._syncDatePicker;
    }
    this.input._syncDatePicker = this;

    const inputPlaceholder = this.input ? (this.input.getAttribute('placeholder') || this.input.placeholder) : null;
    this.options = {
      placeholder: options.placeholder || inputPlaceholder || 'Select date...',
      minDate: options.minDate || null,
      maxDate: options.maxDate || null,
      onSelect: options.onSelect || null,
      ...options
    };

    // State
    this.selectedDate = this.parseDate(this.input.value);
    const initialViewDate = this.selectedDate || new Date();
    this.viewYear = initialViewDate.getFullYear();
    this.viewMonth = initialViewDate.getMonth();
    this.isOpen = false;
    this.isJumpOpen = false;

    this.initDOM();
    this.bindEvents();
    this.updateDisplay();
    this.interceptInputValue();
  }

  /**
   * Parse YYYY-MM-DD string to Date object (local timezone safe)
   */
  parseDate(str) {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Format Date to YYYY-MM-DD for backend and standard input value
   */
  formatISO(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Format Date for human friendly display in trigger
   */
  formatHuman(date) {
    if (!date) return '';
    const today = new Date();
    const isToday = this.isSameDay(date, today);

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = this.isSameDay(date, tomorrow);

    const dayName = DAY_SHORT[date.getDay()];
    const monthName = MONTH_SHORT[date.getMonth()];
    const dayNum = date.getDate();
    const year = date.getFullYear();

    if (isToday) return `Today, ${monthName} ${dayNum}`;
    if (isTomorrow) return `Tomorrow, ${monthName} ${dayNum}`;
    if (year === today.getFullYear()) {
      return `${dayName}, ${monthName} ${dayNum}`;
    }
    return `${dayName}, ${monthName} ${dayNum}, ${year}`;
  }

  isSameDay(d1, d2) {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  /**
   * Build the Custom Trigger and Floating Popup DOM
   */
  initDOM() {
    // Hide native date picker input
    this.input.type = 'hidden';
    this.input.classList.add('sync-datepicker-input-hidden');

    // Create container wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'sync-datepicker-wrap';
    this.input.parentNode.insertBefore(this.wrapper, this.input);
    this.wrapper.appendChild(this.input);

    // Create Trigger Element
    this.trigger = document.createElement('div');
    this.trigger.className = 'sync-datepicker-trigger';
    this.trigger.tabIndex = 0;
    this.trigger.innerHTML = `
      <div class="sync-datepicker-left">
        <div class="sync-datepicker-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <span class="sync-datepicker-text placeholder">${this.options.placeholder}</span>
      </div>
      <div class="sync-datepicker-right">
        <button type="button" class="sync-datepicker-clear-btn" title="Clear Date">✕</button>
        <svg class="sync-datepicker-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    `;
    this.wrapper.appendChild(this.trigger);

    this.textEl = this.trigger.querySelector('.sync-datepicker-text');
    this.clearBtn = this.trigger.querySelector('.sync-datepicker-clear-btn');

    // Create Calendar Popup
    this.popup = document.createElement('div');
    this.popup.className = 'sync-calendar-popup';
    this.popup.innerHTML = `
      <!-- Presets Bar -->
      <div class="calendar-presets-bar">
        <button type="button" class="calendar-preset-chip" data-preset="today">⚡ Today</button>
        <button type="button" class="calendar-preset-chip" data-preset="tomorrow">Tomorrow</button>
        <button type="button" class="calendar-preset-chip" data-preset="next-week">Next Week</button>
        <button type="button" class="calendar-preset-chip" data-preset="2-weeks">In 2 Weeks</button>
      </div>

      <!-- Header Month & Year Navigation -->
      <div class="calendar-header">
        <div class="calendar-month-selector" title="Jump to month & year">
          <span class="calendar-month-label">September 2026</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="calendar-nav-buttons">
          <button type="button" class="calendar-nav-btn btn-prev-month" title="Previous Month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button type="button" class="calendar-nav-btn btn-next-month" title="Next Month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- Weekday Headers -->
      <div class="calendar-weekdays">
        <div class="calendar-weekday">Su</div>
        <div class="calendar-weekday">Mo</div>
        <div class="calendar-weekday">Tu</div>
        <div class="calendar-weekday">We</div>
        <div class="calendar-weekday">Th</div>
        <div class="calendar-weekday">Fr</div>
        <div class="calendar-weekday">Sa</div>
      </div>

      <!-- Days Grid -->
      <div class="calendar-days-grid"></div>

      <!-- Footer Actions -->
      <div class="calendar-footer">
        <div class="calendar-footer-left">No date selected</div>
        <div class="calendar-footer-actions">
          <button type="button" class="calendar-btn-clear">Clear</button>
          <button type="button" class="calendar-btn-done">Done</button>
        </div>
      </div>

      <!-- Month / Year Jump Overlay -->
      <div class="calendar-jump-overlay">
        <div class="calendar-jump-header">
          <span class="calendar-jump-title">Select Month & Year</span>
          <button type="button" class="calendar-nav-btn btn-close-jump" title="Back to Calendar">✕</button>
        </div>
        <div class="calendar-year-stepper">
          <button type="button" class="calendar-nav-btn btn-prev-year">‹</button>
          <span class="calendar-year-val">2026</span>
          <button type="button" class="calendar-nav-btn btn-next-year">›</button>
        </div>
        <div class="calendar-months-grid">
          ${MONTH_SHORT.map((m, idx) => `<button type="button" class="calendar-month-btn" data-month="${idx}">${m}</button>`).join('')}
        </div>
      </div>
    `;
    this.wrapper.appendChild(this.popup);

    this.monthLabel = this.popup.querySelector('.calendar-month-label');
    this.daysGrid = this.popup.querySelector('.calendar-days-grid');
    this.footerStatus = this.popup.querySelector('.calendar-footer-left');
    this.jumpOverlay = this.popup.querySelector('.calendar-jump-overlay');
    this.yearValEl = this.popup.querySelector('.calendar-year-val');
  }

  /**
   * Bind all user interactions
   */
  bindEvents() {
    // Open/Toggle Calendar on Trigger Click
    this.trigger.addEventListener('click', (e) => {
      if (e.target.closest('.sync-datepicker-clear-btn')) return;
      this.toggle();
    });

    // Keyboard trigger accessibility
    this.trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Clear Button on Trigger
    this.clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setDate(null);
    });

    // Navigation Buttons
    this.popup.querySelector('.btn-prev-month').addEventListener('click', (e) => {
      e.stopPropagation();
      this.prevMonth();
    });

    this.popup.querySelector('.btn-next-month').addEventListener('click', (e) => {
      e.stopPropagation();
      this.nextMonth();
    });

    // Month Selector Click -> Open Jump Overlay
    this.popup.querySelector('.calendar-month-selector').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openJump();
    });

    // Jump Overlay Close
    this.popup.querySelector('.btn-close-jump').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeJump();
    });

    // Jump Year Stepper
    this.popup.querySelector('.btn-prev-year').addEventListener('click', (e) => {
      e.stopPropagation();
      this.viewYear--;
      this.yearValEl.textContent = this.viewYear;
    });

    this.popup.querySelector('.btn-next-year').addEventListener('click', (e) => {
      e.stopPropagation();
      this.viewYear++;
      this.yearValEl.textContent = this.viewYear;
    });

    // Jump Month Buttons
    this.popup.querySelectorAll('.calendar-month-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.viewMonth = parseInt(btn.dataset.month, 10);
        this.closeJump();
        this.renderCalendar();
      });
    });

    // Preset Chips
    this.popup.querySelectorAll('.calendar-preset-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const preset = chip.dataset.preset;
        const now = new Date();
        let target = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (preset === 'today') {
          // target is today
        } else if (preset === 'tomorrow') {
          target.setDate(target.getDate() + 1);
        } else if (preset === 'next-week') {
          target.setDate(target.getDate() + 7);
        } else if (preset === '2-weeks') {
          target.setDate(target.getDate() + 14);
        }

        this.setDate(target);
        this.close();
      });
    });

    // Footer Clear & Done
    this.popup.querySelector('.calendar-btn-clear').addEventListener('click', (e) => {
      e.stopPropagation();
      this.setDate(null);
    });

    this.popup.querySelector('.calendar-btn-done').addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Global Dismiss on Click Outside
    document.addEventListener('mousedown', (e) => {
      if (this.isOpen && !this.wrapper.contains(e.target)) {
        this.close();
      }
    });

    // Dismiss on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Render the 7x6 Calendar Grid for current viewMonth and viewYear
   */
  renderCalendar() {
    this.monthLabel.textContent = `${MONTH_NAMES[this.viewMonth]} ${this.viewYear}`;
    this.daysGrid.innerHTML = '';

    const firstDayIndex = new Date(this.viewYear, this.viewMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();

    const today = new Date();

    // 1. Previous Month Spillover Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.textContent = dayNum;
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.prevMonth();
        this.setDate(new Date(this.viewYear, this.viewMonth, dayNum));
      });
      this.daysGrid.appendChild(cell);
    }

    // 2. Current Month Days
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(this.viewYear, this.viewMonth, day);
      const isToday = this.isSameDay(cellDate, today);
      const isSelected = this.isSameDay(cellDate, this.selectedDate);

      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';
      if (isToday) cell.classList.add('today');
      if (isSelected) cell.classList.add('selected');
      cell.textContent = day;

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setDate(cellDate);
      });

      this.daysGrid.appendChild(cell);
    }

    // 3. Next Month Spillover Days (to fill complete 42 or 35 grid)
    const totalRendered = firstDayIndex + daysInMonth;
    const remainingCells = (totalRendered <= 35 ? 35 : 42) - totalRendered;
    for (let day = 1; day <= remainingCells; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.textContent = day;
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextMonth();
        this.setDate(new Date(this.viewYear, this.viewMonth, day));
      });
      this.daysGrid.appendChild(cell);
    }

    // Update Footer status label
    if (this.selectedDate) {
      this.footerStatus.textContent = `Due: ${MONTH_SHORT[this.selectedDate.getMonth()]} ${this.selectedDate.getDate()}, ${this.selectedDate.getFullYear()}`;
    } else {
      this.footerStatus.textContent = 'No date selected';
    }
  }

  prevMonth() {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear--;
    } else {
      this.viewMonth--;
    }
    this.renderCalendar();
  }

  nextMonth() {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear++;
    } else {
      this.viewMonth++;
    }
    this.renderCalendar();
  }

  openJump() {
    this.isJumpOpen = true;
    this.yearValEl.textContent = this.viewYear;
    this.popup.querySelectorAll('.calendar-month-btn').forEach(btn => {
      const m = parseInt(btn.dataset.month, 10);
      btn.classList.toggle('selected', m === this.viewMonth);
    });
    this.jumpOverlay.classList.add('open');
  }

  closeJump() {
    this.isJumpOpen = false;
    this.jumpOverlay.classList.remove('open');
  }

  /**
   * Set Selected Date, update input and trigger display
   */
  setDate(date, triggerChange = true) {
    this.selectedDate = date;
    const isoVal = this.formatISO(date);

    if (this.input.value !== isoVal) {
      this.input.value = isoVal;
      if (triggerChange) {
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    if (date) {
      this.viewYear = date.getFullYear();
      this.viewMonth = date.getMonth();
    }

    this.updateDisplay();
    this.renderCalendar();

    if (this.options.onSelect && triggerChange) {
      this.options.onSelect(date, isoVal);
    }
  }

  updateDisplay() {
    if (this.selectedDate) {
      this.textEl.textContent = this.formatHuman(this.selectedDate);
      this.textEl.classList.remove('placeholder');
      this.textEl.classList.add('has-value');
      this.clearBtn.style.display = 'flex';
    } else {
      this.textEl.textContent = this.options.placeholder;
      this.textEl.classList.add('placeholder');
      this.textEl.classList.remove('has-value');
      this.clearBtn.style.display = 'none';
    }
  }

  open() {
    // Close any other open datepickers on the page
    document.querySelectorAll('.sync-calendar-popup.open').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.sync-datepicker-trigger.active').forEach(t => t.classList.remove('active'));

    if (this.selectedDate) {
      this.viewYear = this.selectedDate.getFullYear();
      this.viewMonth = this.selectedDate.getMonth();
    }

    this.renderCalendar();
    this.closeJump();
    this.isOpen = true;
    this.trigger.classList.add('active');
    this.popup.classList.add('open');

    // Auto-adjust positioning if popup would overflow viewport or container
    const triggerRect = this.trigger.getBoundingClientRect();
    const popupWidth = 330;
    
    // Horizontal alignment
    if (triggerRect.left + popupWidth > window.innerWidth - 20) {
      this.popup.style.left = 'auto';
      this.popup.style.right = '0';
    } else {
      this.popup.style.left = '0';
      this.popup.style.right = 'auto';
    }

    // Vertical alignment
    const popupHeight = 380;
    if (triggerRect.bottom + popupHeight > window.innerHeight - 20 && triggerRect.top > popupHeight) {
      this.popup.style.top = 'auto';
      this.popup.style.bottom = 'calc(100% + 8px)';
    } else {
      this.popup.style.top = 'calc(100% + 8px)';
      this.popup.style.bottom = 'auto';
    }
  }

  close() {
    this.isOpen = false;
    this.trigger.classList.remove('active');
    this.popup.classList.remove('open');
    this.closeJump();
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Intercept programmatic input.value changes
   * (e.g. `input.value = '2026-09-14'` or `input.value = ''`)
   */
  interceptInputValue() {
    const input = this.input;
    const self = this;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    Object.defineProperty(input, 'value', {
      get() {
        return descriptor.get.call(this);
      },
      set(newVal) {
        descriptor.set.call(this, newVal);
        const parsed = self.parseDate(newVal);
        self.selectedDate = parsed;
        if (parsed) {
          self.viewYear = parsed.getFullYear();
          self.viewMonth = parsed.getMonth();
        }
        self.updateDisplay();
        if (self.isOpen) {
          self.renderCalendar();
        }
      },
      configurable: true
    });
  }

  /**
   * Static helper to auto-initialize all date inputs in the page
   */
  static initAll(selector = 'input[type="date"], input[data-datepicker]') {
    const inputs = document.querySelectorAll(selector);
    const instances = [];
    inputs.forEach(input => {
      instances.push(new SyncDatePicker(input));
    });
    return instances;
  }

  static attach(input, options) {
    return new SyncDatePicker(input, options);
  }
}

// Auto-initialize on DOMContentLoaded if not using modular imports
if (typeof window !== 'undefined') {
  window.SyncDatePicker = SyncDatePicker;
}

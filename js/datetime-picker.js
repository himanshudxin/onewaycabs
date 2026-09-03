/**
 * OneWayTaxiBihar - Executive & Ethical Tap-Only Date, Month & Clock Time Picker
 * Pure click/tap interaction: Zero typing required.
 * Ultra-professional, transparent, ethical outstation cab schedule engine.
 */

(function () {
  'use strict';

  // Constants
  const MONTHS_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const MONTHS_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // State
  const state = {
    pickupDate: new Date(),
    returnDate: null,
    activeMode: 'pickup', // 'pickup' | 'return'
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    isMonthGridOpen: false,

    // Time State
    pickupHour: 10,
    pickupMinute: '00',
    pickupAmPm: 'AM'
  };

  // Helper: Format Date to YYYY-MM-DD
  function toYMD(d) {
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper: Parse YYYY-MM-DD
  function fromYMD(str) {
    if (!str) return new Date();
    const parts = str.split('-');
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  // Helper: Relative badge calculation
  function getRelativeTag(targetDate) {
    if (!targetDate) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'TOMORROW';
    if (diffDays === 2) return 'IN 2 DAYS';
    if (diffDays > 2 && diffDays <= 6) return DAYS_SHORT[target.getDay()].toUpperCase();
    if (diffDays > 6) return `+${diffDays} DAYS`;
    return 'PAST';
  }

  // Helper: Professional formatted date display (e.g. "Thu, 04 Sep 2026")
  function formatDisplayDate(dateObj) {
    if (!dateObj) return 'Select Date';
    const dayName = DAYS_SHORT[dateObj.getDay()];
    const dayNum = String(dateObj.getDate()).padStart(2, '0');
    const monthName = MONTHS_SHORT[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  }

  // Helper: Detailed Ethical Date display (e.g. "Thursday, 04 September 2026")
  function formatFullDate(dateObj) {
    if (!dateObj) return 'Select Date';
    const dayName = DAYS_FULL[dateObj.getDay()];
    const dayNum = String(dateObj.getDate()).padStart(2, '0');
    const monthName = MONTHS_FULL[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  }

  // Helper: Determine time slot tag
  function getTimeSlotTag(hour, ampm) {
    let h = parseInt(hour, 10);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    if (h >= 4 && h < 11) return 'MORNING';
    if (h >= 11 && h < 15) return 'MIDDAY';
    if (h >= 15 && h < 18) return 'AFTERNOON';
    if (h >= 18 && h < 22) return 'EVENING';
    return 'NIGHT';
  }

  /* ==========================================================================
     DOM SYNCHRONIZATION & DISPLAY CARD UPDATES
     ========================================================================== */
  function updateScheduleCards() {
    // 1. Pickup Date Card
    const displayPickupDate = document.getElementById('display-pickup-date');
    const pickupDateRelTag = document.getElementById('pickup-date-rel-tag');
    const pickupDateInput = document.getElementById('pickup-date-input');

    if (displayPickupDate) {
      displayPickupDate.textContent = formatDisplayDate(state.pickupDate);
    }
    if (pickupDateRelTag) {
      pickupDateRelTag.textContent = getRelativeTag(state.pickupDate);
    }
    if (pickupDateInput) {
      const ymd = toYMD(state.pickupDate);
      if (pickupDateInput.value !== ymd) {
        pickupDateInput.value = ymd;
        pickupDateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 2. Pickup Time Card
    const displayPickupTime = document.getElementById('display-pickup-time');
    const pickupTimeSlotTag = document.getElementById('pickup-time-slot-tag');
    const pickupTimeSelect = document.getElementById('pickup-time-select');

    const formattedTime = `${String(state.pickupHour).padStart(2, '0')}:${state.pickupMinute} ${state.pickupAmPm}`;
    if (displayPickupTime) {
      displayPickupTime.textContent = formattedTime;
    }
    if (pickupTimeSlotTag) {
      pickupTimeSlotTag.textContent = getTimeSlotTag(state.pickupHour, state.pickupAmPm);
    }
    if (pickupTimeSelect) {
      let exists = Array.from(pickupTimeSelect.options).some(opt => opt.value === formattedTime);
      if (!exists) {
        const newOpt = new Option(formattedTime, formattedTime, true, true);
        pickupTimeSelect.add(newOpt);
      }
      if (pickupTimeSelect.value !== formattedTime) {
        pickupTimeSelect.value = formattedTime;
        pickupTimeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 3. Return Date Card (Round Trip)
    const displayReturnDate = document.getElementById('display-return-date');
    const returnDateRelTag = document.getElementById('return-date-rel-tag');
    const returnDateInput = document.getElementById('return-date-input');

    if (displayReturnDate) {
      displayReturnDate.textContent = state.returnDate ? formatDisplayDate(state.returnDate) : 'Select Return Date';
    }
    if (returnDateRelTag) {
      returnDateRelTag.textContent = state.returnDate ? getRelativeTag(state.returnDate) : 'ROUND TRIP';
    }
    if (returnDateInput && state.returnDate) {
      const ymd = toYMD(state.returnDate);
      if (returnDateInput.value !== ymd) {
        returnDateInput.value = ymd;
        returnDateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  /* ==========================================================================
     EXECUTIVE TAP-ONLY CALENDAR ENGINE
     ========================================================================== */
  function renderCalendarDays() {
    const daysGrid = document.getElementById('cal-days-grid');
    const monthYearLabel = document.getElementById('cal-month-year-label');
    const prevBtn = document.getElementById('cal-prev-month');
    if (!daysGrid) return;

    if (monthYearLabel) {
      monthYearLabel.textContent = `${MONTHS_FULL[state.viewMonth]} ${state.viewYear}`;
    }

    const today = new Date();
    const isCurrentMonth = (state.viewYear === today.getFullYear() && state.viewMonth === today.getMonth());
    if (prevBtn) {
      prevBtn.disabled = isCurrentMonth;
      prevBtn.classList.toggle('disabled', isCurrentMonth);
    }

    daysGrid.innerHTML = '';

    const firstDayIndex = new Date(state.viewYear, state.viewMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(state.viewYear, state.viewMonth, 0).getDate();

    const activeDate = (state.activeMode === 'return' ? state.returnDate : state.pickupDate) || today;
    const activeYMD = toYMD(activeDate);
    const todayYMD = toYMD(today);

    const minSelectableDate = (state.activeMode === 'return' && state.pickupDate) ? state.pickupDate : today;
    const minYMD = toYMD(minSelectableDate);

    // 1. Trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell prev-month-day disabled';
      cell.disabled = true;
      cell.textContent = dayNum;
      daysGrid.appendChild(cell);
    }

    // 2. Days of active month
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(state.viewYear, state.viewMonth, day);
      const cellYMD = toYMD(cellDate);

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell current-month-day';
      cell.textContent = day;

      // Disable past dates
      if (cellYMD < minYMD) {
        cell.classList.add('disabled');
        cell.disabled = true;
      } else {
        if (cellYMD === todayYMD) {
          cell.classList.add('today');
          cell.title = "Today's Date";
        }

        if (cellYMD === activeYMD) {
          cell.classList.add('selected');
        }

        // 1-Tap select date with zero typing
        cell.addEventListener('click', (e) => {
          e.preventDefault();
          selectDate(cellDate);
        });
      }

      daysGrid.appendChild(cell);
    }

    // 3. Leading days for next month
    const totalCellsSoFar = firstDayIndex + daysInMonth;
    const remainingCells = (totalCellsSoFar <= 35 ? 35 : 42) - totalCellsSoFar;
    for (let day = 1; day <= remainingCells; day++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell next-month-day disabled';
      cell.disabled = true;
      cell.textContent = day;
      daysGrid.appendChild(cell);
    }

    updateCalendarSummary();
  }

  // 12-Month Tap Grid (Jan through Dec)
  function renderMonthGrid() {
    const monthGrid = document.getElementById('cal-month-grid');
    if (!monthGrid) return;

    monthGrid.innerHTML = '';
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    MONTHS_SHORT.forEach((mShort, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-month-pill';
      btn.textContent = mShort;

      if (state.viewYear === currentYear && idx < currentMonth) {
        btn.classList.add('disabled');
        btn.disabled = true;
      }

      if (idx === state.viewMonth) {
        btn.classList.add('selected');
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        state.viewMonth = idx;
        toggleMonthGrid(false);
        renderCalendarDays();
      });

      monthGrid.appendChild(btn);
    });
  }

  function toggleMonthGrid(show) {
    state.isMonthGridOpen = (typeof show === 'boolean') ? show : !state.isMonthGridOpen;
    const monthGrid = document.getElementById('cal-month-grid');
    const daysView = document.getElementById('cal-days-view');
    const monthTitleBtn = document.getElementById('cal-month-title');

    if (monthGrid && daysView) {
      if (state.isMonthGridOpen) {
        renderMonthGrid();
        monthGrid.style.display = 'grid';
        daysView.style.display = 'none';
        if (monthTitleBtn) monthTitleBtn.classList.add('open');
      } else {
        monthGrid.style.display = 'none';
        daysView.style.display = 'block';
        if (monthTitleBtn) monthTitleBtn.classList.remove('open');
      }
    }
  }

  function selectDate(dateObj) {
    if (state.activeMode === 'return') {
      state.returnDate = dateObj;
    } else {
      state.pickupDate = dateObj;
      if (state.returnDate && state.returnDate < dateObj) {
        const nextDay = new Date(dateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        state.returnDate = nextDay;
      }
    }

    updateScheduleCards();
    renderCalendarDays();

    // Subtle haptic-like visual feedback then close
    setTimeout(() => {
      closeCalendarModal();
    }, 180);
  }

  function updateCalendarSummary() {
    const summary = document.getElementById('cal-selected-summary');
    if (!summary) return;

    const targetDate = state.activeMode === 'return' ? state.returnDate : state.pickupDate;
    if (targetDate) {
      const rel = getRelativeTag(targetDate);
      summary.textContent = `${formatFullDate(targetDate)} • ${rel}`;
    } else {
      summary.textContent = 'Please tap a date above';
    }
  }

  function openCalendarModal(mode = 'pickup') {
    state.activeMode = mode;
    const modal = document.getElementById('modal-exec-calendar');
    const badge = document.getElementById('exec-cal-mode-badge');
    const title = document.getElementById('exec-cal-title');

    if (badge) {
      badge.textContent = mode === 'return' ? 'RETURN DATE (ROUND TRIP)' : 'PICKUP DATE';
    }
    if (title) {
      title.textContent = mode === 'return' ? 'Select Return Date' : 'Select Pickup Date';
    }

    const refDate = (mode === 'return' ? state.returnDate : state.pickupDate) || state.pickupDate || new Date();
    state.viewYear = refDate.getFullYear();
    state.viewMonth = refDate.getMonth();

    toggleMonthGrid(false);
    renderCalendarDays();

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('open', 'active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCalendarModal() {
    const modal = document.getElementById('modal-exec-calendar');
    if (modal) {
      modal.classList.remove('open', 'active');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  /* ==========================================================================
     EXECUTIVE TAP-ONLY CLOCK & TIME ENGINE
     ========================================================================== */
  function renderClockPicker() {
    const hoursGrid = document.getElementById('clock-hours-grid');
    const minutesGrid = document.getElementById('clock-minutes-grid');
    const displayHour = document.getElementById('clock-display-hour');
    const displayMinute = document.getElementById('clock-display-minute');
    const amBtn = document.getElementById('ampm-am');
    const pmBtn = document.getElementById('ampm-pm');
    const summary = document.getElementById('clock-selected-summary');

    // Update Digital Readout
    if (displayHour) displayHour.textContent = String(state.pickupHour).padStart(2, '0');
    if (displayMinute) displayMinute.textContent = state.pickupMinute;

    if (amBtn && pmBtn) {
      amBtn.classList.toggle('active', state.pickupAmPm === 'AM');
      pmBtn.classList.toggle('active', state.pickupAmPm === 'PM');
    }

    // 1. Render Hours (01 to 12)
    if (hoursGrid) {
      hoursGrid.innerHTML = '';
      for (let h = 1; h <= 12; h++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'clock-cell hour-cell';
        btn.textContent = String(h).padStart(2, '0');
        if (h === state.pickupHour) {
          btn.classList.add('selected');
        }
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          state.pickupHour = h;
          renderClockPicker();
        });
        hoursGrid.appendChild(btn);
      }
    }

    // 2. Render Minutes (00, 15, 30, 45 + common slots)
    if (minutesGrid) {
      minutesGrid.innerHTML = '';
      const commonMins = ['00', '15', '30', '45', '05', '10', '20', '25', '35', '40', '50', '55'];
      commonMins.forEach(minStr => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'clock-cell minute-cell';
        btn.textContent = minStr;
        if (minStr === state.pickupMinute) {
          btn.classList.add('selected');
        }
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          state.pickupMinute = minStr;
          renderClockPicker();
        });
        minutesGrid.appendChild(btn);
      });
    }

    if (summary) {
      const slot = getTimeSlotTag(state.pickupHour, state.pickupAmPm);
      summary.textContent = `${String(state.pickupHour).padStart(2, '0')}:${state.pickupMinute} ${state.pickupAmPm} (${slot} Departure)`;
    }
  }

  function setTimeByString(timeStr) {
    if (!timeStr) return;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      state.pickupHour = parseInt(match[1], 10);
      state.pickupMinute = match[2];
      state.pickupAmPm = match[3].toUpperCase();
      renderClockPicker();
    }
  }

  function openClockModal() {
    const modal = document.getElementById('modal-exec-clock');
    const select = document.getElementById('pickup-time-select');
    if (select && select.value) {
      setTimeByString(select.value);
    }
    renderClockPicker();

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('open', 'active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeClockModal() {
    const modal = document.getElementById('modal-exec-clock');
    if (modal) {
      modal.classList.remove('open', 'active');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  /* ==========================================================================
     EVENT LISTENERS & BINDINGS
     ========================================================================== */
  function initEventListeners() {
    // 1. Date Card Click -> Open Calendar
    const pickupDateCard = document.getElementById('btn-pickup-date-card');
    if (pickupDateCard) {
      pickupDateCard.onclick = (e) => {
        e.preventDefault();
        openCalendarModal('pickup');
      };
      pickupDateCard.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCalendarModal('pickup');
        }
      };
    }

    // 2. Return Date Card Click -> Open Calendar (Return Mode)
    const returnDateCard = document.getElementById('return-date-row');
    if (returnDateCard) {
      returnDateCard.onclick = (e) => {
        e.preventDefault();
        openCalendarModal('return');
      };
      returnDateCard.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCalendarModal('return');
        }
      };
    }

    // 3. Time Card Click -> Open Clock
    const pickupTimeCard = document.getElementById('btn-pickup-time-card');
    if (pickupTimeCard) {
      pickupTimeCard.onclick = (e) => {
        e.preventDefault();
        openClockModal();
      };
      pickupTimeCard.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openClockModal();
        }
      };
    }

    // 4. Calendar Navigation & Quick Chips
    const prevMonthBtn = document.getElementById('cal-prev-month');
    const nextMonthBtn = document.getElementById('cal-next-month');
    const monthTitleBtn = document.getElementById('cal-month-title');
    const closeCalBtn = document.getElementById('btn-close-exec-calendar');
    const confirmCalBtn = document.getElementById('btn-confirm-calendar');

    if (prevMonthBtn) {
      prevMonthBtn.onclick = (e) => {
        e.preventDefault();
        if (state.viewMonth === 0) {
          state.viewMonth = 11;
          state.viewYear--;
        } else {
          state.viewMonth--;
        }
        renderCalendarDays();
      };
    }

    if (nextMonthBtn) {
      nextMonthBtn.onclick = (e) => {
        e.preventDefault();
        if (state.viewMonth === 11) {
          state.viewMonth = 0;
          state.viewYear++;
        } else {
          state.viewMonth++;
        }
        renderCalendarDays();
      };
    }

    if (monthTitleBtn) {
      monthTitleBtn.onclick = (e) => {
        e.preventDefault();
        toggleMonthGrid();
      };
    }

    if (closeCalBtn) closeCalBtn.onclick = closeCalendarModal;
    if (confirmCalBtn) confirmCalBtn.onclick = closeCalendarModal;

    // Quick Date Chips: Today, Tomorrow, Day After, Weekend
    document.querySelectorAll('#cal-quick-chips [data-quick]').forEach(chip => {
      chip.onclick = (e) => {
        e.preventDefault();
        const action = chip.dataset.quick;
        const now = new Date();

        if (action === 'today') {
          selectDate(now);
        } else if (action === 'tomorrow') {
          const tom = new Date(now);
          tom.setDate(tom.getDate() + 1);
          selectDate(tom);
        } else if (action === 'day-after') {
          const da = new Date(now);
          da.setDate(da.getDate() + 2);
          selectDate(da);
        } else if (action === 'weekend') {
          const wk = new Date(now);
          const day = wk.getDay();
          const daysToSat = (6 - day + 7) % 7 || 7;
          wk.setDate(wk.getDate() + daysToSat);
          selectDate(wk);
        }
      };
    });

    // 5. Clock Modal Controls & Quick Time Chips
    const closeClockBtn = document.getElementById('btn-close-exec-clock');
    const confirmClockBtn = document.getElementById('btn-confirm-clock');
    const amBtn = document.getElementById('ampm-am');
    const pmBtn = document.getElementById('ampm-pm');

    if (closeClockBtn) closeClockBtn.onclick = closeClockModal;
    if (confirmClockBtn) {
      confirmClockBtn.onclick = (e) => {
        e.preventDefault();
        updateScheduleCards();
        closeClockModal();
      };
    }

    if (amBtn) {
      amBtn.onclick = (e) => {
        e.preventDefault();
        state.pickupAmPm = 'AM';
        renderClockPicker();
      };
    }

    if (pmBtn) {
      pmBtn.onclick = (e) => {
        e.preventDefault();
        state.pickupAmPm = 'PM';
        renderClockPicker();
      };
    }

    // Quick Time Chips: 06:00 AM, 09:00 AM, etc.
    document.querySelectorAll('#modal-exec-clock [data-quick-time]').forEach(chip => {
      chip.onclick = (e) => {
        e.preventDefault();
        setTimeByString(chip.dataset.quickTime);
        updateScheduleCards();
        setTimeout(() => {
          closeClockModal();
        }, 180);
      };
    });

    // Modal background overlay click -> close
    const calModal = document.getElementById('modal-exec-calendar');
    if (calModal) {
      calModal.onclick = (e) => {
        if (e.target === calModal) closeCalendarModal();
      };
    }

    const clockModal = document.getElementById('modal-exec-clock');
    if (clockModal) {
      clockModal.onclick = (e) => {
        if (e.target === clockModal) closeClockModal();
      };
    }

    // ESC key closes any active picker modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCalendarModal();
        closeClockModal();
      }
    });

    // Sync if hidden inputs change from outside scripts
    const pickupDateInput = document.getElementById('pickup-date-input');
    if (pickupDateInput) {
      pickupDateInput.addEventListener('change', () => {
        if (pickupDateInput.value) {
          state.pickupDate = fromYMD(pickupDateInput.value);
          const displayPickupDate = document.getElementById('display-pickup-date');
          const pickupDateRelTag = document.getElementById('pickup-date-rel-tag');
          if (displayPickupDate) displayPickupDate.textContent = formatDisplayDate(state.pickupDate);
          if (pickupDateRelTag) pickupDateRelTag.textContent = getRelativeTag(state.pickupDate);
        }
      });
    }

    const pickupTimeSelect = document.getElementById('pickup-time-select');
    if (pickupTimeSelect) {
      pickupTimeSelect.addEventListener('change', () => {
        if (pickupTimeSelect.value) {
          setTimeByString(pickupTimeSelect.value);
          const displayPickupTime = document.getElementById('display-pickup-time');
          const pickupTimeSlotTag = document.getElementById('pickup-time-slot-tag');
          if (displayPickupTime) displayPickupTime.textContent = pickupTimeSelect.value;
          if (pickupTimeSlotTag) pickupTimeSlotTag.textContent = getTimeSlotTag(state.pickupHour, state.pickupAmPm);
        }
      });
    }
  }

  // Initial bootstrap
  function init() {
    const today = new Date();
    state.pickupDate = today;
    state.viewYear = today.getFullYear();
    state.viewMonth = today.getMonth();

    initEventListeners();
    updateScheduleCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global interface
  window.ExecDateTimePicker = {
    openCalendar: openCalendarModal,
    closeCalendar: closeCalendarModal,
    openClock: openClockModal,
    closeClock: closeClockModal,
    updateCards: updateScheduleCards,
    getState: () => ({ ...state })
  };

})();

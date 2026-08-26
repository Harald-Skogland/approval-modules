/* =========================================================================
   Approval — My tasks : grid behaviour

   The real app renders this table with AG Grid, using row grouping and the
   column tool panel — both AG Grid *Enterprise* features. Rather than pull a
   licensed dependency into a prototype, the grid is rendered here directly
   and styled to AG Grid's measured metrics. 202 rows in plain DOM need no
   virtualisation.
   ========================================================================= */

(function () {
  'use strict';

  /* ---------------------------- columns -------------------------------- */
  /* ids and widths measured from the staging grid; `on` marks the twelve
     columns visible by default. Type is widened from the measured 80px
     because it now carries the document type name instead of an icon. */

  var COLUMNS = [
    { id: 'select',                     label: '',                   w: 44,  on: true, fixed: true },
    { id: 'documentType',               label: 'Type',               w: 150, on: true },
    { id: 'from',                       label: 'From',               w: 180, on: true },
    { id: 'description',                label: 'Description',        w: 260, on: true },
    { id: 'companyName',                label: 'Company',            w: 160, on: true },
    { id: 'documentDueDate',            label: 'Doc. due',           w: 120, on: true, type: 'date' },
    { id: 'dueDate',                    label: 'Task due',           w: 120, on: true, type: 'date' },
    { id: 'activatedDate',              label: 'Task rec.',          w: 120, on: true, type: 'date' },
    { id: 'invoiceDate',                label: 'Invoice date',       w: 120, on: true, type: 'date' },
    { id: 'createdDate',                label: 'Doc. rec.',          w: 120, on: true, type: 'date' },
    { id: 'amount',                     label: 'Amount',             w: 136, on: true, type: 'num' },
    { id: 'numberOfComments',           label: 'Comments',           w: 60,  on: false, align: 'center' },
    { id: 'lastChangedByUserName',      label: 'Last changed by',    w: 160, on: false },
    { id: 'id',                         label: 'ID',                 w: 100, on: false },
    { id: 'displayId',                  label: 'Document number',    w: 110, on: false },
    { id: 'supplierName',               label: 'Supplier',           w: 160, on: false },
    { id: 'requesterName',              label: 'Requester',          w: 160, on: false },
    { id: 'companyId',                  label: 'Company ID',         w: 120, on: false },
    { id: 'foreignAmount',              label: 'Foreign amount',     w: 136, on: false, type: 'num' },
    { id: 'originalAssignee',           label: 'Original assignee',  w: 160, on: false },
    { id: 'displayApplicationTypeName', label: 'Source application', w: 170, on: false },
    { id: 'externalId',                 label: 'External ID',        w: 120, on: false },
    { id: 'idProcess',                  label: 'Process ID',         w: 120, on: false },
    { id: 'state',                      label: 'Assignment',         w: 120, on: true },
    { id: 'actions',                    label: 'Action',             w: 120, on: true, fixed: true }
  ];

  /* ------------------------------ icons -------------------------------- */

  var ICON = {
    check:      '<path d="M20 6 9 17l-5-5"/>',
    x:          '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    alert:      '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    /* Gaia's warning glyph — Lucide triangle-alert. */
    warning:    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    pencil:     '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    chevronD:   '<path d="m6 9 6 6 6-6"/>',
    arrowUp:    '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    arrowDown:  '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>'
  };

  function svg(name, size) {
    var s = size || 16;
    return '<svg class="tg-i" viewBox="0 0 24 24" width="' + s + '" height="' + s +
      '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      ICON[name] + '</svg>';
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ------------------------------ state -------------------------------- */

  var state = {
    tasks: TASKS.slice(),
    groupBy: 'urgency',
    sortCol: 'documentDueDate',
    sortDir: 'desc',
    search: '',
    currentCompanyOnly: false,
    selected: Object.create(null),
    collapsed: Object.create(null)
  };

  var el = {
    header:    document.getElementById('tg-header'),
    body:      document.getElementById('tg-body'),
    scroll:    document.getElementById('tg-scroll'),
    empty:     document.getElementById('tg-empty'),
    search:    document.getElementById('search'),
    groupby:   document.getElementById('groupby'),
    currentCo: document.getElementById('current-company'),
    colBtn:    document.getElementById('columns-btn'),
    colMenu:   document.getElementById('columns-menu'),
    fLabel:    document.getElementById('footer-label'),
    fAmount:   document.getElementById('footer-amount'),
    approveSel:document.getElementById('approve-selected'),
    openBtn:   document.getElementById('open-btn'),
    toast:     document.getElementById('toast')
  };

  function visibleColumns() {
    return COLUMNS.filter(function (c) { return c.on; });
  }

  /* --------------------------- derived data ---------------------------- */

  function urgencyOf(task) {
    return task.documentDueDate < TODAY ? 'Overdue' : 'Later';
  }

  function isOverdue(task) { return task.documentDueDate < TODAY; }

  function searchable(task) {
    return [
      task.documentType, task.from, task.description, task.companyName,
      task.supplierName, task.requesterName, task.displayId, task.externalId,
      task.displayApplicationTypeName, task.state.join(' ')
    ].join(' ').toLowerCase();
  }

  function filtered() {
    var q = state.search.trim().toLowerCase();
    return state.tasks.filter(function (t) {
      if (state.currentCompanyOnly && t.companyName !== CURRENT_COMPANY) return false;
      if (q && searchable(t).indexOf(q) === -1) return false;
      return true;
    });
  }

  function sortValue(task, colId) {
    var col = COLUMNS.filter(function (c) { return c.id === colId; })[0];
    var v = task[colId];
    if (!col) return '';
    if (col.type === 'date') return v ? v.getTime() : 0;
    if (colId === 'foreignAmount') return v ? v.amount : 0;
    if (col.type === 'num') return v || 0;
    if (colId === 'state') return task.state.join(', ');
    return String(v == null ? '' : v).toLowerCase();
  }

  function sortRows(rows) {
    if (!state.sortCol) return rows;
    var dir = state.sortDir === 'asc' ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      var va = sortValue(a, state.sortCol), vb = sortValue(b, state.sortCol);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return a.id - b.id;
    });
  }

  function groupKey(task) {
    if (state.groupBy === 'urgency') return urgencyOf(task);
    return task[state.groupBy] || '—';
  }

  function buildGroups(rows) {
    var map = Object.create(null);
    var order = [];
    rows.forEach(function (t) {
      var k = groupKey(t);
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(t);
    });

    if (state.groupBy === 'urgency') {
      var rank = { Overdue: 0, Later: 1 };
      var rankOf = function (k) { return k in rank ? rank[k] : 9; };
      order.sort(function (a, b) { return rankOf(a) - rankOf(b); });
    } else {
      order.sort(function (a, b) { return a.localeCompare(b, 'nb'); });
    }

    return order.map(function (k) {
      var items = map[k];
      var total = items.reduce(function (s, t) { return s + t.amount; }, 0);
      return { key: k, items: items, total: total };
    });
  }

  /* ------------------------------ render ------------------------------- */

  function colTemplate() {
    return visibleColumns().map(function (c) { return c.w + 'px'; }).join(' ');
  }

  function renderHeader() {
    var cols = visibleColumns();
    var html = cols.map(function (c) {
      if (c.id === 'select') {
        return '<div class="tg-hc tg-hc--plain" data-select-all>' +
          '<label class="ga-checkbox"><input class="ga-checkbox__native" type="checkbox" data-select-all-box>' +
          '<span class="ga-checkbox__marker"><span class="ga-checkbox__marker__indicator-checked"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span class="ga-checkbox__marker__indicator-indeterminate"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg></span></span></label></div>';
      }
      if (c.id === 'actions') {
        return '<div class="tg-hc tg-hc--plain"><span class="tg-hc__label">' + esc(c.label) + '</span></div>';
      }
      var sorted = state.sortCol === c.id;
      var cls = 'tg-hc' + (c.type === 'num' ? ' tg-hc--num' : '') + (sorted ? ' tg-hc--sorted' : '');
      return '<div class="' + cls + '" data-col="' + c.id + '" role="columnheader">' +
        '<span class="tg-hc__label">' + esc(c.label) + '</span>' +
        '<span class="tg-hc__sort">' + svg(state.sortDir === 'asc' ? 'arrowUp' : 'arrowDown', 14) + '</span>' +
        '</div>';
    }).join('');

    el.header.style.setProperty('--tg-cols', colTemplate());
    el.header.innerHTML = html;
  }

  function cellHtml(task, col) {
    switch (col.id) {
      case 'select':
        return '<div class="tg-cell tg-cell--select" data-row="' + task.id + '">' +
          '<label class="ga-checkbox"><input class="ga-checkbox__native" type="checkbox"' +
          (state.selected[task.id] ? ' checked' : '') + '>' +
          '<span class="ga-checkbox__marker"><span class="ga-checkbox__marker__indicator-checked"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span class="ga-checkbox__marker__indicator-indeterminate"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg></span></span></label></div>';

      case 'actions':
        return '<div class="tg-cell tg-cell--actions">' +
          '<button class="tg-action" data-approve="' + task.id + '" aria-label="Approve">' + svg('check', 24) + '</button>' +
          '<button class="tg-action" data-reject="' + task.id + '" aria-label="Reject">' + svg('x', 24) + '</button>' +
          '</div>';

      case 'documentDueDate': {
        /* Marker leads the date, so the flag is the first thing scanned down
           the column rather than trailing behind dates of varying width. */
        var marker = isOverdue(task)
          ? '<span class="tg-overdue-icon" title="Overdue">' + svg('warning', 16) + '</span>' : '';
        return '<div class="tg-cell">' + marker + '<span class="tg-cell__text">' + fmtDate(task.documentDueDate) + '</span></div>';
      }

      case 'amount': {
        var foreign = task.foreignAmount
          ? '<span class="tg-amount__foreign">' + fmtAmount(task.foreignAmount.amount, task.foreignAmount.currency) + '</span>' : '';
        return '<div class="tg-cell tg-cell--num"><span class="tg-amount">' +
          '<span class="tg-amount__main">' + fmtAmount(task.amount, task.currency) + '</span>' + foreign +
          '</span></div>';
      }

      case 'foreignAmount':
        return '<div class="tg-cell tg-cell--num"><span class="tg-cell__text">' +
          (task.foreignAmount ? fmtAmount(task.foreignAmount.amount, task.foreignAmount.currency) : '') +
          '</span></div>';

      case 'numberOfComments':
        return '<div class="tg-cell tg-cell--center">' +
          (task.numberOfComments ? svg('pencil', 16) + '<span class="tg-cell__text">' + task.numberOfComments + '</span>' : '') +
          '</div>';

      case 'state':
        return '<div class="tg-cell"><span class="tg-state" title="' + esc(task.state.join(', ')) + '">' +
          esc(task.state.join(', ')) + '</span></div>';

      default: {
        var v = task[col.id];
        if (col.type === 'date') v = fmtDate(v);
        var numCls = col.type === 'num' ? ' tg-cell--num' : (col.align === 'center' ? ' tg-cell--center' : '');
        return '<div class="tg-cell' + numCls + '"><span class="tg-cell__text" title="' + esc(v) + '">' + esc(v) + '</span></div>';
      }
    }
  }

  /* renderBody() rebuilds every row, so the preview marker has to be reapplied
     after sorting, searching, grouping or approving. */
  function renderBody() {
    var cols = visibleColumns();
    var tpl = colTemplate();
    var groups = buildGroups(sortRows(filtered()));
    var out = [];

    groups.forEach(function (g) {
      var collapsed = !!state.collapsed[g.key];
      out.push(
        '<div class="tg-row tg-row--group' + (collapsed ? ' tg-row--collapsed' : '') + '" role="row">' +
          '<button class="tg-group" data-group-key="' + esc(g.key) + '" aria-expanded="' + (!collapsed) + '">' +
            '<span class="tg-group__chevron">' + svg('chevronD', 16) + '</span>' +
            '<span class="tg-group__label">' + esc(g.key) + '</span>' +
            '<span class="ga-badge ga-badge--text ga-badge--muted tg-group__count">' + g.items.length + '</span>' +
            '<span class="tg-group__total">' + fmtAmount(g.total, 'NOK') + '</span>' +
          '</button>' +
        '</div>'
      );

      if (collapsed) return;

      g.items.forEach(function (t) {
        var sel = state.selected[t.id] ? ' tg-row--selected' : '';
        out.push('<div class="tg-row' + sel + '" role="row" data-id="' + t.id + '" style="--tg-cols:' + tpl + '">' +
          cols.map(function (c) { return cellHtml(t, c); }).join('') +
          '</div>');
      });
    });

    el.body.innerHTML = out.join('');
    el.body.style.setProperty('--tg-cols', tpl);
    el.empty.hidden = groups.length > 0;
    syncViewportWidth();

    /* Reapply the active-row marker: this rebuilds every row, and the pane goes
       on showing that task. Done HERE rather than in render() because
       select-all and group-collapse call renderBody() directly — a hook in
       render() misses both. */
    if (previewing != null) { markRow(previewing); }
  }

  function renderFooter() {
    var rows = filtered();
    var selectedRows = rows.filter(function (t) { return state.selected[t.id]; });

    if (selectedRows.length) {
      var sum = selectedRows.reduce(function (s, t) { return s + t.amount; }, 0);
      el.fLabel.textContent = 'Selected ' + selectedRows.length;
      el.fAmount.textContent = fmtAmount(sum, 'NOK');
    } else {
      var pending = rows.reduce(function (s, t) { return s + t.amount; }, 0);
      el.fLabel.textContent = 'Pending';
      el.fAmount.textContent = fmtAmount(pending, 'NOK');
    }

    el.approveSel.disabled = selectedRows.length === 0;
    el.openBtn.disabled = selectedRows.length === 0;

    var all = el.header.querySelector('[data-select-all-box]');
    if (all) {
      all.checked = rows.length > 0 && selectedRows.length === rows.length;
      all.indeterminate = selectedRows.length > 0 && selectedRows.length < rows.length;
    }
  }

  function renderColumnsMenu() {
    el.colMenu.innerHTML = COLUMNS.filter(function (c) { return !c.fixed; }).map(function (c) {
      return '<button class="ga-menu__item" data-toggle-col="' + c.id + '" role="menuitemcheckbox" aria-checked="' + !!c.on + '">' +
        '<label class="ga-checkbox"><input class="ga-checkbox__native" type="checkbox"' + (c.on ? ' checked' : '') + ' tabindex="-1">' +
        '<span class="ga-checkbox__marker"><span class="ga-checkbox__marker__indicator-checked"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span class="ga-checkbox__marker__indicator-indeterminate"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg></span></span></label>' +
        '<span class="ga-menu__item-label">' + esc(c.label) + '</span></button>';
    }).join('');
  }

  function render() {
    renderHeader();
    renderBody();
    renderFooter();
  }

  /* group rows are viewport-wide so their total stays at the right edge */
  function syncViewportWidth() {
    el.body.style.setProperty('--tg-viewport-w', el.scroll.clientWidth + 'px');
  }

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 2600);
  }

  /* ------------------------------ actions ------------------------------ */

  function removeTasks(ids, verb) {
    var set = Object.create(null);
    ids.forEach(function (id) { set[id] = true; });

    ids.forEach(function (id) {
      var row = el.body.querySelector('[data-id="' + id + '"]');
      if (row) row.classList.add('tg-row--leaving');
    });

    setTimeout(function () {
      state.tasks = state.tasks.filter(function (t) { return !set[t.id]; });
      ids.forEach(function (id) { delete state.selected[id]; });
      render();
    }, 120);

    toast(ids.length + (ids.length === 1 ? ' task ' : ' tasks ') + verb);
  }

  /* ------------------------------- events ------------------------------ */

  el.search.addEventListener('input', function () {
    state.search = el.search.value;
    render();
  });

  el.currentCo.addEventListener('change', function () {
    state.currentCompanyOnly = el.currentCo.checked;
    render();
  });

  el.groupby.addEventListener('click', function (e) {
    var btn = e.target.closest('.ga-segmented-control__button');
    if (!btn) return;
    Array.prototype.forEach.call(el.groupby.children, function (b) {
      b.classList.toggle('ga-segmented-control__button--selected', b === btn);
    });
    state.groupBy = btn.getAttribute('data-group');
    state.collapsed = Object.create(null);
    render();
  });

  el.header.addEventListener('click', function (e) {
    var hc = e.target.closest('.tg-hc[data-col]');
    if (hc) {
      var id = hc.getAttribute('data-col');
      if (state.sortCol === id) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortCol = id;
        state.sortDir = 'asc';
      }
      render();
      return;
    }

    var all = e.target.closest('[data-select-all]');
    if (all) {
      var rows = filtered();
      var turnOn = rows.some(function (t) { return !state.selected[t.id]; });
      rows.forEach(function (t) {
        if (turnOn) state.selected[t.id] = true; else delete state.selected[t.id];
      });
      renderBody();
      renderFooter();
    }
  });

  el.body.addEventListener('click', function (e) {
    var grp = e.target.closest('[data-group-key]');
    if (grp) {
      var key = grp.getAttribute('data-group-key');
      if (state.collapsed[key]) delete state.collapsed[key]; else state.collapsed[key] = true;
      renderBody();
      return;
    }

    var approve = e.target.closest('[data-approve]');
    if (approve) { removeTasks([Number(approve.getAttribute('data-approve'))], 'approved'); return; }

    var reject = e.target.closest('[data-reject]');
    if (reject) { removeTasks([Number(reject.getAttribute('data-reject'))], 'rejected'); return; }

    var box = e.target.closest('[data-row]');
    if (box) {
      var rid = box.getAttribute('data-row');
      if (state.selected[rid]) delete state.selected[rid]; else state.selected[rid] = true;
      var native = box.querySelector('.ga-checkbox__native');
      if (native) native.checked = !!state.selected[rid];
      var row = el.body.querySelector('.tg-row[data-id="' + rid + '"]');
      if (row) row.classList.toggle('tg-row--selected', !!state.selected[rid]);
      renderFooter();
      return;
    }

    var dataRow = e.target.closest('.tg-row[data-id]');
    if (dataRow) {
      var rid2 = Number(dataRow.getAttribute('data-id'));
      previewOn() ? showInPanel(rid2) : openTask(rid2);
    }
  });

  /* Double-click opens the task even while previewing, so the pane is not a
     dead end for the mouse. Outside preview mode a single click already
     navigates, so there is nothing to add there.

     The two click events of a double-click land first and preview the row —
     harmless, because showInPanel() no-ops when that row is already active.
     Clicks inside the checkbox or the action buttons are skipped: double-
     ticking a checkbox, or double-tapping Approve, must not navigate. */
  el.body.addEventListener('dblclick', function (e) {
    if (!previewOn()) { return; }
    if (e.target.closest('.tg-cell--select, .tg-cell--actions, [data-group-key]')) { return; }
    var row = e.target.closest('.tg-row[data-id]');
    if (row) { openTask(Number(row.getAttribute('data-id'))); }
  });

  /* ------------------------- open a task detail -------------------------
     The detail view rebuilds the same 202 tasks from the same seed, so the id
     is all it needs to resolve the task. What it cannot recompute is the order
     on screen — grouping, sort, search and the company filter all reshape it,
     and a collapsed group hides its rows entirely. So hand over the flat list
     of ids actually visible, in render order, and let next/previous walk that.
     sessionStorage rather than the URL: 202 ids do not belong in a query. */

  function visibleOrder() {
    var ids = [];
    buildGroups(sortRows(filtered())).forEach(function (g) {
      if (state.collapsed[g.key]) { return; }   /* not on screen, not reachable */
      g.items.forEach(function (t) { ids.push(t.id); });
    });
    return ids;
  }

  function openTask(id) {
    try {
      sessionStorage.setItem('appr:visible-order', JSON.stringify(visibleOrder()));
    } catch (e) {
      /* Private window or storage disabled — the detail view falls back to the
         full task order rather than failing to open. */
    }
    location.href = 'task-detail.html?task=' + id;
  }

  /* --------------------------- reading pane -----------------------------
     A row click either navigates to the full view or fills the panel beside
     the list, depending on whether Preview is on. The panel is the same
     [data-module-stack] the Task detail view uses, so the modules mount
     unchanged; pointing window.ApprTask at another task re-renders them. */

  var panel = document.getElementById('stack-right');
  var previewToggle = document.getElementById('preview-toggle');
  var panelHeader = document.getElementById('panel-header');
  var hint = document.createElement('p');
  hint.className = 'mt-panel__hint';
  hint.textContent = 'Select a task to preview it here.';
  if (panel) { panel.appendChild(hint); }

  var previewing = null;   /* task id currently in the pane */

  function previewOn() { return document.body.classList.contains('mt-preview'); }

  function markRow(id) {
    var prev = el.body.querySelector('.tg-row--active');
    if (prev) { prev.classList.remove('tg-row--active'); }
    if (id == null) { return; }
    var row = el.body.querySelector('.tg-row[data-id="' + id + '"]');
    if (row) { row.classList.add('tg-row--active'); }
  }

  /* The header is rebuilt rather than patched: it is one row of controls whose
     every value depends on the task, and rebuilding is cheaper than tracking
     which parts changed. prev/next are routed back through showInPanel so they
     move the preview instead of leaving the list. */
  function renderPanelHeader() {
    if (!panelHeader || !window.ApprTaskHeader) { return; }
    panelHeader.textContent = '';
    window.ApprTaskHeader.render(panelHeader, {
      asPageRow: false,
      showBack: false,       /* would point at the page you are already on */
      showActions: false,    /* the pane reads; you act from the full view */
      /* Read the id from the context, not the outer `previewing` — the context
         is the single source of which task is shown, and prev/next change it. */
      openHref: 'task-detail.html?task=' + window.ApprTask.task.id,
      onNavigate: function (id) { if (id != null) { showInPanel(id); } }
    });
  }

  function showInPanel(id) {
    if (!window.ApprTask || !window.ApprTask.setTask) { return; }
    /* Already showing it — skip the re-render. Also what makes the two clicks
       preceding a double-click cheap. */
    if (previewing === id) { return; }
    if (!window.ApprTask.setTask(id, visibleOrder())) { return; }
    previewing = id;
    panel.classList.remove('mt-panel--empty');
    renderPanelHeader();
    markRow(id);
  }

  function setPreview(on) {
    document.body.classList.toggle('mt-preview', on);
    /* Keep the control in step when the pane is closed from elsewhere — the
       switch is a real checkbox, so its state is `checked`, not aria-pressed. */
    if (previewToggle.checked !== on) { previewToggle.checked = on; }
    if (!on) {
      markRow(null);
      previewing = null;
      panel.classList.add('mt-panel--empty');
    } else if (previewing == null) {
      /* Opening the pane with nothing in it is a dead end, so start on the
         first task actually on screen — the same order next/previous walks. */
      var first = visibleOrder()[0];
      if (first != null) { showInPanel(first); }
      else { panel.classList.add('mt-panel--empty'); }   /* nothing matches the filter */
    }
    /* The grid measures its own columns; give it a frame to see the new width. */
    requestAnimationFrame(render);
  }

  /* `change`, not `click`: the label wraps the input, so a click on the text
     also toggles it, and change fires once for either. */
  previewToggle.addEventListener('change', function () { setPreview(previewToggle.checked); });

  /* The pane starts closed and empty — the list is the working surface. */
  panel.classList.add('mt-panel--empty');

  el.approveSel.addEventListener('click', function () {
    var ids = filtered().filter(function (t) { return state.selected[t.id]; }).map(function (t) { return t.id; });
    if (ids.length) removeTasks(ids, 'approved');
  });

  el.openBtn.addEventListener('click', function () {
    toast('Open / Forward / Request review / Postpone / Email are stubbed');
  });

  document.getElementById('menu-btn').addEventListener('click', function () {
    toast('Side navigation is not part of this prototype');
  });

  el.colBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = el.colMenu.hidden;
    el.colMenu.hidden = !open;
    el.colBtn.setAttribute('aria-expanded', String(open));
  });

  el.colMenu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-toggle-col]');
    if (!item) return;
    e.preventDefault();
    var id = item.getAttribute('data-toggle-col');
    COLUMNS.forEach(function (c) { if (c.id === id) c.on = !c.on; });
    renderColumnsMenu();
    render();
  });

  document.addEventListener('click', function (e) {
    if (el.colMenu.hidden) return;
    if (e.target.closest('#columns-menu') || e.target.closest('#columns-btn')) return;
    el.colMenu.hidden = true;
    el.colBtn.setAttribute('aria-expanded', 'false');
  });

  window.addEventListener('resize', syncViewportWidth);
  el.scroll.addEventListener('scroll', syncViewportWidth);

  /* ------------------------------- boot -------------------------------- */

  renderColumnsMenu();
  render();
})();

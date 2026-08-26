/* =========================================================================
   Task header — the row carrying the task's identity and its actions.

   Rendered in two places (2026-08-25):
     Task detail — as the second row of Gaia's .ga-page-header, using the
                   package's own .ga-page-header__page-navigation classes.
     My tasks    — inside the reading pane, above the module stack.

   Hence a renderer rather than a one-shot builder: window.ApprTaskHeader
   .render(container, opts). The two hosts differ in more than position —
   prev/next NAVIGATE from Task detail but must move the PREVIEW in the pane,
   or you would be thrown off the list. opts.onNavigate switches that.

   opts
     onNavigate(id)  called by prev/next instead of changing location
     showBack        back arrow (default true; false in the pane, where it
                     would point at the page you are already on)
     openHref        when set, the title block becomes a real link to it and
                     the whole row becomes clickable (used by the pane, whose
                     header is the route to the full page). A genuine <a> so
                     keyboard, middle-click and right-click all behave; the
                     row-level handler only widens the hit area for the mouse.
     showActions     Approve / Reject... / Other... (default true; false in the
                     pane, which is read-only)
     asPageRow       wrap in .ga-page-header__page-navigation (default true)

   Back arrow + document title + subtitle on the left; Approve / Reject... /
   Other... and the task counter with prev/next on the right.

   NOT a module: this is page chrome, so it lives in Gaia's own
   .ga-page-header__page-navigation row rather than in a stack. Gaia ships the
   ROW (padding, space-between, __page-nav-start / __page-nav-end); it has no
   component for the contents, so the title block and counter are local.

   FIDELITY: structure and control set come from the 2026-08-24 staging
   capture. The far-right slot was cut off past "Task 201 /" in that capture,
   so the counter's prev/next arrows are inferred — the docs give X/N for next
   task and Z/P for previous, so traversal is first-class, but the visible
   form was not observed. Typography here is Gaia tokens, not measured.

   Actions are stubs: Approve / Reject and the four Other... items all raise an
   appr:task-action event and nothing else. Every one of those flows needs a
   mandatory comment and none of the dialogues are specified.
   ========================================================================= */

(function () {
  'use strict';

  var I = window.ApprIcon;
  var place = window.ApprPlaceMenu;

  var ARROW_LEFT   = { paths: ['m12 19-7-7 7-7', 'M19 12H5'] };
  var CHEVRON_DOWN = { paths: ['m6 9 6 6 6-6'] };
  var CHEVRON_LEFT = { paths: ['m15 18-6-6 6-6'] };
  var CHEVRON_RIGHT = { paths: ['m9 18 6-6-6-6'] };

  /* Read per render, not once at load — the pane repoints the context as rows
     are clicked, and the header re-renders on appr:task-changed. */
  function ctx() { return window.ApprTask || {}; }

  /* Documented as living behind the split button (gaia-ds -> Approval). */
  var OTHER_ACTIONS = [
    { id: 'forward',        label: 'Forward' },
    { id: 'request-review', label: 'Request review' },
    { id: 'postpone',       label: 'Postpone' },
    { id: 'email',          label: 'Email' }
  ];

  function emit(action, extra) {
    var d = { action: action };
    if (extra) { Object.keys(extra).forEach(function (k) { d[k] = extra[k]; }); }
    document.dispatchEvent(new CustomEvent('appr:task-action', { bubbles: true, detail: d }));
  }

  function ghostIcon(label, icon, href) {
    var el = document.createElement(href ? 'a' : 'button');
    el.className = 'ga-button ga-button--ghost ga-button--icon-only';
    if (href) { el.href = href; } else { el.type = 'button'; }
    el.setAttribute('aria-label', label);
    el.title = label;
    el.appendChild(I(icon, '24'));
    return el;
  }

  function render(container, opts) {
    if (!container) { return null; }
    opts = opts || {};
    var CTX = ctx();
    var T = CTX.task || {};
    var asPageRow = opts.asPageRow !== false;
    var showBack = opts.showBack !== false;

    var row = document.createElement('div');
    row.className = (asPageRow ? 'ga-page-header__page-navigation ' : 'th-inline ') + 'th-row';

    /* ------------------------------- start ------------------------------- */
    var start = document.createElement('div');
    start.className = 'ga-page-header__page-nav-start th-start';

    if (showBack) {
      start.appendChild(ghostIcon('Back to My tasks', ARROW_LEFT, 'index.html'));
    }

    var titles = document.createElement(opts.openHref ? 'a' : 'div');
    titles.className = 'th-titles';
    if (opts.openHref) {
      titles.href = opts.openHref;
      titles.className += ' th-titles--link';
    }

    var h1 = document.createElement('h1');
    h1.className = 'th-title';
    var strong = document.createElement('strong');
    strong.textContent = T.documentType || 'Task';
    h1.appendChild(strong);
    /* "{type} - {from} → {company}", the product's pattern. `from` is the
       supplier for document-led types and the requester for person-led ones,
       which is already resolved in data.js. */
    var rest = [T.from, T.companyName].filter(Boolean).join(' → ');
    if (rest) { h1.appendChild(document.createTextNode(' - ' + rest)); }

    var sub = document.createElement('p');
    sub.className = 'th-subtitle';
    sub.textContent = T.displayApplicationTypeName
      ? 'Received from ' + T.displayApplicationTypeName
      : '';

    titles.appendChild(h1);
    titles.appendChild(sub);
    start.appendChild(titles);

    /* -------------------------------- end -------------------------------- */
    var end = document.createElement('div');
    end.className = 'ga-page-header__page-nav-end th-end';

    /* Approve / Reject... / Other... are omitted in the My tasks pane (user's
       call 2026-08-25): acting on a task there means acting on a preview, and
       Reject plus all four Other actions require a mandatory comment. The pane
       is for reading; Open full view is where you go to act. */
    var showActions = opts.showActions !== false;

    var approve = document.createElement('button');
    approve.className = 'ga-button ga-button--primary';
    approve.type = 'button';
    approve.textContent = 'Approve';
    approve.addEventListener('click', function () { emit('approve'); });

    var reject = document.createElement('button');
    reject.className = 'ga-button ga-button--secondary';
    reject.type = 'button';
    reject.textContent = 'Reject...';
    reject.addEventListener('click', function () { emit('reject'); });

    /* ----------------------------- Other... ------------------------------ */
    var otherWrap = document.createElement('div');
    otherWrap.className = 'th-other';

    var otherBtn = document.createElement('button');
    otherBtn.className = 'ga-button ga-button--secondary th-other__btn';
    otherBtn.type = 'button';
    otherBtn.setAttribute('aria-haspopup', 'menu');
    otherBtn.setAttribute('aria-expanded', 'false');
    otherBtn.appendChild(document.createTextNode('Other...'));
    otherBtn.appendChild(I(CHEVRON_DOWN, '24'));

    var menu = document.createElement('div');
    menu.className = 'ga-menu th-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    OTHER_ACTIONS.forEach(function (a) {
      var item = document.createElement('button');
      item.className = 'ga-menu__item';
      item.type = 'button';
      item.setAttribute('role', 'menuitem');
      var span = document.createElement('span');
      span.className = 'ga-menu__item-label';
      span.textContent = a.label;
      item.appendChild(span);
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        close();
        emit(a.id);
      });
      menu.appendChild(item);
    });

    var away, esc, reflow;

    function open() {
      menu.hidden = false;
      place(otherBtn, menu);
      otherBtn.setAttribute('aria-expanded', 'true');
      away = function (ev) { if (!otherWrap.contains(ev.target)) { close(); } };
      esc = function (ev) { if (ev.key === 'Escape') { close(); otherBtn.focus(); } };
      reflow = function () { place(otherBtn, menu); };
      document.addEventListener('pointerdown', away);
      document.addEventListener('keydown', esc);
      document.addEventListener('scroll', reflow, true);
      window.addEventListener('resize', reflow);
    }

    function close() {
      if (menu.hidden) { return; }
      menu.hidden = true;
      otherBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
      document.removeEventListener('scroll', reflow, true);
      window.removeEventListener('resize', reflow);
    }

    otherBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden ? open() : close();
    });

    otherWrap.appendChild(otherBtn);
    otherWrap.appendChild(menu);

    /* ---------------------------- task counter --------------------------- */
    var nav = document.createElement('div');
    nav.className = 'th-counter';

    var count = document.createElement('span');
    count.className = 'th-counter__label';
    count.textContent = CTX.index ? 'Task ' + CTX.index + ' / ' + CTX.total : '';
    /* Say so when the position is within the filtered list rather than all 202,
       otherwise "Task 3 / 7" looks like a bug. */
    if (CTX.scoped && CTX.index) { count.title = 'Position in the list you came from'; }

    /* Disabled at the ends rather than hidden — the control should not move. */
    var prev = ghostIcon('Previous task', CHEVRON_LEFT);
    prev.disabled = CTX.prevId == null;
    prev.addEventListener('click', function () {
      emit('prev-task', { id: CTX.prevId });
      opts.onNavigate ? opts.onNavigate(CTX.prevId) : CTX.go(CTX.prevId);
    });

    var next = ghostIcon('Next task', CHEVRON_RIGHT);
    next.disabled = CTX.nextId == null;
    next.addEventListener('click', function () {
      emit('next-task', { id: CTX.nextId });
      opts.onNavigate ? opts.onNavigate(CTX.nextId) : CTX.go(CTX.nextId);
    });

    nav.appendChild(count);
    nav.appendChild(prev);
    nav.appendChild(next);

    if (showActions) {
      end.appendChild(approve);
      end.appendChild(reject);
      end.appendChild(otherWrap);
    }

    end.appendChild(nav);

    row.appendChild(start);
    row.appendChild(end);

    /* Clicking anywhere in the row opens the task — except on a control, so the
       prev/next arrows still move the preview rather than navigating away.
       The <a> above is what actually carries the semantics; this is only a
       larger mouse target. */
    if (opts.openHref) {
      row.classList.add('th-row--clickable');
      row.addEventListener('click', function (e) {
        if (e.target.closest('button, a')) { return; }
        titles.click();
      });
    }

    container.appendChild(row);
    return row;
  }

  window.ApprTaskHeader = { render: render };

  /* Task detail mounts itself: the header is that page's chrome. My tasks
     calls render() explicitly, into the pane. */
  function mountPageRow() {
    var header = document.querySelector('.ga-page-header');
    if (!header || header.querySelector('.ga-page-header__page-navigation')) { return; }
    if (!document.querySelector('.mt-panel')) {   /* not the My tasks page */
      render(header, {});
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mountPageRow)
    : mountPageRow();
})();

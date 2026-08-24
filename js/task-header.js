/* =========================================================================
   Task header — the page-header's second row.

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

  /* Synthetic, matching the bundled claim and the 202-task My tasks data. */
  var TASK = {
    type: 'Expense claim',
    requester: 'Ingrid Halvorsen',
    company: 'Nordvik Bygg AS',
    source: 'Visma.net Expense',
    index: 201,
    total: 202
  };

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

  function build() {
    var header = document.querySelector('.ga-page-header');
    if (!header || header.querySelector('.ga-page-header__page-navigation')) { return; }

    var row = document.createElement('div');
    row.className = 'ga-page-header__page-navigation th-row';

    /* ------------------------------- start ------------------------------- */
    var start = document.createElement('div');
    start.className = 'ga-page-header__page-nav-start';

    start.appendChild(ghostIcon('Back to My tasks', ARROW_LEFT, 'index.html'));

    var titles = document.createElement('div');
    titles.className = 'th-titles';

    var h1 = document.createElement('h1');
    h1.className = 'th-title';
    var strong = document.createElement('strong');
    strong.textContent = TASK.type;
    h1.appendChild(strong);
    h1.appendChild(document.createTextNode(' - ' + TASK.requester + ' → ' + TASK.company));

    var sub = document.createElement('p');
    sub.className = 'th-subtitle';
    sub.textContent = 'Received from ' + TASK.source;

    titles.appendChild(h1);
    titles.appendChild(sub);
    start.appendChild(titles);

    /* -------------------------------- end -------------------------------- */
    var end = document.createElement('div');
    end.className = 'ga-page-header__page-nav-end';

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
    count.textContent = 'Task ' + TASK.index + ' / ' + TASK.total;

    var prev = ghostIcon('Previous task', CHEVRON_LEFT);
    prev.addEventListener('click', function () { emit('prev-task'); });
    var next = ghostIcon('Next task', CHEVRON_RIGHT);
    next.addEventListener('click', function () { emit('next-task'); });

    nav.appendChild(count);
    nav.appendChild(prev);
    nav.appendChild(next);

    end.appendChild(approve);
    end.appendChild(reject);
    end.appendChild(otherWrap);
    end.appendChild(nav);

    row.appendChild(start);
    row.appendChild(end);
    header.appendChild(row);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', build)
    : build();
})();

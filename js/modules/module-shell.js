/* =========================================================================
   Module shell — the base class every Approval module extends.

   Defines ONE header for all modules, so the chrome exists once rather than
   six times:

     [ chevron  Title ] .......................................... [ kebab ]

   - The heading is a single Gaia ghost button; the chevron is its leading
     icon and pressing it collapses the module to its header.
     Chevron UP while expanded, DOWN while collapsed (user's call 2026-08-24).
   - The kebab opens the module's context menu: move actions, a divider, then
     any module-specific actions. Actions that do not apply are HIDDEN, not
     disabled, and the divider hides with them.

   In the live product only Attachment viewer and External editor carry header
   actions — Workflow details and Expense claim details have a bare title.
   Giving every module the same shell is a deliberate divergence: it is what
   makes them all collapsible and movable.

   LIGHT DOM ON PURPOSE — no shadow root, so Gaia's real classes reach the
   markup (.ga-button--ghost, .ga-menu). Tokens would cross a shadow boundary;
   classes would not.

   HOST CONTRACT — how a module knows where it is
     A module lives inside an element marked [data-module-stack]. Sibling
     stacks under a common parent are the left-to-right order. That is the
     whole contract: no module references #stack-left, .td-split or any page
     id, so the same element works in My tasks by marking a container there
     the same way.

   SUBCLASS API
     get defaultLabel()      header title when no label attribute is set
     renderBody(container)   fill the module body; called on (re)render
     secondaryActions()      [{ id, label }] shown below the menu divider
     onAction(id)            handle one of those actions
     observed()              extra attribute names to re-render on

   Events (bubble + composed)
     appr:collapse  { module, collapsed }
     appr:moved     { module, direction }
     appr:action    { module, action }        one of secondaryActions()
   ========================================================================= */

(function () {
  'use strict';

  var STACK = '[data-module-stack]';
  var NS = 'http://www.w3.org/2000/svg';

  /* Canonical Lucide: stroked shapes, viewBox 0 0 24 24, stroke-width 2.
     Circles are STROKED (r=1 + width 2 reads as a solid dot) — filling them
     renders thin and undersized. */
  var ICONS = {
    'chevron-up':        { paths: ['m18 15-6-6-6 6'] },
    'chevron-down':      { paths: ['m6 9 6 6 6-6'] },
    'ellipsis-vertical': { circles: [[12, 5], [12, 12], [12, 19]] }
  };

  /* Accepts a name from ICONS, or a spec object so modules can pass their own
     canonical Lucide data without mutating a shared registry:
       { paths: ['M...'], circles: [[cx,cy,r?]], rects: [[x,y,w,h,rx?]],
         polylines: ['12 6 12 12 16 14'] } */
  function svgIcon(name, size) {
    var spec = typeof name === 'string' ? ICONS[name] : name;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size || '24');
    svg.setAttribute('height', size || '24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    (spec.paths || []).forEach(function (d) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    (spec.circles || []).forEach(function (c) {
      var el = document.createElementNS(NS, 'circle');
      el.setAttribute('cx', c[0]);
      el.setAttribute('cy', c[1]);
      el.setAttribute('r', c.length > 2 ? c[2] : '1');
      svg.appendChild(el);
    });
    (spec.rects || []).forEach(function (r) {
      var el = document.createElementNS(NS, 'rect');
      el.setAttribute('x', r[0]); el.setAttribute('y', r[1]);
      el.setAttribute('width', r[2]); el.setAttribute('height', r[3]);
      if (r.length > 4) { el.setAttribute('rx', r[4]); el.setAttribute('ry', r[4]); }
      svg.appendChild(el);
    });
    (spec.polylines || []).forEach(function (pts) {
      var el = document.createElementNS(NS, 'polyline');
      el.setAttribute('points', pts);
      svg.appendChild(el);
    });
    return svg;
  }

  /* Fixed order in the dropdown (user's call 2026-08-24): up, down, left,
     right. Rendering order comes from this array; the show/hide logic is keyed
     by id, so this is the single place that decides it. */
  /* Place a position:fixed menu against its trigger. Used by the module kebabs
     and by the task header's "Other..." button.

     Fixed, not absolute, because a menu here has ancestors that clip:
     .appr-module carries overflow:hidden (to clip its own corners) and the
     stack carries overflow-y:auto. Absolute positioning survived neither a
     module collapsed to 56px nor a module sitting at the stack's bottom edge.

     Anchored to the trigger's right edge, flipped above when there is no room
     below, clamped into the viewport, and capped with max-height if neither
     side has room. */
  function placeMenu(trigger, menu) {
    var btn = trigger.getBoundingClientRect();
    var GAP = 4, EDGE = 8;

    /* Measure while displayed but not yet painted, to avoid a flash. */
    var vis = menu.style.visibility;
    menu.style.visibility = 'hidden';
    menu.style.maxHeight = '';
    var mw = menu.offsetWidth, mh = menu.offsetHeight;

    var below = window.innerHeight - btn.bottom - GAP - EDGE;
    var above = btn.top - GAP - EDGE;
    var top;
    if (mh <= below || below >= above) {
      top = btn.bottom + GAP;
      if (mh > below) { menu.style.maxHeight = below + 'px'; }
    } else {
      top = Math.max(EDGE, btn.top - GAP - mh);
      if (mh > above) { menu.style.maxHeight = above + 'px'; top = EDGE; }
    }

    var left = btn.right - mw;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - mw - EDGE));

    menu.style.top = Math.round(top) + 'px';
    menu.style.left = Math.round(left) + 'px';
    menu.style.visibility = vis;
  }

  var MOVES = [
    ['up',    'Move up'],
    ['down',  'Move down'],
    ['left',  'Move left'],
    ['right', 'Move right']
  ];

  class ApprModule extends HTMLElement {

    /* Subclasses add their own names via observed(). */
    static get observedAttributes() { return ['label', 'collapsed']; }

    get defaultLabel() { return 'Module'; }
    get label()        { return this.getAttribute('label') || this.defaultLabel; }
    get collapsed()    { return this.hasAttribute('collapsed'); }

    renderBody() {}                    /* override */
    secondaryActions() { return []; }  /* override */
    onAction() {}                      /* override */

    connectedCallback() {
      if (!this._built) {
        this._built = true;
        this.classList.add('appr-module');
        this._render();
      }
      this._syncMenuState();

      /* Modules read the open task at render time, so when the host points the
         context at a different task (My tasks' reading pane) they have to
         rebuild. Collapsed state survives because it lives in an attribute
         that _render() reads. */
      if (!this._onTaskChanged) {
        this._onTaskChanged = function () {
          if (this._built) { this._render(); this._syncMenuState(); }
        }.bind(this);
      }
      document.addEventListener('appr:task-changed', this._onTaskChanged);
    }

    disconnectedCallback() {
      this._closeMenu();
      if (this._onTaskChanged) {
        document.removeEventListener('appr:task-changed', this._onTaskChanged);
      }
    }

    attributeChangedCallback(name) {
      if (!this._built) { return; }
      if (name === 'collapsed') { this._syncCollapsed(); }
      else { this._render(); }
    }

    emit(type, detail) {
      var d = { module: this };
      if (detail) { Object.keys(detail).forEach(function (k) { d[k] = detail[k]; }); }
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail: d }));
    }

    /* ------------------------------ rendering ---------------------------- */

    _render() {
      this.textContent = '';

      var header = document.createElement('div');
      header.className = 'apm-header';

      this._toggle = document.createElement('button');
      this._toggle.className = 'ga-button ga-button--ghost apm-toggle';
      this._toggle.type = 'button';
      this._toggle.setAttribute('aria-expanded', String(!this.collapsed));
      this._chevron = svgIcon(this.collapsed ? 'chevron-down' : 'chevron-up');
      var title = document.createElement('span');
      title.className = 'apm-title';
      title.textContent = this.label;
      this._toggle.appendChild(this._chevron);
      this._toggle.appendChild(title);
      this._toggle.addEventListener('click', this._onToggle.bind(this));

      var menuWrap = document.createElement('div');
      menuWrap.className = 'apm-menu-wrap';

      this._menuBtn = document.createElement('button');
      this._menuBtn.className = 'ga-button ga-button--ghost ga-button--icon-only apm-menu-btn';
      this._menuBtn.type = 'button';
      this._menuBtn.setAttribute('aria-label', 'Module options');
      this._menuBtn.setAttribute('aria-haspopup', 'menu');
      this._menuBtn.setAttribute('aria-expanded', 'false');
      this._menuBtn.appendChild(svgIcon('ellipsis-vertical'));
      this._menuBtn.addEventListener('click', this._onMenuButton.bind(this));

      this._menu = document.createElement('div');
      this._menu.className = 'ga-menu apm-menu';
      this._menu.setAttribute('role', 'menu');
      this._menu.hidden = true;

      this._items = {};
      MOVES.forEach(function (pair) {
        this._menu.appendChild(this._menuItem(pair[0], pair[1]));
      }, this);

      /* Divider, then whatever the module adds. Both hide when empty. */
      this._separator = document.createElement('div');
      this._separator.className = 'ga-menu__separator';
      this._separator.setAttribute('role', 'separator');
      this._menu.appendChild(this._separator);

      this._extras = this.secondaryActions() || [];
      this._extras.forEach(function (a) {
        this._menu.appendChild(this._menuItem(a.id, a.label));
      }, this);

      menuWrap.appendChild(this._menuBtn);
      menuWrap.appendChild(this._menu);
      header.appendChild(this._toggle);
      header.appendChild(menuWrap);

      this._body = document.createElement('div');
      this._body.className = 'apm-body';
      this.renderBody(this._body);

      this.appendChild(header);
      this.appendChild(this._body);
      this._syncCollapsed();
    }

    _menuItem(id, label) {
      var item = document.createElement('button');
      item.className = 'ga-menu__item';
      item.type = 'button';
      item.setAttribute('role', 'menuitem');
      var span = document.createElement('span');
      span.className = 'ga-menu__item-label';
      span.textContent = label;
      item.appendChild(span);
      item.addEventListener('click', this._onMenuItem.bind(this, id));
      this._items[id] = item;
      return item;
    }

    /* ------------------------------ collapse ----------------------------- */

    _onToggle() {
      if (this.collapsed) { this.removeAttribute('collapsed'); }
      else { this.setAttribute('collapsed', ''); }
      this.emit('appr:collapse', { collapsed: this.collapsed });
    }

    _syncCollapsed() {
      if (!this._body) { return; }
      var open = !this.collapsed;
      this._body.hidden = !open;
      this._toggle.setAttribute('aria-expanded', String(open));
      var next = svgIcon(open ? 'chevron-up' : 'chevron-down');
      this._toggle.replaceChild(next, this._chevron);
      this._chevron = next;
    }

    /* -------------------------------- menu ------------------------------- */

    _onMenuButton(e) {
      e.stopPropagation();
      this._menu.hidden ? this._openMenu() : this._closeMenu();
    }

    _positionMenu() { placeMenu(this._menuBtn, this._menu); }

    _openMenu() {
      this._syncMenuState();
      this._menu.hidden = false;
      this._positionMenu();
      this._menuBtn.setAttribute('aria-expanded', 'true');
      this._away = function (ev) { if (!this.contains(ev.target)) { this._closeMenu(); } }.bind(this);
      this._esc = function (ev) {
        if (ev.key === 'Escape') { this._closeMenu(); this._menuBtn.focus(); }
      }.bind(this);
      /* Capture phase so the stack's own scroll is caught, not just the window's. */
      this._reflow = this._positionMenu.bind(this);
      document.addEventListener('pointerdown', this._away);
      document.addEventListener('keydown', this._esc);
      document.addEventListener('scroll', this._reflow, true);
      window.addEventListener('resize', this._reflow);
    }

    _closeMenu() {
      if (!this._menu || this._menu.hidden) { return; }
      this._menu.hidden = true;
      this._menuBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', this._away);
      document.removeEventListener('keydown', this._esc);
      document.removeEventListener('scroll', this._reflow, true);
      window.removeEventListener('resize', this._reflow);
    }

    /* Where am I? Derived from the [data-module-stack] contract only. */
    _position() {
      var stack = this.closest(STACK);
      if (!stack || !stack.parentElement) { return null; }
      var stacks = [].filter.call(stack.parentElement.children, function (c) {
        return c.matches(STACK);
      });
      var siblings = [].slice.call(stack.children);
      return {
        stack: stack, stacks: stacks, stackIndex: stacks.indexOf(stack),
        siblings: siblings, index: siblings.indexOf(this)
      };
    }

    /* Move left/right follow which stack holds the module; up/down follow
       whether it has a neighbour there. Computed, so they start working by
       themselves as soon as a second module lands. */
    _syncMenuState() {
      if (!this._items) { return; }
      var p = this._position();
      var can = { left: false, right: false, up: false, down: false };
      if (p && p.stackIndex > -1) {
        can.left  = p.stackIndex > 0;
        can.right = p.stackIndex < p.stacks.length - 1;
        can.up    = p.index > 0;
        can.down  = p.index > -1 && p.index < p.siblings.length - 1;
      }
      MOVES.forEach(function (pair) {
        this._items[pair[0]].hidden = !can[pair[0]];
      }, this);
      (this._extras || []).forEach(function (a) {
        this._items[a.id].hidden = false;
      }, this);

      var anyMove = can.left || can.right || can.up || can.down;
      this._separator.hidden = !anyMove || !(this._extras || []).length;
    }

    _onMenuItem(action, e) {
      e.stopPropagation();
      if (this._items[action].hidden) { return; }
      this._closeMenu();

      var isMove = MOVES.some(function (p) { return p[0] === action; });
      if (!isMove) {
        this.onAction(action);
        this.emit('appr:action', { action: action });
        return;
      }

      var p = this._position();
      if (!p) { return; }
      if (action === 'left' || action === 'right') {
        var target = p.stacks[p.stackIndex + (action === 'left' ? -1 : 1)];
        if (target) { target.appendChild(this); }
      } else {
        var ref = p.siblings[p.index + (action === 'up' ? -1 : 1)];
        if (ref) {
          action === 'up' ? p.stack.insertBefore(this, ref)
                          : p.stack.insertBefore(this, ref.nextElementSibling);
        }
      }
      this._syncMenuState();
      this.emit('appr:moved', { direction: action });
    }
  }

  window.ApprModule = ApprModule;
  window.ApprIcon = svgIcon;
  window.ApprPlaceMenu = placeMenu;
})();

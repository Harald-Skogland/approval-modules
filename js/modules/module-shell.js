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
   - EVERY row carries a leading Lucide icon (user's call 2026-09-24): the
     move rows show the direction the module travels, and a module's own
     actions supply theirs through secondaryActions().

   In the live product only Attachment viewer and External editor carry header
   actions — Workflow details and Expense claim details have a bare title.
   Giving every module the same shell is a deliberate divergence: it is what
   makes them all collapsible and movable.

   LIGHT DOM ON PURPOSE — no shadow root, so Gaia's real classes reach the
   markup (.ga-button--ghost, .ga-menu). Tokens would cross a shadow boundary;
   classes would not.

   HOST CONTRACT — how a module knows where it is
     A module lives inside an element marked [data-module-stack]. Sibling
     stacks under a common parent are the left-to-right order. No module
     references #stack-left, .td-split or any page id, so the same element
     works in My tasks by marking a container there the same way.

     REARRANGE MENU (Task detail only). A host that also marks an ancestor
     [data-module-frame], holding [data-full-area="top"] and
     [data-full-area="bottom"], gets ONE move row in the context menu —
     "Rearrange modules" (Lucide `move`) — in place of the move rows
     (2026-10-01). Choosing it swaps the menu, in place, for the rearrange
     menu: a "Rearrange modules" header over a live miniature of the page —
     top area, left and right columns (at their real width ratio), bottom
     area. Empty areas are still drawn, as targets. Pointing at a spot shows
     a "Click here to move" slot that follows the cursor and pushes the other
     blocks aside; clicking it moves the module there, animated, and the
     REARRANGE menu reopens on the moved module, so the user can keep going.
     Escape or a click outside closes it. Arrow keys + Enter do the same
     from the keyboard. The module's own block stays put, highlighted, and
     the slots either side of it (which would not move it) show nothing.
     PROJECT-BUILT — Gaia has no such component; user gave free rein.
     My tasks has no frame and keeps the plain Move up / Move down rows.

   SUBCLASS API
     get defaultLabel()      header title when no label attribute is set
     get mapLabel()          block name in the rearrange map (default: label)
     renderBody(container)   fill the module body; called on (re)render
     secondaryActions()      [{ id, label, icon? }] shown below the menu
                             divider. icon takes an ICONS name or a Lucide
                             spec object, and renders in Gaia's leading slot
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
  var FRAME = '[data-module-frame]';
  var AREA  = '[data-full-area]';
  var NS = 'http://www.w3.org/2000/svg';

  /* Canonical Lucide: stroked shapes, viewBox 0 0 24 24, stroke-width 2.
     Circles are STROKED (r=1 + width 2 reads as a solid dot) — filling them
     renders thin and undersized. */
  var ICONS = {
    'chevron-up':        { paths: ['m18 15-6-6-6 6'] },
    'chevron-down':      { paths: ['m6 9 6 6 6-6'] },
    'ellipsis-vertical': { circles: [[12, 5], [12, 12], [12, 19]] },
    /* The four move arrows. Verified against lucide-static 1.48.0, not
       recalled — arrow-up / -down / -left / -right, two paths each. */
    'arrow-up':          { paths: ['m5 12 7-7 7 7', 'M12 19V5'] },
    'arrow-down':        { paths: ['M12 5v14', 'm19 12-7 7-7-7'] },
    'arrow-left':        { paths: ['m12 19-7-7 7-7', 'M19 12H5'] },
    'arrow-right':       { paths: ['M5 12h14', 'm12 5 7 7-7 7'] },
    /* "Rearrange modules" (2026-10-01), verified against lucide-static 1.48.0. */
    'move':              { paths: ['M12 2v20', 'm15 19-3 3-3-3', 'm19 9 3 3-3 3', 'M2 12h20',
                                   'm5 9-3 3 3 3', 'm9 5 3-3 3 3'] }
  };

  /* Menu rows are single-line and 36px tall, so 16px is the icon box —
     svgIcon sizes nothing by default and Gaia's .ga-menu__item-icon carries
     colour but NO dimensions (see HANDOFF s12). */
  var MENU_ICON_SIZE = '16';

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

  /* [id, label, icon]. The icon is the direction the module actually travels,
     so the row reads as its own preview (user's call 2026-09-24). */
  var MOVES = [
    ['up',    'Move up',    'arrow-up'],
    ['down',  'Move down',  'arrow-down'],
    ['left',  'Move left',  'arrow-left'],
    ['right', 'Move right', 'arrow-right']
  ];

  var ZONE_NAMES = {
    top: 'Full width - top', left: 'Left column', right: 'Right column',
    bottom: 'Full width - bottom'
  };

  function separator() {
    var sep = document.createElement('div');
    sep.className = 'ga-menu__separator';
    sep.setAttribute('role', 'separator');
    return sep;
  }

  /* --------------------------- move animation -----------------------------
     Added 2026-09-30 at the user's request. FLIP: measure every module on
     screen, apply the move, scroll the moved module into view, then animate
     each module that shifted from its old SCREEN position to its new one. The
     scroll happens instantly before the animation, so the moved module
     visibly travels to where it now sits in view, and its neighbours slide
     out of the way.

     Gaia ships motion tokens but no "move" transition, so the timing is a
     project choice, not a Gaia spec: MOVE_MS below with --ga-easing-standard.
     Translate only: a width change (column <-> area) snaps,
     because scaling a module would stretch its text mid-flight.

     prefers-reduced-motion skips the animation; the move, the scroll and the
     reopened menu still happen. Project addition, not specified. */
  /* 800ms, user's call 2026-09-30 (trial). NOT a Gaia token: the package's
     longest duration is --ga-duration-slower, 400ms. The easing still comes
     from Gaia. */
  var MOVE_MS = 800;

  function motionToken(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* Bring the moved module into view — all of it if it fits, otherwise its
     header, which is where the reopened menu hangs from. */
  function reveal(mod) {
    var box = mod.getBoundingClientRect();
    var fits = box.height <= window.innerHeight;
    var target = fits ? mod : (mod.querySelector('.apm-header') || mod);
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  /* The child of `stack` to insert `mod` before (null = at the end), chosen
     so the module's top edge moves as little as possible. The candidate
     positions are the top of each module in the stack, plus the bottom of
     the last one. */
  function nearestSlot(stack, mod) {
    var y = mod.getBoundingClientRect().top;
    var kids = [].filter.call(stack.children, function (c) { return c !== mod; });
    var best = null, bestD = Infinity;
    kids.forEach(function (k) {
      var d = Math.abs(k.getBoundingClientRect().top - y);
      if (d < bestD) { bestD = d; best = k; }
    });
    if (kids.length) {
      var end = Math.abs(kids[kids.length - 1].getBoundingClientRect().bottom - y);
      if (end < bestD) { best = null; }
    }
    return best;
  }

  function animateMove(mod, mutate) {
    var mods = [].slice.call(document.querySelectorAll('.appr-module'));
    var first = mods.map(function (m) { return m.getBoundingClientRect(); });

    mutate();
    reveal(mod);

    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !mod.animate) { return Promise.resolve(); }

    var ms = MOVE_MS;
    var easing = motionToken('--ga-easing-standard', 'ease');

    var runs = [];
    mods.forEach(function (m, i) {
      var last = m.getBoundingClientRect();
      var dx = first[i].left - last.left, dy = first[i].top - last.top;
      if (!dx && !dy) { return; }
      /* The moved module travels above its neighbours. */
      if (m === mod) { m.style.position = 'relative'; m.style.zIndex = '1'; }
      runs.push(m.animate(
        [{ transform: 'translate(' + dx + 'px, ' + dy + 'px)' }, { transform: 'none' }],
        { duration: ms, easing: easing }
      ).finished.catch(function () {}));
    });

    return Promise.all(runs).then(function () {
      mod.style.position = '';
      mod.style.zIndex = '';
    });
  }

  class ApprModule extends HTMLElement {

    /* Subclasses add their own names via observed(). */
    static get observedAttributes() { return ['label', 'collapsed']; }

    get defaultLabel() { return 'Module'; }
    get label()        { return this.getAttribute('label') || this.defaultLabel; }
    /* Name on the module's block in the rearrange map. Defaults to the header
       title; a module whose title carries live data (a count) overrides it. */
    get mapLabel()     { return this.label; }
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

      /* Plain move rows (hosts without a frame), or the layout map (hosts
         with one) — _syncMenuState() shows one or the other. Then a divider
         and the module's own actions. A divider shows only with a visible
         row on both sides of it (_tidySeparators). */
      MOVES.forEach(function (m) {
        this._menu.appendChild(this._menuItem(m[0], m[1], m[2]));
      }, this);

      /* Framed hosts: one row that opens the rearrange menu, which is the
         same element in its other mode — header + map, nothing else. */
      this._menu.appendChild(this._menuItem('rearrange', 'Rearrange modules', 'move'));

      this._mapTitle = document.createElement('div');
      this._mapTitle.className = 'ga-menu__title';
      this._mapTitle.setAttribute('role', 'presentation');
      this._mapTitle.textContent = 'Rearrange modules';
      this._mapTitle.hidden = true;
      this._menu.appendChild(this._mapTitle);

      this._mapWrap = document.createElement('div');
      this._mapWrap.className = 'apm-map-wrap';
      this._mapWrap.hidden = true;
      this._menu.appendChild(this._mapWrap);

      this._menu.appendChild(separator());
      this._extras = this.secondaryActions() || [];
      this._extras.forEach(function (a) {
        this._menu.appendChild(this._menuItem(a.id, a.label, a.icon));
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

    /* icon is optional: a name from ICONS, or a spec object, exactly as
       svgIcon() takes it. It goes in Gaia's OWN leading slot
       (.ga-menu__item-icon), which already carries the hover, disabled and
       selected colours — nothing here restyles it. */
    _menuItem(id, label, icon) {
      var item = document.createElement('button');
      item.className = 'ga-menu__item';
      item.type = 'button';
      item.setAttribute('role', 'menuitem');
      if (icon) {
        var slot = document.createElement('span');
        slot.className = 'ga-menu__item-icon';
        slot.setAttribute('aria-hidden', 'true');
        slot.appendChild(svgIcon(icon, MENU_ICON_SIZE));
        item.appendChild(slot);
      }
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

    /* mode: 'context' (default) or 'rearrange'. */
    _openMenu(mode) {
      /* Re-opening an open menu would register its listeners twice and leak
         the first set. */
      this._closeMenu();
      this._mode = mode || 'context';
      this._syncMenuState();
      this._menu.hidden = false;
      this._positionMenu();
      this._menuBtn.setAttribute('aria-expanded', 'true');
      /* Outside the MENU (and its trigger, which toggles by itself) — not
         outside the module: clicking the module's own body must dismiss too. */
      this._away = function (ev) {
        var t = ev.target;
        if (!this._menu.contains(t) && !this._menuBtn.contains(t)) { this._closeMenu(); }
      }.bind(this);
      this._esc = function (ev) {
        if (ev.key === 'Escape') { this._closeMenu(); this._menuBtn.focus(); }
      }.bind(this);
      /* A click inside the attachment viewer's PDF <embed> never reaches this
         document — Chrome's PDF viewer swallows it — so pointerdown alone
         missed it and the menu stayed open. The window losing focus is the
         one signal that does arrive, so it dismisses too (as native menus do;
         switching tab or app closes it as well). */
      this._blur = this._closeMenu.bind(this);
      /* Capture phase so the stack's own scroll is caught, not just the window's. */
      this._reflow = this._positionMenu.bind(this);
      document.addEventListener('pointerdown', this._away);
      window.addEventListener('blur', this._blur);
      document.addEventListener('keydown', this._esc);
      document.addEventListener('scroll', this._reflow, true);
      window.addEventListener('resize', this._reflow);
    }

    _closeMenu() {
      if (!this._menu || this._menu.hidden) { return; }
      this._menu.hidden = true;
      this._menuBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', this._away);
      window.removeEventListener('blur', this._blur);
      document.removeEventListener('keydown', this._esc);
      document.removeEventListener('scroll', this._reflow, true);
      window.removeEventListener('resize', this._reflow);
    }

    /* Where am I? Derived from the host contract only. `stack` is whatever
       holds the module — a half-width stack or a full-width area. */
    _position() {
      var stack = this.closest(STACK + ',' + AREA);
      if (!stack || !stack.parentElement) { return null; }
      var area = stack.matches(AREA) ? stack.getAttribute('data-full-area') : null;
      var stacks = area ? [] : [].filter.call(stack.parentElement.children, function (c) {
        return c.matches(STACK);
      });
      var siblings = [].slice.call(stack.children);
      return {
        stack: stack, stacks: stacks, stackIndex: stacks.indexOf(stack),
        siblings: siblings, index: siblings.indexOf(this),
        area: area, frame: stack.closest(FRAME)
      };
    }

    _area(frame, which) {
      return frame ? frame.querySelector('[data-full-area="' + which + '"]') : null;
    }

    _tidySeparators() {
      var seenRow = false, pending = null;
      [].forEach.call(this._menu.children, function (el) {
        if (el.classList.contains('ga-menu__separator')) {
          el.hidden = true;
          if (seenRow && !pending) { pending = el; }
        } else if (!el.hidden) {
          if (pending) { pending.hidden = false; pending = null; }
          seenRow = true;
        }
      });
    }

    /* The half-width stacks, left to right. With a frame they are found from
       the frame, so a full-width module still knows the columns. */
    _columns(p) {
      if (p.frame) { return [].slice.call(p.frame.querySelectorAll(STACK)); }
      return p.stacks;
    }

    /* Computed on every open, so rows start working by themselves as soon as
       a neighbour lands. */
    _syncMenuState() {
      if (!this._items) { return; }
      var p = this._position();
      var framed = !!(p && p.frame);
      var rearrange = framed && this._mode === 'rearrange';

      this._items.rearrange.hidden = !framed || rearrange;
      this._mapTitle.hidden = !rearrange;
      this._mapWrap.hidden = !rearrange;
      this._menu.classList.toggle('apm-menu--map', rearrange);
      if (rearrange) { this._renderMap(p); }
      else { this._map = null; }

      var col = p && !framed ? p.stacks.indexOf(p.stack) : -1;
      this._items.up.hidden    = framed || !p || p.index <= 0;
      this._items.down.hidden  = framed || !p || p.index < 0 || p.index >= p.siblings.length - 1;
      this._items.left.hidden  = framed || col <= 0;
      this._items.right.hidden = framed || col < 0 || col >= p.stacks.length - 1;

      (this._extras || []).forEach(function (a) {
        this._items[a.id].hidden = rearrange;
      }, this);

      this._tidySeparators();
    }

    /* Swap the open context menu for the rearrange menu, in place. Focus goes
       to the map so the keyboard can drive it straight away. */
    _openRearrange() {
      this._mode = 'rearrange';
      this._syncMenuState();
      this._positionMenu();
      var map = this._mapWrap.querySelector('.apm-map');
      if (map) { map.focus({ preventScroll: true }); }
    }

    _onMenuItem(action, e) {
      e.stopPropagation();
      if (this._items[action].hidden) { return; }
      if (action === 'rearrange') { this._openRearrange(); return; }
      this._closeMenu();

      var isMove = MOVES.some(function (m) { return m[0] === action; });
      if (!isMove) {
        this.onAction(action);
        this.emit('appr:action', { action: action });
        return;
      }

      var p = this._position();
      if (!p) { return; }
      this._commitMove(action, function () {
        if (action === 'left' || action === 'right') {
          var target = p.stacks[p.stacks.indexOf(p.stack) + (action === 'left' ? -1 : 1)];
          if (target) { target.insertBefore(this, nearestSlot(target, this)); }
        } else {
          var ref = p.siblings[p.index + (action === 'up' ? -1 : 1)];
          if (ref) {
            action === 'up' ? p.stack.insertBefore(this, ref)
                            : p.stack.insertBefore(this, ref.nextElementSibling);
          }
        }
      }.bind(this));
    }

    /* Apply a move (animated), then hand the menu straight back — reopened on
       the moved module, focus on its trigger (or on the map, when the move
       was made from the keyboard) so the user keeps their place. Moving a
       node otherwise drops focus to <body>. */
    _commitMove(direction, mutate, focusMap) {
      this._closeMenu();
      var before = this.parentElement, beforeNext = this.nextElementSibling;
      var anim = animateMove(this, mutate);
      if (this.parentElement === before && this.nextElementSibling === beforeNext) { return; }

      this._syncMenuState();
      this.emit('appr:moved', { direction: direction });

      anim.then(function () {
        if (!this.isConnected) { return; }
        /* Back to the REARRANGE menu (user's call, 2026-10-01); on a host
           without a frame this falls back to the plain context menu. */
        this._openMenu('rearrange');
        var map = focusMap && this._mapWrap.querySelector('.apm-map');
        (map || this._menuBtn).focus({ preventScroll: true });
      }.bind(this));
    }

    /* ------------------------------ layout map ----------------------------- */

    /* The four real containers, keyed by map zone. */
    _zones(frame) {
      var cols = [].slice.call(frame.querySelectorAll(STACK));
      return {
        top: this._area(frame, 'top'),
        left: cols[0] || null,
        right: cols[cols.length - 1] || null,
        bottom: this._area(frame, 'bottom')
      };
    }

    _renderMap(p) {
      var self = this;
      var real = this._zones(p.frame);
      var wrap = this._mapWrap;
      wrap.textContent = '';

      var map = document.createElement('div');
      map.className = 'apm-map';
      map.tabIndex = 0;
      map.setAttribute('role', 'group');
      map.setAttribute('aria-label',
        'Layout. Point at a spot, or use the arrow keys, to choose where to move ' +
        this.mapLabel + '. Click or press Enter to move it.');

      var zones = {};
      function zone(name) {
        var z = document.createElement('div');
        z.className = 'apm-map__zone apm-map__zone--' + name;
        z.setAttribute('data-zone', name);
        var kids = real[name] ? [].slice.call(real[name].children) : [];
        kids.forEach(function (m) {
          var b = document.createElement('div');
          b.className = 'apm-map__block' + (m === self ? ' apm-map__block--self' : '');
          var t = document.createElement('span');
          t.className = 'apm-map__label';
          t.textContent = m.mapLabel || m.label || m.localName;
          b.appendChild(t);
          z.appendChild(b);
        });
        if (!kids.length) {
          var e = document.createElement('span');
          e.className = 'apm-map__empty';
          e.textContent = ZONE_NAMES[name];
          z.appendChild(e);
          z.classList.add('apm-map__zone--empty');
        }
        zones[name] = { el: z, real: real[name], self: kids.indexOf(self), count: kids.length };
        return z;
      }

      map.appendChild(zone('top'));
      var cols = document.createElement('div');
      cols.className = 'apm-map__cols';
      /* Columns at their real width ratio, so the map reads like the page. */
      var lw = real.left ? real.left.getBoundingClientRect().width : 1;
      var rw = real.right ? real.right.getBoundingClientRect().width : 1;
      cols.style.gridTemplateColumns = (lw || 1) + 'fr ' + (rw || 1) + 'fr';
      cols.appendChild(zone('left'));
      cols.appendChild(zone('right'));
      map.appendChild(cols);
      map.appendChild(zone('bottom'));

      var live = document.createElement('span');
      live.className = 'apm-map__live';
      live.setAttribute('aria-live', 'polite');
      map.appendChild(live);

      var here = p.area || (real.left === p.stack ? 'left' : 'right');
      this._map = {
        el: map, zones: zones, live: live, slot: null, drop: null,
        home: { zone: here, index: p.index },
        col: p.area ? 'left' : here
      };

      map.addEventListener('pointermove', this._onMapPointer.bind(this));
      map.addEventListener('pointerleave', function () { this._showDrop(null); }.bind(this));
      map.addEventListener('click', function (e) {
        e.stopPropagation();
        if (this._map.slot) { this._commitMap(this._map.slot, false); }
      }.bind(this));
      map.addEventListener('keydown', this._onMapKey.bind(this));

      wrap.appendChild(map);
    }

    /* A slot either side of the module's own block would not move it. */
    _isNoop(slot) {
      var z = this._map.zones[slot.zone];
      return z.self > -1 && (slot.index === z.self || slot.index === z.self + 1);
    }

    _onMapPointer(e) {
      var zEl = e.target.closest && e.target.closest('.apm-map__zone');
      if (!zEl) { return; }                       /* in a gutter: keep the slot */
      var name = zEl.getAttribute('data-zone');
      /* Layout offsets, not getBoundingClientRect: blocks may be mid-animation
         and a transformed rect would make the slot flicker. */
      var y = e.clientY - zEl.getBoundingClientRect().top;
      var index = [].filter.call(zEl.querySelectorAll('.apm-map__block'), function (b) {
        return b.offsetTop + b.offsetHeight / 2 < y;
      }).length;
      var slot = { zone: name, index: index };
      this._showDrop(this._isNoop(slot) ? null : slot);
    }

    /* Insert (or move, or remove) the "Click here to move" slot, and slide the blocks
       it displaces — FLIP on layout offsets, Gaia's moderate duration. */
    _showDrop(slot) {
      var m = this._map;
      if (!m) { return; }
      var same = slot && m.slot && slot.zone === m.slot.zone && slot.index === m.slot.index;
      if (same || (!slot && !m.slot)) { return; }

      var blocks = [].slice.call(m.el.querySelectorAll('.apm-map__block'));
      var first = blocks.map(function (b) { return b.offsetTop; });

      if (m.drop) {
        m.drop.parentElement.classList.remove('apm-map__zone--has-drop');
        m.drop.remove();
        m.drop = null;
      }
      m.slot = slot;
      m.el.classList.toggle('apm-map--armed', !!slot);

      if (slot) {
        var z = m.zones[slot.zone].el;
        var drop = document.createElement('div');
        drop.className = 'apm-map__drop';
        var dl = document.createElement('span');
        dl.className = 'apm-map__label';
        dl.textContent = 'Click here to move';
        drop.appendChild(dl);
        var zb = z.querySelectorAll('.apm-map__block');
        z.insertBefore(drop, zb[slot.index] || null);
        z.classList.add('apm-map__zone--has-drop');
        m.drop = drop;
        m.live.textContent = 'Move to ' + ZONE_NAMES[slot.zone] +
          ', position ' + (slot.index + 1);
      } else {
        m.live.textContent = '';
      }

      var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || !document.body.animate) { return; }
      var ms = parseFloat(motionToken('--ga-duration-moderate', '150ms')) || 150;
      var easing = motionToken('--ga-easing-standard', 'ease');
      blocks.forEach(function (b, i) {
        var dy = first[i] - b.offsetTop;
        if (dy) {
          b.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }],
                    { duration: ms, easing: easing });
        }
      });
      if (m.drop) {
        m.drop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: easing });
      }
    }

    /* Keyboard: Up/Down walk the slots top area -> current column -> bottom
       area; Left/Right switch column; Enter/Space move. Slots that would not
       move the module are skipped. The walk starts from the module itself. */
    _onMapKey(e) {
      var m = this._map;
      var key = e.key;
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        if (m.slot) { this._commitMap(m.slot, true); }
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(key) < 0) { return; }
      e.preventDefault();

      var cur = m.slot || m.home;
      var self = this;
      function seq(col) {
        var out = [];
        ['top', col, 'bottom'].forEach(function (zn) {
          for (var i = 0; i <= m.zones[zn].count; i++) { out.push({ zone: zn, index: i }); }
        });
        return out;
      }
      function find(list, s) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].zone === s.zone && list[i].index === s.index) { return i; }
        }
        return -1;
      }
      function step(list, from, dir) {
        for (var i = from + dir; i >= 0 && i < list.length; i += dir) {
          if (!self._isNoop(list[i])) { return list[i]; }
        }
        return null;
      }

      var next = null;
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        var list = seq(m.col);
        next = step(list, find(list, cur), key === 'ArrowUp' ? -1 : 1);
      } else if (cur.zone === 'left' || cur.zone === 'right') {
        var to = key === 'ArrowLeft' ? 'left' : 'right';
        if (to !== cur.zone) {
          m.col = to;
          var cand = { zone: to, index: Math.min(cur.index, m.zones[to].count) };
          var l2 = seq(to);
          next = this._isNoop(cand) ? step(l2, find(l2, cand), 1) || step(l2, find(l2, cand), -1) : cand;
        }
      } else {
        m.col = key === 'ArrowLeft' ? 'left' : 'right';   /* aim the next Up/Down */
      }
      if (next) { this._showDrop(next); }
    }

    _commitMap(slot, fromKeyboard) {
      var real = this._map.zones[slot.zone].real;
      if (!real) { return; }
      this._commitMove('map-' + slot.zone, function () {
        real.insertBefore(this, real.children[slot.index] || null);
      }.bind(this), fromKeyboard);
    }
  }

  window.ApprModule = ApprModule;
  window.ApprIcon = svgIcon;
  window.ApprPlaceMenu = placeMenu;
})();

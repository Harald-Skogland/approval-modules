/* =========================================================================
   Layout memory — remembers how the user arranged the modules.

   Added 2026-10-01 (user's call). Per page, for the life of the TAB
   (sessionStorage): switching task — Task detail's next/previous reloads
   the page — and reloading keep the arrangement; a new tab or a closed
   browser starts from the default. Task detail and My tasks' preview pane
   each keep their OWN arrangement (different shapes: two columns plus
   full-width areas vs one stack). No reset action, by request.

   What is remembered:
     order      which container each module sits in, and in what order
     collapsed  each module's collapsed state
     split      the splitter position, as a percentage

   Containers are found through the same host contract the modules use —
   [data-module-stack] and [data-full-area] — keyed by their area name or id.
   Modules are keyed by tag name, which is unique on each page.

   Saves on appr:moved, appr:collapse (from js/modules/module-shell.js) and
   td:split-change (from js/splitter.js, user changes only). Restores once,
   on DOMContentLoaded, after the splitter has initialised. A module the
   saved state does not mention stays where the page put it.
   ========================================================================= */

(function () {
  'use strict';

  var KEY = 'appr:layout:' + (location.pathname.split('/').pop() || 'index.html');
  var CONTAINERS = '[data-module-stack], [data-full-area]';

  function read() {
    try {
      var v = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      return v && typeof v === 'object' ? v : null;
    } catch (e) {
      return null;   /* private window, blocked storage, or malformed */
    }
  }

  function write(state) {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* not fatal */ }
  }

  function keyOf(el, i) {
    var area = el.getAttribute('data-full-area');
    return area ? 'area:' + area : (el.id || 'stack:' + i);
  }

  function containers() {
    return [].slice.call(document.querySelectorAll(CONTAINERS));
  }

  function modulesIn(el) {
    return [].filter.call(el.children, function (c) { return c.classList.contains('appr-module'); });
  }

  /* ------------------------------- save -------------------------------- */

  var split = document.querySelector('.td-split');
  var splitPct = null;

  function snapshot() {
    var prev = read() || {};
    var order = {}, collapsed = {};
    containers().forEach(function (el, i) {
      order[keyOf(el, i)] = modulesIn(el).map(function (m) {
        collapsed[m.localName] = m.hasAttribute('collapsed');
        return m.localName;
      });
    });
    write({
      order: order,
      collapsed: collapsed,
      split: splitPct !== null ? splitPct : (prev.split != null ? prev.split : null)
    });
  }

  document.addEventListener('appr:moved', snapshot);
  document.addEventListener('appr:collapse', snapshot);
  document.addEventListener('td:split-change', function (e) {
    splitPct = e.detail && typeof e.detail.pct === 'number' ? e.detail.pct : null;
    snapshot();
  });

  /* ------------------------------ restore ------------------------------ */

  function restore() {
    var state = read();
    if (!state) { return; }

    if (state.order) {
      var byKey = {};
      containers().forEach(function (el, i) { byKey[keyOf(el, i)] = el; });
      Object.keys(state.order).forEach(function (k) {
        var target = byKey[k];
        if (!target || !Array.isArray(state.order[k])) { return; }
        /* Insert where the modules live, not at the very end: a container
           can carry other chrome around them (My tasks' pane has a header
           above and a hint line below). The anchor is whatever follows the
           container's last module, taken BEFORE anything moves. */
        var mods = modulesIn(target);
        var anchor = mods.length ? mods[mods.length - 1].nextSibling : null;
        state.order[k].forEach(function (tag) {
          var m = document.querySelector(tag);
          if (m && m.classList.contains('appr-module') && m !== anchor) {
            target.insertBefore(m, anchor);
          }
        });
      });
    }

    if (state.collapsed) {
      Object.keys(state.collapsed).forEach(function (tag) {
        var m = document.querySelector(tag);
        if (!m) { return; }
        if (state.collapsed[tag]) { m.setAttribute('collapsed', ''); }
        else { m.removeAttribute('collapsed'); }
      });
    }

    if (typeof state.split === 'number' && split && split._splitterApply) {
      splitPct = state.split;
      split._splitterApply(state.split);
    }
  }

  /* Listeners added later than js/splitter.js's own, so the splitter exists
     by the time this runs. */
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', restore)
    : restore();
})();

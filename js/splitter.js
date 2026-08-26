/* =========================================================================
   Splitter — a draggable vertical divider between two stacks.

   Generalised out of js/task-detail.js on 2026-08-25, when My tasks gained a
   reading pane and needed the same behaviour. It now initialises EVERY
   .td-split on the page and finds the .td-splitter inside it, so neither view
   depends on element ids.

   Gaia ships no splitter or resizable-panel component — this is hand-built on
   purpose, and it is the only non-Gaia interactive control in the shell.

   Each split writes its position to --td-left on the container; the CSS turns
   that into the first grid column. Pointer drag, keyboard nudge, double-click
   to reset, and a per-stack minimum width read from --td-stack-min.
   ========================================================================= */

(function () {
  'use strict';

  var NUDGE = 1;          /* arrow key step, in percent */
  var NUDGE_BIG = 5;      /* shift + arrow key step */

  function readPx(el, name, fallback) {
    var n = parseFloat(getComputedStyle(el).getPropertyValue(name));
    return isNaN(n) ? fallback : n;
  }

  function init(split) {
    var splitter = split.querySelector('.td-splitter');
    if (!splitter || split._splitterReady) { return; }
    split._splitterReady = true;

    /* Per-split default, so a reading pane can open narrower than 50/50. */
    var DEFAULT_PCT = parseFloat(split.getAttribute('data-split-default')) || 50;
    var pct = DEFAULT_PCT;

    /* Clamp so neither stack is squeezed below --td-stack-min. If the viewport
       is too narrow to honour both minimums, fall back to the default. */
    function clamp(p) {
      var rect = split.getBoundingClientRect();
      var minPx = readPx(split, '--td-stack-min', 280);
      var gutter = splitter.getBoundingClientRect().width;
      if (rect.width <= 0) { return p; }
      if (rect.width - gutter < minPx * 2) { return DEFAULT_PCT; }

      var lo = (minPx / rect.width) * 100;
      var hi = ((rect.width - gutter - minPx) / rect.width) * 100;
      return Math.min(hi, Math.max(lo, p));
    }

    function apply(p) {
      pct = clamp(p);
      split.style.setProperty('--td-left', pct.toFixed(3) + '%');
      splitter.setAttribute('aria-valuenow', String(Math.round(pct)));
    }

    /* Centre the splitter on the cursor rather than letting its left edge
       track it — otherwise the rule sits half a gutter off the pointer. */
    function pctFromClientX(clientX) {
      var rect = split.getBoundingClientRect();
      var gutter = splitter.getBoundingClientRect().width;
      return ((clientX - rect.left - (gutter / 2)) / rect.width) * 100;
    }

    var activePointer = null;

    function onPointerMove(e) { apply(pctFromClientX(e.clientX)); }

    function endDrag() {
      splitter.classList.remove('is-dragging');
      document.body.classList.remove('td-dragging');
      /* Listeners live on window, not the splitter: pointer capture can be
         refused, and without it the pointer outruns the 16px column on the
         first fast move and the drag dies mid-gesture. */
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      if (activePointer !== null) {
        try { splitter.releasePointerCapture(activePointer); } catch (err) { /* never captured */ }
        activePointer = null;
      }
    }

    splitter.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) { return; }
      e.preventDefault();
      splitter.focus();

      /* Wire the drag up BEFORE asking for capture. setPointerCapture throws on
         an unknown pointer id, and doing it first killed the whole gesture. */
      splitter.classList.add('is-dragging');
      document.body.classList.add('td-dragging');
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);

      try {
        splitter.setPointerCapture(e.pointerId);
        activePointer = e.pointerId;
      } catch (err) {
        activePointer = null;   /* capture is an optimisation, not a requirement */
      }
    });

    splitter.addEventListener('dblclick', function () { apply(DEFAULT_PCT); });

    splitter.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? NUDGE_BIG : NUDGE;
      var next = null;
      if (e.key === 'ArrowLeft') { next = pct - step; }
      else if (e.key === 'ArrowRight') { next = pct + step; }
      else if (e.key === 'Home') { next = 0; }      /* clamps to the left minimum  */
      else if (e.key === 'End') { next = 100; }     /* clamps to the right minimum */
      else if (e.key === 'Enter' || e.key === ' ') { next = DEFAULT_PCT; }
      if (next === null) { return; }
      e.preventDefault();
      apply(next);
    });

    /* Re-clamp on resize: a percentage legal at 1600px can violate the
       minimum at 900px. */
    window.addEventListener('resize', function () { apply(pct); });

    split._splitterApply = apply;   /* so a host can reset it when reopening */
    apply(DEFAULT_PCT);
  }

  function initAll() {
    [].forEach.call(document.querySelectorAll('.td-split'), init);
  }

  window.ApprSplitter = { initAll: initAll, init: init };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', initAll)
    : initAll();
})();

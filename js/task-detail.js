/* =========================================================================
   Approval — Task detail (placeholder scaffold)

   Owns one thing: the x-position of the vertical split between the two
   module stacks. The position is written to --td-left on .td-split as a
   percentage; CSS turns that into the first grid column.

   Gaia has no splitter component, so this is hand-built. Pointer drag,
   keyboard nudge, and double-click-to-reset are all implemented here.
   ========================================================================= */

(function () {
  'use strict';

  var DEFAULT_PCT = 50;   /* neutral 50/50 until the modules say otherwise */
  var NUDGE = 1;          /* arrow key step, in percent */
  var NUDGE_BIG = 5;      /* shift + arrow key step */

  var split    = document.getElementById('split');
  var splitter = document.getElementById('splitter');
  if (!split || !splitter) return;

  var pct = DEFAULT_PCT;

  function readPx(name, fallback) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    var n = parseFloat(raw);
    return isNaN(n) ? fallback : n;
  }

  /* Clamp so neither stack can be squeezed below --td-stack-min. If the
     viewport is too narrow to honour both minimums, fall back to 50/50. */
  function clamp(p) {
    var rect = split.getBoundingClientRect();
    var minPx = readPx('--td-stack-min', 280);
    var gutter = splitter.getBoundingClientRect().width;
    var usable = rect.width - gutter;
    if (rect.width <= 0) return p;
    if (usable < minPx * 2) return DEFAULT_PCT;

    var lo = (minPx / rect.width) * 100;
    var hi = ((rect.width - gutter - minPx) / rect.width) * 100;
    return Math.min(hi, Math.max(lo, p));
  }

  function apply(p) {
    pct = clamp(p);
    split.style.setProperty('--td-left', pct.toFixed(3) + '%');
    splitter.setAttribute('aria-valuenow', String(Math.round(pct)));
  }

  /* ------------------------------ pointer ------------------------------ */

  function pctFromClientX(clientX) {
    var rect = split.getBoundingClientRect();
    var gutter = splitter.getBoundingClientRect().width;
    /* Centre the splitter on the cursor rather than letting its left edge
       track it — otherwise the rule sits half a gutter off the pointer. */
    var x = clientX - rect.left - (gutter / 2);
    return (x / rect.width) * 100;
  }

  var activePointer = null;

  function onPointerMove(e) {
    apply(pctFromClientX(e.clientX));
  }

  function endDrag() {
    splitter.classList.remove('is-dragging');
    document.body.classList.remove('td-dragging');
    /* Listeners live on window, not on the splitter: pointer capture can be
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
    if (e.button !== 0) return;
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

  /* ----------------------------- keyboard ------------------------------ */

  splitter.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? NUDGE_BIG : NUDGE;
    var next = null;

    if (e.key === 'ArrowLeft')  next = pct - step;
    else if (e.key === 'ArrowRight') next = pct + step;
    else if (e.key === 'Home')  next = 0;    /* clamps to the left minimum  */
    else if (e.key === 'End')   next = 100;  /* clamps to the right minimum */
    else if (e.key === 'Enter' || e.key === ' ') next = DEFAULT_PCT;

    if (next === null) return;
    e.preventDefault();
    apply(next);
  });

  /* ------------------------------ resize ------------------------------- */

  /* Re-clamp on resize: a percentage that was legal at 1600px can violate
     the 280px minimum at 900px. */
  window.addEventListener('resize', function () { apply(pct); });

  /* --------------------------- module events ---------------------------
     Modules are position-agnostic: they report what the user did and let the
     host decide. attachment-viewer emits appr:maximize / appr:reset, and here
     that means driving the split so the module's own stack takes the room.
     Which side grows is derived from where the module actually sits, so the
     module stays movable between the stacks without changing either file. */

  function stackOf(el) {
    var s = el.closest ? el.closest('.td-stack') : null;
    return s && s.parentElement === split ? s : null;
  }

  document.addEventListener('appr:maximize', function (e) {
    var stack = stackOf(e.target);
    if (!stack) { return; }
    /* clamp() resolves 0 / 100 to whichever minimum applies */
    apply(stack.id === 'stack-left' ? 100 : 0);
  });

  document.addEventListener('appr:reset', function (e) {
    if (stackOf(e.target)) { apply(DEFAULT_PCT); }
  });

  apply(DEFAULT_PCT);
})();

/* =========================================================================
   Task detail — host glue.

   The splitter now lives in js/splitter.js, shared with My tasks' reading pane
   (generalised 2026-08-25). What remains here is the host's response to module
   events: modules are position-agnostic and only report what the user did, so
   the page decides what that means.

   appr:maximize / appr:reset are the two arrow buttons that were removed from
   attachment-viewer's header on 2026-08-24. Nothing emits them today; the
   handlers are kept so the behaviour is one line away if it is wanted back.
   ========================================================================= */

(function () {
  'use strict';

  var split = document.querySelector('.td-split');
  if (!split) { return; }

  function stackOf(el) {
    var s = el.closest ? el.closest('.td-stack') : null;
    return s && s.parentElement === split ? s : null;
  }

  function setSplit(pct) {
    if (split._splitterApply) { split._splitterApply(pct); }
  }

  document.addEventListener('appr:maximize', function (e) {
    var stack = stackOf(e.target);
    if (!stack) { return; }
    /* clamp() resolves 0 / 100 to whichever minimum applies */
    setSplit(stack.id === 'stack-left' ? 100 : 0);
  });

  document.addEventListener('appr:reset', function (e) {
    if (stackOf(e.target)) { setSplit(50); }
  });
})();

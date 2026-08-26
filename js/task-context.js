/* =========================================================================
   Task context — which task is open, and what comes before and after it.

   Both pages build their task list from js/data.js, whose PRNG is seeded
   (mulberry32(20260821)) and whose TODAY is pinned. Two independent page loads
   therefore produce byte-identical arrays, so a task needs no server and no
   handover to be resolved — its id in the URL is enough:

       task-detail.html?task=480345

   What CANNOT be recomputed is the order the user was looking at: My tasks
   applies grouping, sorting, search and a company filter, and collapsed groups
   hide rows entirely. So the row click hands over the flat list of visible ids
   in sessionStorage, and next/previous walk that. Fall back to the full task
   order when there is no handover (a URL opened cold, or a new tab).

   Exposes window.ApprTask:
     task        the task record from TASKS, or null
     index       1-based position in the traversal order
     total       length of that order
     prevId      id of the previous task, or null
     nextId      id of the next task, or null
     scoped      true when walking the handed-over visible order
     go(id)      navigate to another task, preserving the order
     fmtAmount / fmtDate  re-exported from data.js for the modules
   ========================================================================= */

(function () {
  'use strict';

  var ORDER_KEY = 'appr:visible-order';

  function readOrder() {
    try {
      var raw = sessionStorage.getItem(ORDER_KEY);
      if (!raw) { return null; }
      var ids = JSON.parse(raw);
      return Array.isArray(ids) && ids.length ? ids : null;
    } catch (e) {
      return null;   /* private window, cleared storage, or malformed */
    }
  }

  function currentId() {
    var m = /[?&]task=(\d+)/.exec(location.search);
    return m ? Number(m[1]) : null;
  }

  var id = currentId();
  var task = null;
  if (typeof TASKS !== 'undefined') {
    for (var i = 0; i < TASKS.length; i++) {
      if (TASKS[i].id === id) { task = TASKS[i]; break; }
    }
  }

  /* Fall back to the first task so the view is never blank on a bare URL. */
  var scoped = false;
  var order = readOrder();
  if (order && task && order.indexOf(task.id) === -1) {
    order = null;    /* handover is for a different list — don't claim a position in it */
  }
  if (order) { scoped = true; }
  if (!order && typeof TASKS !== 'undefined') {
    order = TASKS.map(function (t) { return t.id; });
  }
  if (!task && typeof TASKS !== 'undefined' && TASKS.length) {
    task = TASKS[0];
  }

  var pos = task && order ? order.indexOf(task.id) : -1;

  var API = {
    task: task,
    index: pos > -1 ? pos + 1 : null,
    total: order ? order.length : null,
    prevId: pos > 0 ? order[pos - 1] : null,
    nextId: pos > -1 && pos < order.length - 1 ? order[pos + 1] : null,
    scoped: scoped,

    go: function (nextId) {
      if (nextId == null) { return; }
      location.href = 'task-detail.html?task=' + nextId;
    },

    /* Point the context at another task WITHOUT navigating — this is what My
       tasks' reading pane uses when a row is clicked. Fields are mutated in
       place so anything holding a reference to ApprTask keeps seeing the
       current task, then appr:task-changed tells the modules to re-render.

       `withinOrder` lets the caller supply the order actually on screen, since
       the pane is in the list rather than arriving from a handover. */
    setTask: function (nextId, withinOrder) {
      var found = null;
      if (typeof TASKS !== 'undefined') {
        for (var i = 0; i < TASKS.length; i++) {
          if (TASKS[i].id === nextId) { found = TASKS[i]; break; }
        }
      }
      if (!found) { return false; }

      var ord = withinOrder && withinOrder.length ? withinOrder : order;
      var at = ord.indexOf(found.id);

      API.task = found;
      API.index = at > -1 ? at + 1 : null;
      API.total = ord.length;
      API.prevId = at > 0 ? ord[at - 1] : null;
      API.nextId = at > -1 && at < ord.length - 1 ? ord[at + 1] : null;
      API.scoped = !!(withinOrder && withinOrder.length);

      document.dispatchEvent(new CustomEvent('appr:task-changed', {
        bubbles: true, detail: { task: found, id: found.id }
      }));
      return true;
    },

    fmtAmount: typeof fmtAmount === 'function' ? fmtAmount : function (v) { return String(v); },
    fmtDate: typeof fmtDate === 'function' ? fmtDate : function (d) { return String(d); }
  };

  window.ApprTask = API;
})();

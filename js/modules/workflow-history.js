/* =========================================================================
   Module — workflow-history   <appr-workflow-history>

   The decisions already taken on this document, newest last.

   !! INVENTED — NEEDS REVIEW !!
   In the product this is a collapsed row inside Workflow details and it was
   never expanded during the 2026-08-24 capture, so NOTHING about its contents
   was observed: not the fields, not the layout, not the ordering. The
   `gaia-ds` skill also lists the graphical workflow / process details view as
   an open question with an explicit "do not invent answers".

   What IS documented (gaia-ds -> Approval) and therefore drives this build:
     - a process is steps, a step generates tasks, all approvers in a step get
       the document simultaneously
     - actions: Approve, Reject (comment mandatory), Forward, Request review,
       Postpone, Email, Reassign
     - substitute decisions are recorded as "on behalf of"
     - comments are visible to all approvers in the workflow

   So this renders a plain, token-only timeline of actor / action / timestamp
   with an optional comment and on-behalf-of attribution. It is a placeholder
   for a real spec, not a reproduction. Replace it once the row can be opened.
   ========================================================================= */

(function () {
  'use strict';

  var I = window.ApprIcon;

  var CHECK  = { paths: ['M20 6 9 17l-5-5'] };
  var FORWARD = { paths: ['m15 17 5-5-5-5', 'M4 18v-2a4 4 0 0 1 4-4h12'] };
  var PLUS   = { paths: ['M5 12h14', 'M12 5v14'] };

  /* Synthetic Norwegian data, consistent with the bundled claim. */
  var ENTRIES = [
    { icon: PLUS,    action: 'Sent for approval', actor: 'Ingrid Halvorsen',
      when: '21/08/2026 at 14:55', note: 'Activated from Visma.net Expense' },
    { icon: FORWARD, action: 'Forwarded', actor: 'Astrid Moen', onBehalfOf: 'Lars Berge',
      when: '21/08/2026 at 15:20', note: 'Videresender til avdelingsleder for kostnadssted 4020.' },
    { icon: CHECK,   action: 'Approved', actor: 'Kjell Wangen',
      when: '22/08/2026 at 09:04', note: 'Reise godkjent i henhold til budsjett.' }
  ];

  class WorkflowHistory extends window.ApprModule {

    get defaultLabel() { return 'Workflow history'; }

    renderBody(body) {
      if (!ENTRIES.length) {
        var empty = document.createElement('p');
        empty.className = 'wh-empty';
        empty.textContent = 'No decisions recorded yet.';
        body.appendChild(empty);
        return;
      }

      var list = document.createElement('ol');
      list.className = 'wh-list';

      ENTRIES.forEach(function (e) {
        var li = document.createElement('li');
        li.className = 'wh-entry';

        var mark = document.createElement('span');
        mark.className = 'wh-entry__mark';
        mark.appendChild(I(e.icon, '16'));

        var main = document.createElement('div');
        main.className = 'wh-entry__main';

        var head = document.createElement('p');
        head.className = 'wh-entry__head';
        var act = document.createElement('span');
        act.className = 'wh-entry__action';
        act.textContent = e.action;
        head.appendChild(act);
        head.appendChild(document.createTextNode(' by '));
        var who = document.createElement('a');
        who.className = 'ga-link';
        who.href = '#';
        who.textContent = e.actor;
        head.appendChild(who);
        if (e.onBehalfOf) {
          var obo = document.createElement('span');
          obo.className = 'wh-entry__obo';
          obo.textContent = ' on behalf of ' + e.onBehalfOf;
          head.appendChild(obo);
        }

        var when = document.createElement('p');
        when.className = 'wh-entry__when';
        when.textContent = e.when;

        main.appendChild(head);
        main.appendChild(when);

        if (e.note) {
          var note = document.createElement('p');
          note.className = 'wh-entry__note';
          note.textContent = e.note;
          main.appendChild(note);
        }

        li.appendChild(mark);
        li.appendChild(main);
        list.appendChild(li);
      });

      body.appendChild(list);
    }
  }

  if (!customElements.get('appr-workflow-history')) {
    customElements.define('appr-workflow-history', WorkflowHistory);
  }
})();

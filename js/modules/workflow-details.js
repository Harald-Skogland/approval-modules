/* =========================================================================
   Module — workflow-details   <appr-workflow-details>

   REBUILT FROM FIGMA (2026-09-30): COM-Approval, node 14818:8559,
   "widget - workflow details". Replaces the 2026-08-27 two-column version
   (event timeline + progress indicator) entirely — user's call.

     Document due date / Task due date
     [v] Step 1  Approved by ...                          (Approved)
     [v] Step 2  Approved by ...                          (Approved)
     [^] Step 3  Pending approval by ...                  (In process)
           event card
           event card ...
           Current workflow step  ·  current approvers + reason
     [v] Step 4  Task for ...                             (Not started)

   Behaviour (user's calls, 2026-09-30):
     - The CURRENT step opens initially; every other step starts collapsed.
     - Finished steps can be opened to show their own events. Steps not yet
       started have a disabled chevron and no body, as in the frame.
     - Every event card has the same layout, whatever the event (comment,
       approval, review request, review, forward) — see eventCard().
     - Dates use the Norwegian format, dd.mm.yyyy and HH:mm.
     - Avatars are Gaia's small (24px) avatar with initials. The frame shows a
       16px photo in event cards; Gaia 0.6.11 has no 16px size and the
       prototype has no photos. The comment indent follows the avatar
       (24 + 8px), not the frame's 24px, so it still starts under the name.

   DEFERRED — "Hide skipped steps". The frame has a checkbox for it in the
   header. It only appears when a step HAS been skipped, and there is no design
   for a skipped step yet, so it is left out. Noted in HANDOFF.md.

   Content is synthetic (a Norwegian construction firm's invoice flow). Only
   the due dates come from the open task.

   The collapsible step card is PROJECT-BUILT (.wd-step): Gaia 0.6.11 ships no
   accordion. Its parts are real Gaia: ghost icon-only button, tag, avatar.
   ========================================================================= */

(function () {
  'use strict';

  var I = window.ApprIcon;
  var CTX = window.ApprTask || {};

  /* Canonical Lucide */
  var CIRCLE_CHECK = { circles: [[12, 12, 10]], paths: ['m9 12 2 2 4-4'] };
  var INFO         = { circles: [[12, 12, 10]], paths: ['M12 16v-4', 'M12 8h.01'] };

  /* Step state -> Gaia tag. Icons as drawn in the frame: Approved and In
     process carry one, Not started does not. */
  var STATUS = {
    approved:   { tag: 'ga-tag--success',     label: 'Approved',    icon: CIRCLE_CHECK },
    current:    { tag: 'ga-tag--information', label: 'In process',  icon: INFO },
    notStarted: { tag: 'ga-tag--disabled',    label: 'Not started', icon: null }
  };

  /* Every event has the same shape (Figma 14818:8559, tidied 2026-09-30):
       by      who acted — drives the avatar
       line    the sentence beside the avatar; defaults to just the name.
               A string is regular text, { b: 'Name' } is a name.
       text    optional comment, on its own line under the sentence */
  var STEPS = [
    { state: 'approved', summary: 'Approved by Astrid Moen', events: [
      { caption: 'Sent for approval', when: [18, 8, 2026, 8, 12], by: 'Kari Nilsen',
        line: [{ b: 'Kari Nilsen' }, ' sent task for approval to ', { b: 'Astrid Moen' }] },
      { caption: 'Approved', when: [18, 8, 2026, 10, 47], by: 'Astrid Moen',
        line: [{ b: 'Astrid Moen' }, ' approved task'],
        text: 'Kostnadssted 4020 stemmer.' }
    ] },

    { state: 'approved', summary: 'Approved by Lars Berge and Kjell Wangen', events: [
      { caption: 'Comment', when: [18, 8, 2026, 13, 5], by: 'Lars Berge',
        text: 'Sjekker mot prosjektbudsjettet for Fjordbyen.' },
      { caption: 'Approved', when: [19, 8, 2026, 9, 20], by: 'Lars Berge',
        line: [{ b: 'Lars Berge' }, ' approved task'] },
      { caption: 'Approved', when: [19, 8, 2026, 14, 2], by: 'Kjell Wangen',
        line: [{ b: 'Kjell Wangen' }, ' approved task'],
        text: 'Godkjent i henhold til budsjett.' }
    ] },

    { state: 'current',
      summary: 'Pending approval by Marit Solheim, Ingrid Haugen and Jonas Berg',
      events: [
        { caption: 'Comment', when: [20, 8, 2026, 8, 31], by: 'Marit Solheim',
          text: 'Kan vi dobbeltsjekke MVA-beløpet?' },
        { caption: 'Sent to review', when: [20, 8, 2026, 8, 34], by: 'Marit Solheim',
          line: [{ b: 'Marit Solheim' }, ' sent task to be reviewed by ', { b: 'Eirik Dahl' }],
          text: 'Kan du se på momsen?' },
        { caption: 'Reviewed', when: [20, 8, 2026, 11, 16], by: 'Eirik Dahl',
          line: [{ b: 'Eirik Dahl' }, ' reviewed task'],
          text: 'MVA er korrekt beregnet med 25 %.' },
        { caption: 'Forwarded', when: [20, 8, 2026, 15, 40], by: 'Ola Nygaard',
          line: [{ b: 'Ola Nygaard' }, ' forwarded task to ', { b: 'Ingrid Haugen' }],
          text: 'Ingrid tar over mens jeg har ferie.' },
        { caption: 'Comment', when: [21, 8, 2026, 9, 3], by: 'Marit Solheim',
          text: 'Ser bra ut fra min side.' }
      ],
      waiting: 'Awaiting approval',
      approvers: [
        { name: 'Marit Solheim',
          reason: 'This user is defined as directly responsible for approving the document' },
        { name: 'Ingrid Haugen',
          reason: 'Ola Nygaard forwarded the task to Ingrid Haugen.' },
        { name: 'Jonas Berg',
          reason: 'This user is defined as approver for department 4020 Prosjekt' }
      ] },

    { state: 'notStarted', summary: 'Task for Hanne Lie and Per Aas' },
    { state: 'notStarted', summary: 'Task for Tor Eriksen' }
  ];

  function pad(n) { return String(n).padStart(2, '0'); }

  /* Norwegian: 21.08.2026 */
  function fmtDate(d) {
    if (!(d instanceof Date)) { return d ? String(d) : ''; }
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  }

  /* [day, month, year, hour, minute] -> 21.08.2026 09:03 */
  function fmtWhen(w) {
    return pad(w[0]) + '.' + pad(w[1]) + '.' + w[2] + ' ' + pad(w[3]) + ':' + pad(w[4]);
  }

  function initials(name) {
    return name.split(/\s+/).map(function (p) { return p.charAt(0); }).join('').slice(0, 2)
      .toUpperCase();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text != null) { n.textContent = text; }
    return n;
  }

  function avatar(name) {
    var a = el('span', 'ga-avatar ga-avatar--small wd-avatar', initials(name));
    a.title = name;
    return a;
  }

  function tag(state) {
    var s = STATUS[state];
    var t = el('span', 'ga-tag ' + s.tag + ' wd-step__tag');
    if (s.icon) {
      var ic = I(s.icon, '16');
      ic.classList.add('ga-tag__icon');
      t.appendChild(ic);
    }
    t.appendChild(el('span', 'ga-tag__label', s.label));
    return t;
  }

  /* The one card layout, for every event type:
       Caption ........................ timestamp
       [avatar] sentence (names semibold)
                comment text (optional)                    */
  function eventCard(e) {
    var card = el('div', 'wd-event');

    var head = el('div', 'wd-event__head');
    head.appendChild(el('span', 'wd-event__caption', e.caption));
    head.appendChild(el('span', 'wd-event__when', fmtWhen(e.when)));
    card.appendChild(head);

    var row = el('div', 'wd-event__who');
    row.appendChild(avatar(e.by));
    var line = el('p', 'wd-event__line');
    (e.line || [{ b: e.by }]).forEach(function (part) {
      line.appendChild(typeof part === 'string'
        ? document.createTextNode(part)
        : el('span', 'wd-event__name', part.b));
    });
    row.appendChild(line);
    card.appendChild(row);

    if (e.text) { card.appendChild(el('p', 'wd-event__text', e.text)); }
    return card;
  }

  function currentCard(step) {
    var card = el('div', 'wd-event wd-current');

    var head = el('div', 'wd-event__head');
    head.appendChild(el('span', 'wd-event__caption', 'Current workflow step'));
    head.appendChild(el('span', 'wd-event__when', step.waiting));
    card.appendChild(head);

    /* One grid for header and rows, so "Reason" lines up with its column. */
    var table = el('div', 'wd-approvers');
    table.setAttribute('role', 'table');
    var th1 = el('span', 'wd-approvers__th', 'Current approvers');
    var th2 = el('span', 'wd-approvers__th', 'Reason');
    th1.setAttribute('role', 'columnheader');
    th2.setAttribute('role', 'columnheader');
    table.appendChild(th1);
    table.appendChild(th2);

    step.approvers.forEach(function (a) {
      var who = el('span', 'wd-approver');
      who.setAttribute('role', 'cell');
      who.appendChild(avatar(a.name));
      who.appendChild(el('span', 'wd-approver__name', a.name));
      var why = el('span', 'wd-approver__reason', a.reason);
      why.setAttribute('role', 'cell');
      table.appendChild(who);
      table.appendChild(why);
    });

    card.appendChild(table);
    return card;
  }

  class WorkflowDetails extends window.ApprModule {

    get defaultLabel() { return 'Workflow details'; }

    renderBody(body) {
      var task = CTX.task || {};

      /* ------------------------------ due dates ------------------------------ */
      var dates = el('dl', 'wd-dates');
      [['Document due date', task.documentDueDate], ['Task due date', task.dueDate]]
        .forEach(function (d) {
          var row = el('div', 'wd-dates__row');
          row.appendChild(el('dt', 'wd-dates__label', d[0]));
          row.appendChild(el('dd', 'wd-dates__value', fmtDate(d[1]) || '—'));
          dates.appendChild(row);
        });
      body.appendChild(dates);

      /* -------------------------------- steps -------------------------------- */
      var list = el('div', 'wd-steps');

      STEPS.forEach(function (s, i) {
        var hasBody = !!(s.events && s.events.length) || !!s.approvers;
        var open = s.state === 'current';

        var card = el('section', 'wd-step');
        var head = el('div', 'wd-step__head');

        var btn = el('button', 'ga-button ga-button--ghost ga-button--icon-only wd-step__toggle');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Step ' + (i + 1));
        if (!hasBody) { btn.disabled = true; }

        var titles = el('div', 'wd-step__titles');
        titles.appendChild(el('span', 'wd-step__name', 'Step ' + (i + 1)));
        titles.appendChild(el('span', 'wd-step__summary', s.summary));

        head.appendChild(btn);
        head.appendChild(titles);
        head.appendChild(tag(s.state));
        card.appendChild(head);

        var inner = null;
        if (hasBody) {
          inner = el('div', 'wd-step__body');
          inner.id = 'wd-step-' + (i + 1);
          btn.setAttribute('aria-controls', inner.id);
          (s.events || []).forEach(function (e) { inner.appendChild(eventCard(e)); });
          if (s.approvers) { inner.appendChild(currentCard(s)); }
          card.appendChild(inner);
        }

        function sync() {
          card.classList.toggle('wd-step--open', open);
          btn.replaceChildren(I(open ? 'chevron-up' : 'chevron-down', '16'));
          if (inner) {
            inner.hidden = !open;
            btn.setAttribute('aria-expanded', String(open));
          }
        }
        sync();

        if (hasBody) {
          btn.addEventListener('click', function () { open = !open; sync(); });
        }

        list.appendChild(card);
      });

      body.appendChild(list);
    }
  }

  if (!customElements.get('appr-workflow-details')) {
    customElements.define('appr-workflow-details', WorkflowDetails);
  }
})();

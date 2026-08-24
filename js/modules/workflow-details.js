/* =========================================================================
   Module — workflow-details   <appr-workflow-details>

   Where the document is in its approval workflow: the step chain, who acted
   or is expected to act, when it started, and a row into the current step.

   FIDELITY — READ THIS BEFORE TRUSTING THE VISUALS
   Structure is taken from the 2026-08-24 staging capture: three chain
   segments (Approval initiated -> Unknown -> A) with a caption under each, a
   timestamp line, then a "Current workflow step" row. That much is observed.

   The segment SHAPE and COLOURS are approximated from a screenshot, not
   measured — staging could not be re-opened to read computed styles (the app
   gates on window.outerWidth, which reports 0 under automation). Colours are
   picked from Gaia's raw scale as the nearest match to what the capture shows,
   the same way the overdue red in my-tasks.css uses --ga-color-red-60 rather
   than a semantic token. Re-measure before calling this pixel-faithful.

   "Workflow history" is a SEPARATE module (the user's call, 2026-08-24) even
   though the product renders it as a second row inside this panel.

   Chrome comes from ApprModule (js/modules/module-shell.js).
   ========================================================================= */

(function () {
  'use strict';

  var I = window.ApprIcon;

  /* Canonical Lucide */
  var CHECK     = { paths: ['M20 6 9 17l-5-5'] };
  var HOURGLASS = { paths: ['M5 22h14', 'M5 2h14',
                            'M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22',
                            'M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2'] };
  var LOCK      = { rects: [[3, 11, 18, 11, 2]], paths: ['M7 11V7a5 5 0 0 1 10 0v4'] };
  var CLOCK     = { circles: [[12, 12, 10]], polylines: ['12 6 12 12 16 14'] };
  var CHEVRON_R = { paths: ['m9 18 6-6-6-6'] };

  /* Synthetic Norwegian data, consistent with the bundled claim PDF. */
  var STEPS = [
    { state: 'done',    icon: CHECK,     label: 'Approval initiated',
      caption: [{ link: 'Ingrid Halvorsen' }, { text: ' activated from Visma.net Expense' }] },
    { state: 'current', icon: HOURGLASS,  label: 'Department approval',
      caption: [{ text: 'Pending approval by ' }, { link: 'Kjell Wangen' }] },
    { state: 'future',  icon: LOCK,       label: 'Finance',
      caption: [{ text: 'Tasks for ' }, { link: 'Marit Solheim', italic: true }] }
  ];

  var STARTED = '21/08/2026 at 14:55';

  class WorkflowDetails extends window.ApprModule {

    get defaultLabel() { return 'Workflow details'; }

    renderBody(body) {
      /* ------------------------------ chain ------------------------------ */
      var chain = document.createElement('ol');
      chain.className = 'wd-chain';

      STEPS.forEach(function (s) {
        var li = document.createElement('li');
        li.className = 'wd-step wd-step--' + s.state;

        var seg = document.createElement('div');
        seg.className = 'wd-seg';
        var ic = I(s.icon, '16');
        ic.classList.add('wd-seg__icon');
        var lbl = document.createElement('span');
        lbl.className = 'wd-seg__label';
        lbl.textContent = s.label;
        seg.appendChild(ic);
        seg.appendChild(lbl);

        var cap = document.createElement('p');
        cap.className = 'wd-caption';
        s.caption.forEach(function (part) {
          if (part.link) {
            var a = document.createElement('a');
            a.className = 'ga-link wd-caption__person' + (part.italic ? ' wd-caption__person--italic' : '');
            a.href = '#';
            a.textContent = part.link;
            cap.appendChild(a);
          } else {
            cap.appendChild(document.createTextNode(part.text));
          }
        });

        li.appendChild(seg);
        li.appendChild(cap);
        chain.appendChild(li);
      });

      body.appendChild(chain);

      /* ---------------------------- started at --------------------------- */
      var when = document.createElement('p');
      when.className = 'wd-started';
      var clock = I(CLOCK, '16');
      clock.classList.add('wd-started__icon');
      when.appendChild(clock);
      when.appendChild(document.createTextNode(STARTED));
      body.appendChild(when);

      /* --------------------------- current step -------------------------- */
      var row = document.createElement('button');
      row.className = 'wd-row';
      row.type = 'button';
      var rl = document.createElement('span');
      rl.className = 'wd-row__label';
      rl.textContent = 'Current workflow step';
      var rv = document.createElement('span');
      rv.className = 'wd-row__value';
      rv.textContent = 'Department approval';
      var rc = I(CHEVRON_R, '16');
      rc.classList.add('wd-row__chevron');
      row.appendChild(rl);
      row.appendChild(rv);
      row.appendChild(rc);
      /* Stubbed: the current-step detail view is not specified. */
      row.addEventListener('click', function () {
        this.emit('appr:action', { action: 'open-current-step' });
      }.bind(this));
      body.appendChild(row);
    }
  }

  if (!customElements.get('appr-workflow-details')) {
    customElements.define('appr-workflow-details', WorkflowDetails);
  }
})();

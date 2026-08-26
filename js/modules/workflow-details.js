/* =========================================================================
   Module — workflow-details   <appr-workflow-details>

   Where the document is in its approval workflow: the step chain, who acted
   or is expected to act, when it started, and a row into the current step.

   The step chain is Gaia's PROGRESS INDICATOR, horizontal variant
   (.ga-progress-indicator--horizontal), adopted 2026-08-26. It replaced a
   hand-rolled chevron chain whose shape and colours were approximated from a
   screenshot — so that whole fidelity caveat is gone: shape, state colours,
   typography and focus behaviour now come from the design system.

   State mapping:
     completed  -> --completed   (border-success, icon-success)
     current    -> --current     (4px border-action, icon-action, + current-dot)
     future     -> --incomplete  (label in text-body, not greyed out: the step
                                  is unreached, not disabled)

   Structure still follows the 2026-08-24 staging capture: three steps with a
   caption each, a timestamp line, then a "Current workflow step" row.

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

  var CTX = window.ApprTask || {};
  var T = CTX.task || {};
  /* The requester comes from the open task; the approvers downstream are
     invented, since the real workflow was never captured. */
  var ORIGIN = T.from || 'the sending system';
  var SOURCE = T.displayApplicationTypeName || 'the sending system';

  /* `state` is the Gaia modifier suffix. Captions are plain strings now: the
     items are <button>s (Gaia gives them cursor:pointer and a focus ring), and
     an <a> cannot be nested inside a button — so the person names are no longer
     separate links and the whole step is the click target instead. */
  var STEPS = [
    { state: 'completed',  icon: CHECK,     label: 'Approval initiated',
      description: ORIGIN + ' activated from ' + SOURCE },
    { state: 'current',    icon: HOURGLASS, label: 'Department approval',
      description: 'Pending approval by Kjell Wangen' },
    { state: 'incomplete', icon: LOCK,      label: 'Finance',
      description: 'Tasks for Marit Solheim' }
  ];

  var STARTED = (CTX.fmtDate ? CTX.fmtDate(T.activatedDate) : '21/08/2026') + ' at 14:55';

  class WorkflowDetails extends window.ApprModule {

    get defaultLabel() { return 'Workflow details'; }

    renderBody(body) {
      /* ------------------------------ chain ------------------------------
       Gaia's horizontal progress indicator. Markup order per the package:
       __indicator (holds the .ga-icon) > __content > __label > __label-text,
       then __description; __current-dot only on the current step. */
    var chain = document.createElement('div');
    chain.className = 'ga-progress-indicator ga-progress-indicator--horizontal wd-chain';

    STEPS.forEach(function (s) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'ga-progress-indicator__item ga-progress-indicator__item--' + s.state;
      if (s.state === 'current') { item.setAttribute('aria-current', 'step'); }

      var ind = document.createElement('span');
      ind.className = 'ga-progress-indicator__indicator';
      /* .ga-icon carries no size in this package — the wrapper must set it. */
      var icon = document.createElement('span');
      icon.className = 'ga-icon';
      icon.appendChild(I(s.icon, '16'));
      ind.appendChild(icon);

      var content = document.createElement('span');
      content.className = 'ga-progress-indicator__content';

      var label = document.createElement('span');
      label.className = 'ga-progress-indicator__label';
      var text = document.createElement('span');
      text.className = 'ga-progress-indicator__label-text';
      text.textContent = s.label;
      label.appendChild(text);

      var desc = document.createElement('span');
      desc.className = 'ga-progress-indicator__description';
      desc.textContent = s.description;

      content.appendChild(label);
      content.appendChild(desc);

      item.appendChild(ind);
      item.appendChild(content);

      if (s.state === 'current') {
        var dot = document.createElement('span');
        dot.className = 'ga-progress-indicator__current-dot';
        item.appendChild(dot);
      }

      /* Stubbed: jumping to a workflow step is not specified. */
      item.addEventListener('click', function () {
        this.emit('appr:action', { action: 'open-step', step: s.label });
      }.bind(this));

      chain.appendChild(item);
    }, this);

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

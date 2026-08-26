/* =========================================================================
   Module — external-editor   <appr-external-editor>

   The document editor supplied by the sending system. In the product the
   header reads "External editor provided by Visma.net Expense", so the
   provider is an attribute.

   !! BODY INVENTED — NEEDS REVIEW !!
   Observed on 2026-08-24: the panel exists, its title names the provider, and
   its header carried two buttons — "Place at the side" and "Place at the
   bottom". Nothing else: the panel sat full-width 1648x1063 far below the
   fold and its contents were never in view.

   The side/bottom buttons are deliberately NOT reproduced: we settled that
   external-editor is just another module in a stack (user's call 2026-08-24),
   so placement is the shell's Move actions instead of a bespoke pair here.

   What IS documented (gaia-ds -> Approval): editing basic document info where
   enabled, and since June 2026 the editor "can be detached into a separate
   browser window". So detaching is offered as a menu action — stubbed, since
   the detached window's design is unspecified.

   The body renders a labelled surface standing in for the embedded editor,
   rather than a fake form: inventing the sending system's own UI would be
   worse than admitting we have not seen it.
   ========================================================================= */

(function () {
  'use strict';

  var I = window.ApprIcon;
  var EXTERNAL = { paths: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'] };

  class ExternalEditor extends window.ApprModule {

    static get observedAttributes() { return ['label', 'collapsed', 'provider']; }

    get provider() {
      if (this.hasAttribute('provider')) { return this.getAttribute('provider'); }
      var t = (window.ApprTask || {}).task;
      return (t && t.displayApplicationTypeName) || 'the sending system';
    }
    get defaultLabel() { return 'External editor provided by ' + this.provider; }

    secondaryActions() {
      return [{ id: 'detach', label: 'Open editor in a new window' }];
    }

    onAction(id) {
      /* Stubbed — the detached editor window is not specified. */
      if (id === 'detach') { this.emit('appr:detach-editor', { provider: this.provider }); }
    }

    renderBody(body) {
      var surface = document.createElement('div');
      surface.className = 'xe-surface';

      var icon = I(EXTERNAL, '24');
      icon.classList.add('xe-surface__icon');

      var title = document.createElement('p');
      title.className = 'xe-surface__title';
      title.textContent = 'Editor supplied by ' + this.provider;

      var note = document.createElement('p');
      note.className = 'xe-surface__note';
      note.textContent = 'The sending system renders its own editor here. Its interface has not been captured, so this module shows a placeholder rather than an imitation.';

      surface.appendChild(icon);
      surface.appendChild(title);
      surface.appendChild(note);
      body.appendChild(surface);
    }
  }

  if (!customElements.get('appr-external-editor')) {
    customElements.define('appr-external-editor', ExternalEditor);
  }
})();

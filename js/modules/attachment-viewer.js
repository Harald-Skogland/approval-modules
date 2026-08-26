/* =========================================================================
   Module — attachment-viewer   <appr-attachment-viewer>

   Header, collapse, context menu and the move actions all come from
   ApprModule (js/modules/module-shell.js). This file adds only what is
   specific to this module: the document surface, and the one extra menu
   action below the divider.

   Attributes
     src        Document URL. Defaults to the bundled sample claim.
     label      Header title. Defaults to "Attachment viewer".
     collapsed  Present = body hidden, header height only.
     compact    Present = denser placement (see the CSS). For My tasks later.
     data-fill  Present = stretch to fill a host that provides a height.

   Maximize / Reset (the two arrow buttons) were removed on 2026-08-24. The
   host's appr:maximize / appr:reset listeners in js/task-detail.js are left in
   place, unused, so the behaviour is one line away if it is wanted back.
   ========================================================================= */

(function () {
  'use strict';

  /* One document per type, so an Invoice task no longer shows an expense claim.
     Rendered from assets/documents/*.source.html — see the README. */
  var DOCS = {
    'Invoice':              'assets/documents/invoice.pdf',
    'Expense claim':        'assets/documents/expense-claim.pdf',
    'Purchase order':       'assets/documents/purchase-order.pdf',
    'Timesheet':            'assets/documents/timesheet.pdf',
    'Absence':              'assets/documents/absence.pdf',
    'Voucher':              'assets/documents/voucher.pdf',
    'Supplier information': 'assets/documents/supplier-information.pdf'
  };
  var FALLBACK = 'assets/documents/invoice.pdf';

  class AttachmentViewer extends window.ApprModule {

    static get observedAttributes() { return ['label', 'collapsed', 'src']; }

    get defaultLabel() { return 'Attachment viewer'; }

    /* An explicit src always wins; otherwise the open task's type picks it. */
    get src() {
      if (this.hasAttribute('src')) { return this.getAttribute('src'); }
      var t = (window.ApprTask || {}).task;
      return (t && DOCS[t.documentType]) || FALLBACK;
    }

    secondaryActions() {
      return [{ id: 'download', label: 'Download all attachments' }];
    }

    onAction(id) {
      /* Stubbed like the rest of the prototype's outbound actions — the
         appr:action event the shell emits is the hook a host would use. */
      if (id === 'download') { this.emit('appr:download-all'); }
    }

    renderBody(body) {
      if (!this.src) {
        body.classList.add('am-body--empty');
        body.textContent = 'No attachments on this task.';
        return;
      }
      /* <embed> is what the product uses — it hands the document to the
         browser's own PDF viewer, toolbar and all. That chrome is not Gaia
         and cannot be restyled; reproducing the product means keeping it. */
      var embed = document.createElement('embed');
      embed.className = 'am-embed';
      embed.setAttribute('type', 'application/pdf');
      embed.setAttribute('src', this.src);
      embed.setAttribute('aria-label', this.label + ' document');
      body.appendChild(embed);
    }
  }

  if (!customElements.get('appr-attachment-viewer')) {
    customElements.define('appr-attachment-viewer', AttachmentViewer);
  }
})();

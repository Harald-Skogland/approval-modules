/* =========================================================================
   Module — voucher-details   <appr-voucher-details>

   The document's own data. In the live product this panel is titled per
   document type — "Expense claim details" for the expense claim captured on
   2026-08-24 — so the title is an attribute, not a constant, and the module
   keeps the generic name from the component list.

   Field set and order are taken from that capture:
     Description  (full width)
     Claimant | Employee code | Expense date
     Document ID | Amount

   Data is synthetic Norwegian, matching assets/expense-claim-4907214.pdf so
   the module and the document on screen agree. Amounts follow the product's
   format — space thousands, dot decimals, currency suffix.

   Chrome comes from ApprModule (js/modules/module-shell.js).
   ========================================================================= */

(function () {
  'use strict';

  /* FIELD SETS PER DOCUMENT TYPE.
     The product titles this panel per type ("Expense claim details" for the
     capture on 2026-08-24) and an Invoice plainly has a supplier where an
     expense claim has a claimant. The exact per-type field list was never
     captured, so each set below is derived from the fields data.js actually
     holds for that type — informed, but not measured. Re-check against the
     product before treating any of them as authoritative.

     Each entry is [label, key] where key is either a task field name or a
     function of the task. `wide` spans the row. */
  var COMMON_TAIL = [
    ['Company',     function (t) { return t.companyName; }],
    ['Document ID', function (t) { return t.displayId; }],
    ['Amount',      function (t) { return CTX.fmtAmount(t.amount, t.currency); }]
  ];

  var SETS = {
    'Invoice': [
      ['Description',     'description', true],
      ['Supplier',        function (t) { return t.supplierName || t.from; }],
      ['Invoice date',    function (t) { return CTX.fmtDate(t.invoiceDate); }],
      ['Doc. due date',   function (t) { return CTX.fmtDate(t.documentDueDate); }]
    ],
    'Expense claim': [
      ['Description',     'description', true],
      ['Claimant',        function (t) { return t.requesterName || t.from; }],
      ['Expense date',    function (t) { return CTX.fmtDate(t.createdDate); }],
      ['Task due date',   function (t) { return CTX.fmtDate(t.dueDate); }]
    ],
    'Purchase order': [
      ['Description',     'description', true],
      ['Supplier',        function (t) { return t.supplierName || t.from; }],
      ['Requested by',    function (t) { return t.requesterName || '—'; }],
      ['Order date',      function (t) { return CTX.fmtDate(t.createdDate); }]
    ],
    'Timesheet': [
      ['Description',     'description', true],
      ['Employee',        function (t) { return t.requesterName || t.from; }],
      ['Period ends',     function (t) { return CTX.fmtDate(t.documentDueDate); }],
      ['Submitted',       function (t) { return CTX.fmtDate(t.createdDate); }]
    ],
    'Absence': [
      ['Description',     'description', true],
      ['Employee',        function (t) { return t.requesterName || t.from; }],
      ['Absence from',    function (t) { return CTX.fmtDate(t.createdDate); }],
      ['Absence to',      function (t) { return CTX.fmtDate(t.documentDueDate); }]
    ],
    'Voucher': [
      ['Description',     'description', true],
      ['Registered by',   function (t) { return t.lastChangedByUserName || t.from; }],
      ['Voucher date',    function (t) { return CTX.fmtDate(t.createdDate); }],
      ['Process',         'idProcess']
    ],
    'Supplier information': [
      ['Description',     'description', true],
      ['Supplier',        function (t) { return t.supplierName || t.from; }],
      ['Requested by',    function (t) { return t.requesterName || '—'; }],
      ['Changed',         function (t) { return CTX.fmtDate(t.createdDate); }]
    ]
  };

  /* Anything not in SETS falls back to a type-neutral set rather than showing
     expense-claim labels for an unrelated document. */
  var GENERIC = [
    ['Description', 'description', true],
    ['From',        'from'],
    ['Received',    function (t) { return CTX.fmtDate(t.createdDate); }],
    ['Task due',    function (t) { return CTX.fmtDate(t.dueDate); }]
  ];

  var CTX = window.ApprTask || {};

  function valueOf(task, key) {
    var v = typeof key === 'function' ? key(task) : task[key];
    return (v === null || v === undefined || v === '') ? '—' : String(v);
  }

  class VoucherDetails extends window.ApprModule {

    /* Titled per type, as the product does. */
    get defaultLabel() {
      var t = CTX.task;
      return t && t.documentType ? t.documentType + ' details' : 'Document details';
    }

    renderBody(body) {
      var task = CTX.task;
      if (!task) {
        var none = document.createElement('p');
        none.className = 'vd-empty';
        none.textContent = 'No task open.';
        body.appendChild(none);
        return;
      }

      var fields = (SETS[task.documentType] || GENERIC).concat(COMMON_TAIL);

      var grid = document.createElement('dl');
      grid.className = 'vd-grid';

      fields.forEach(function (f) {
        var value = valueOf(task, f[1]);

        var cell = document.createElement('div');
        cell.className = 'vd-field' + (f[2] ? ' vd-field--wide' : '');

        var dt = document.createElement('dt');
        dt.className = 'vd-label';
        dt.textContent = f[0];

        var dd = document.createElement('dd');
        dd.className = 'vd-value';
        dd.textContent = value;
        dd.title = value;          /* the product truncates long values */

        cell.appendChild(dt);
        cell.appendChild(dd);
        grid.appendChild(cell);
      });

      body.appendChild(grid);
    }
  }

  if (!customElements.get('appr-voucher-details')) {
    customElements.define('appr-voucher-details', VoucherDetails);
  }
})();

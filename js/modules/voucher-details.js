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

  /* Same claim as the bundled PDF. */
  var FIELDS = [
    { label: 'Description',   value: 'Kundemøte Bergen – reise og opphold', wide: true },
    { label: 'Claimant',      value: 'Ingrid Halvorsen (ingrid.halvorsen@nordvikbygg.no)' },
    { label: 'Employee code', value: '47' },
    { label: 'Expense date',  value: '21/08/2026' },
    { label: 'Document ID',   value: '4907214' },
    { label: 'Amount',        value: '4 812.50 NOK' }
  ];

  class VoucherDetails extends window.ApprModule {

    get defaultLabel() { return 'Expense claim details'; }

    renderBody(body) {
      var grid = document.createElement('dl');
      grid.className = 'vd-grid';

      FIELDS.forEach(function (f) {
        var cell = document.createElement('div');
        cell.className = 'vd-field' + (f.wide ? ' vd-field--wide' : '');

        var dt = document.createElement('dt');
        dt.className = 'vd-label';
        dt.textContent = f.label;

        var dd = document.createElement('dd');
        dd.className = 'vd-value';
        dd.textContent = f.value;
        dd.title = f.value;          /* the product truncates long values */

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

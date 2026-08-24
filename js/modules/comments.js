/* =========================================================================
   Module — comments   <appr-comments>

   Comments on the document. The count sits in the header title, matching the
   product's "Comments 0".

   !! PARTLY INVENTED — NEEDS REVIEW !!
   Observed on 2026-08-24: the panel exists, is titled "Comments 0", and sits
   in the left column. That is ALL that was observed — the body was empty at a
   count of zero, so the comment row layout and the compose affordance were
   never seen.

   What IS documented (gaia-ds -> Approval) and drives this build:
     - a comment is "a written note on the document, visible to all approvers
       in the workflow and the System Administrator. Not private."
     - a comment is MANDATORY on Reject, and required on Forward, Request
       review and Postpone
     - user Preferences has a "Comment window on approval" toggle that
       auto-opens a comment pop-up when approving

   Because a comment is mandatory to several actions, a compose affordance is
   assumed to belong here. That assumption is the invented part. The visible
   warning that comments are not private is taken straight from the docs.

   Chrome comes from ApprModule (js/modules/module-shell.js).
   ========================================================================= */

(function () {
  'use strict';

  /* Start empty, as the captured task was — the count in the title then
     matches the product's "Comments 0" exactly. Added comments are local to
     the page; nothing is persisted. */
  var SEED = [];

  class Comments extends window.ApprModule {

    /* Title carries the count, as the product does. */
    get defaultLabel() { return 'Comments ' + this._count(); }

    _count() { return (this._entries || SEED).length; }

    _retitle() {
      var t = this.querySelector('.apm-title');
      if (t) { t.textContent = this.getAttribute('label') || this.defaultLabel; }
    }

    renderBody(body) {
      if (!this._entries) { this._entries = SEED.slice(); }

      this._list = document.createElement('ol');
      this._list.className = 'cm-list';
      body.appendChild(this._list);

      this._empty = document.createElement('p');
      this._empty.className = 'cm-empty';
      this._empty.textContent = 'No comments on this document yet.';
      body.appendChild(this._empty);

      /* -------------------------------- compose ------------------------- */
      var form = document.createElement('form');
      form.className = 'cm-compose';

      var ta = document.createElement('textarea');
      ta.className = 'ga-text-area cm-compose__field';
      ta.rows = 3;
      ta.placeholder = 'Add a comment…';
      ta.setAttribute('aria-label', 'Add a comment');

      var foot = document.createElement('div');
      foot.className = 'cm-compose__foot';

      var warn = document.createElement('p');
      warn.className = 'cm-compose__warning';
      warn.textContent = 'Visible to all approvers in the workflow and the System Administrator.';

      var submit = document.createElement('button');
      submit.className = 'ga-button ga-button--primary cm-compose__submit';
      submit.type = 'submit';
      submit.textContent = 'Add comment';
      submit.disabled = true;

      ta.addEventListener('input', function () { submit.disabled = !ta.value.trim(); });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = ta.value.trim();
        if (!text) { return; }
        this._entries.push({ author: 'Harald Skogland', when: 'just now', text: text });
        ta.value = '';
        submit.disabled = true;
        this._paint();
        this._retitle();
        this.emit('appr:action', { action: 'comment-added' });
      }.bind(this));

      foot.appendChild(warn);
      foot.appendChild(submit);
      form.appendChild(ta);
      form.appendChild(foot);
      body.appendChild(form);

      this._paint();
    }

    _paint() {
      this._list.textContent = '';
      this._empty.hidden = this._entries.length > 0;

      this._entries.forEach(function (c) {
        var li = document.createElement('li');
        li.className = 'cm-item';

        var head = document.createElement('p');
        head.className = 'cm-item__head';
        var who = document.createElement('span');
        who.className = 'cm-item__author';
        who.textContent = c.author;
        var when = document.createElement('span');
        when.className = 'cm-item__when';
        when.textContent = c.when;
        head.appendChild(who);
        head.appendChild(when);

        var text = document.createElement('p');
        text.className = 'cm-item__text';
        text.textContent = c.text;

        li.appendChild(head);
        li.appendChild(text);
        this._list.appendChild(li);
      }, this);
    }
  }

  if (!customElements.get('appr-comments')) {
    customElements.define('appr-comments', Comments);
  }
})();

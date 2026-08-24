/* =========================================================================
   Approval — My tasks : task fixtures

   Synthetic Norwegian data. The *shape* is taken from the live staging grid
   (same 25 field ids, same date spread, same amount distribution, same
   Overdue/Later split) but every name, description and number is invented —
   staging holds QA junk and real colleague names, neither of which belongs
   in a prototype.

   Deterministic: a seeded PRNG, so the table is identical on every reload.
   ========================================================================= */

var TODAY = new Date(2026, 7, 21); // 21 Aug 2026 — matches the staging snapshot

var DOC_TYPES = [
  'Invoice',
  'Expense claim',
  'Purchase order',
  'Timesheet',
  'Absence',
  'Voucher',
  'Supplier information'
];

var SUPPLIERS = [
  'Ahlsell Norge AS', 'Elkjøp Bedrift', 'Felleskjøpet Agri', 'Rørkjøp AS',
  'Tools Norge AS', 'Optimera AS', 'Onninen AS', 'Würth Norge AS',
  'Byggmakker Handel AS', 'Brødrene Dahl AS', 'Moelven Wood AS', 'Glava AS',
  'Norsk Gjenvinning AS', 'Coor Service Management', 'ISS Facility Services',
  'Kontorleverandøren AS', 'Atea ASA', 'Dustin Norway AS', 'Telenor Norge AS',
  'Circle K Norge AS', 'Uno-X Mobility AS', 'Scandic Hotels AS',
  'Thon Hotels AS', 'Sodexo Norge AS', 'Bring Logistics AS'
];

var PEOPLE = [
  'Kari Nordmann', 'Ola Hansen', 'Ingrid Bakke', 'Lars Solberg', 'Mette Vik',
  'Jonas Berg', 'Silje Haugen', 'Anders Lie', 'Nina Fossum', 'Erik Dahl',
  'Camilla Ruud', 'Håkon Strand', 'Tuva Moen', 'Sindre Aas', 'Marit Ødegård',
  'Petter Lund', 'Astrid Holm', 'Rune Iversen', 'Hanne Krogh', 'Terje Sæther'
];

var COMPANIES = [
  { name: 'Nordvik Bygg AS', id: 'NB-01' },
  { name: 'Fjordtek Industri AS', id: 'FT-02' },
  { name: 'Vestland Handel AS', id: 'VH-03' },
  { name: 'Solstad Eiendom AS', id: 'SE-04' },
  { name: 'VNA | ERP', id: 'VNA-01' },
  { name: 'VNA | HRM', id: 'VNA-02' },
  { name: 'DC testing', id: 'DC-01' }
];

var CURRENT_COMPANY = 'VNA | ERP';

var DESCRIPTIONS = {
  'Invoice': [
    'Kontorrekvisita mars', 'Byggevarer prosjekt Sandvika', 'Serverlisenser Q3',
    'Strøm juli 2026', 'Mobilabonnement 14 ansatte', 'Rørleggerarbeid Bergen',
    'Renhold hovedkontor', 'Frakt uke 28', 'Verktøy og festemidler',
    'Isolasjon lager B', 'Vedlikehold ventilasjon', 'Kopipapir og toner'
  ],
  'Expense claim': [
    'Reise Oslo–Bergen', 'Kundemøte Trondheim', 'Hotell Scandic Solli',
    'Taxi Gardermoen', 'Bevertning styremøte', 'Kurs prosjektledelse',
    'Parkering Aker Brygge', 'Kilometergodtgjørelse juli', 'Flybillett Stavanger'
  ],
  'Purchase order': [
    'PO#2551 Byggevarer', 'PO#2556 Verktøy', 'PO#2560 Kontormøbler',
    'PO#2564 IT-utstyr', 'PO#2571 Sikkerhetsutstyr', 'PO#2578 Arbeidsklær'
  ],
  'Timesheet': [
    'Timeliste uke 29', 'Timeliste uke 30', 'Timeliste uke 31', 'Timeliste juli 2026'
  ],
  'Absence': [
    'Ferie 03.08–14.08', 'Egenmelding 22.07', 'Permisjon 1 dag',
    'Foreldrepermisjon uke 32', 'Avspasering 07.08'
  ],
  'Voucher': [
    'Bilag 100482 omposteringer', 'Bilag 100501 avstemming', 'Bilag 100515 periodisering'
  ],
  'Supplier information': [
    'Ny leverandør: Byggmakker Handel AS', 'Endret kontonummer: Onninen AS',
    'Ny leverandør: Sodexo Norge AS'
  ]
};

var SOURCE_APPS = {
  'Invoice': 'Visma Document Center',
  'Expense claim': 'Visma.net Expense',
  'Purchase order': 'Visma.net ERP',
  'Timesheet': 'Visma.net Calendar',
  'Absence': 'Visma.net Calendar',
  'Voucher': 'Visma Business NXT',
  'Supplier information': 'Visma.net ERP'
};

/* Assignment states, exactly as they render in staging. Most rows carry none. */
var STATES = [
  [], [], [], [], [], [], [], [], [], [],
  ['Task forwarded'],
  ['Task review'],
  ['Task reassigned'],
  ['You are a substitute'],
  ['You are a substitute', 'Task review'],
  ['You are a substitute', 'Task forwarded'],
  ['You are a substitute', 'Task reassigned']
];

/* ------------------------------ helpers -------------------------------- */

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function addDays(date, days) {
  var d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d) {
  if (!d) return '';
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  return dd + '/' + mm + '/' + d.getFullYear();
}

/* Space thousands, dot decimals, currency suffix — as staging renders it. */
function fmtAmount(value, currency) {
  var parts = Math.abs(value).toFixed(2).split('.');
  var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (value < 0 ? '-' : '') + whole + '.' + parts[1] + (currency ? ' ' + currency : '');
}

/* ----------------------------- generation ------------------------------ */

function buildTasks() {
  var rnd = mulberry32(20260821);
  var pickFrom = function (arr) { return arr[Math.floor(rnd() * arr.length)]; };
  var tasks = [];

  // 198 overdue + 4 later, mirroring the staging split
  var TOTAL = 202;
  var LATER_FROM = 198;

  for (var i = 0; i < TOTAL; i++) {
    var type = pickFrom(DOC_TYPES);
    var company = pickFrom(COMPANIES);
    var isLater = i >= LATER_FROM;

    // Doc. due drives the urgency bucket
    var docDue = isLater
      ? addDays(TODAY, 3 + Math.floor(rnd() * 25))
      : addDays(TODAY, -1 - Math.floor(rnd() * 55));

    var docRec = addDays(docDue, -14 - Math.floor(rnd() * 21));
    var taskRec = addDays(docRec, Math.floor(rnd() * 6));
    var taskDue = addDays(taskRec, 5 + Math.floor(rnd() * 20));
    var invoiceDate = (type === 'Invoice' || type === 'Purchase order')
      ? addDays(docRec, -Math.floor(rnd() * 5)) : null;

    // Expense/absence/timesheet come from a person, everything else from a supplier
    var personLed = (type === 'Expense claim' || type === 'Absence' || type === 'Timesheet');
    var supplier = personLed ? '' : pickFrom(SUPPLIERS);
    var requester = personLed ? pickFrom(PEOPLE) : (rnd() < 0.55 ? pickFrom(PEOPLE) : '');

    /* Staging's 200 overdue tasks total 413 681.87 NOK — a ~2 000 NOK mean
       with a long tail. A squared draw reproduces that skew; a flat draw
       would put the mean an order of magnitude too high. */
    var amount = personLed
      ? Math.round((187 + Math.pow(rnd(), 4) * 6000) * 100) / 100
      : Math.round((240 + Math.pow(rnd(), 4) * 12000) * 100) / 100;

    var foreign = null;
    if (!personLed && rnd() < 0.08) {
      foreign = {
        currency: rnd() < 0.5 ? 'EUR' : 'SEK',
        amount: Math.round(amount / (rnd() < 0.5 ? 11.6 : 1.02) * 100) / 100
      };
    }

    var state = pickFrom(STATES);

    tasks.push({
      id: 480100 + i * 7,
      displayId: 'DOC-' + (100120 + i),
      externalId: 'EXT-' + (900000 + i * 13),
      idProcess: 'P-' + (77200 + i * 3),
      documentType: type,
      from: personLed ? requester : supplier,
      description: pickFrom(DESCRIPTIONS[type]),
      companyName: company.name,
      companyId: company.id,
      documentDueDate: docDue,
      dueDate: taskDue,
      activatedDate: taskRec,
      invoiceDate: invoiceDate,
      createdDate: docRec,
      amount: amount,
      currency: 'NOK',
      foreignAmount: foreign,
      numberOfComments: rnd() < 0.25 ? 1 + Math.floor(rnd() * 3) : 0,
      lastChangedByUserName: rnd() < 0.4 ? pickFrom(PEOPLE) : '',
      supplierName: supplier,
      requesterName: requester,
      originalAssignee: state.indexOf('You are a substitute') > -1 ? pickFrom(PEOPLE) : '',
      displayApplicationTypeName: SOURCE_APPS[type],
      state: state
    });
  }

  return tasks;
}

var TASKS = buildTasks();

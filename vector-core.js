/* Vector Core — shared operating state for Ground / Air / Maintenance / Roster.
   Persisted to localStorage so the four consoles read and write one record. */
(function () {
  var KEY = 'vector.core.v3';

  /* two operating zones. Fleet size is set by daily tonnage: an airframe lifts
     MTOW 300 kg and turns ~6 sorties a day, so 80 t/day needs ~45 airframes
     and 45 t/day needs ~26. */
  var ZONES = [
    { id: 'SOUTH', label: 'Medchal Zone', short: 'MEDCHAL', base: 'MEDCHAL', region: 'Telangana · Andhra', tons: 80, ac: 45, pre: 'LXA' },
    { id: 'NORTH', label: 'Delhi–Jaipur Zone', short: 'DELHI–JAIPUR', base: 'DELHI', region: 'NCR · Rajasthan · Punjab', tons: 45, ac: 26, pre: 'LXN' }
  ];

  var ROUTES = [
    { id: 'C-14', zone: 'SOUTH', a: 'MEDCHAL', b: 'WGL', name: 'HYD → WGL', color: '#78AAFF', km: 312, cap: 12,
      pts: [[8, 80], [22, 70], [38, 58], [56, 45], [74, 32], [92, 20]] },
    { id: 'C-21', zone: 'SOUTH', a: 'MEDCHAL', b: 'VJA', name: 'HYD → VJA', color: '#3DDC97', km: 268, cap: 10,
      pts: [[8, 80], [26, 84], [46, 83], [66, 76], [86, 68]] },
    { id: 'C-07', zone: 'SOUTH', a: 'MEDCHAL', b: 'KNR', name: 'HYD → KNR', color: '#C08CF0', km: 196, cap: 8,
      pts: [[8, 80], [16, 60], [24, 42], [36, 26], [50, 14]] },
    { id: 'N-11', zone: 'NORTH', a: 'DELHI', b: 'JAI', name: 'DEL → JAI', color: '#FAC83C', km: 268, cap: 8,
      pts: [[74, 22], [60, 34], [46, 46], [32, 58], [18, 70]] },
    { id: 'N-05', zone: 'NORTH', a: 'DELHI', b: 'AGR', name: 'DEL → AGR', color: '#FF8874', km: 233, cap: 6,
      pts: [[74, 22], [76, 38], [80, 54], [84, 68], [88, 82]] },
    { id: 'N-18', zone: 'NORTH', a: 'DELHI', b: 'CDG', name: 'DEL → CDG', color: '#78AAFF', km: 245, cap: 5,
      pts: [[74, 22], [64, 20], [52, 18], [40, 15], [28, 13]] },
    { id: 'M-01', zone: 'SOUTH', a: 'MEDCHAL', b: 'MRO-A', name: 'HYD → MRO ALPHA', color: '#FF8874', km: 44, cap: 6, mro: true,
      pts: [[8, 80], [16, 87], [23, 91], [30, 95]] },
    { id: 'M-02', zone: 'NORTH', a: 'DELHI', b: 'MRO-B', name: 'DEL → MRO BETA', color: '#FF8874', km: 38, cap: 6, mro: true,
      pts: [[74, 22], [82, 30], [88, 38], [93, 46]] }
  ];

  var HUBS = [
    { id: 'MEDCHAL', zone: 'SOUTH', lat: 17.628, lon: 78.482, label: 'Medchal Base', type: 'BASE', cap: 34, x: 8, y: 80, gcs: 'GCS-01' },
    { id: 'WGL', zone: 'SOUTH', lat: 17.978, lon: 79.594, label: 'Warangal DC', type: 'WAREHOUSE', cap: 4, x: 92, y: 20, gcs: 'GCS-02' },
    { id: 'VJA', zone: 'SOUTH', lat: 16.506, lon: 80.648, label: 'Vijayawada DC', type: 'WAREHOUSE', cap: 4, x: 86, y: 68, gcs: 'GCS-04' },
    { id: 'KNR', zone: 'SOUTH', lat: 18.438, lon: 79.128, label: 'Karimnagar Pad', type: 'WAREHOUSE', cap: 2, x: 50, y: 14, gcs: 'GCS-03' },
    { id: 'DELHI', zone: 'NORTH', lat: 28.556, lon: 77.1, label: 'Delhi NCR Base', type: 'BASE', cap: 20, x: 74, y: 22, gcs: 'GCS-11' },
    { id: 'JAI', zone: 'NORTH', lat: 26.824, lon: 75.812, label: 'Jaipur DC', type: 'WAREHOUSE', cap: 4, x: 18, y: 70, gcs: 'GCS-12' },
    { id: 'AGR', zone: 'NORTH', lat: 27.157, lon: 77.961, label: 'Agra DC', type: 'WAREHOUSE', cap: 3, x: 88, y: 82, gcs: 'GCS-13' },
    { id: 'CDG', zone: 'NORTH', lat: 30.673, lon: 76.788, label: 'Chandigarh Pad', type: 'WAREHOUSE', cap: 2, x: 28, y: 13, gcs: 'GCS-14' },
    { id: 'MRO-A', zone: 'SOUTH', lat: 17.452, lon: 78.318, label: 'MRO Hub Alpha', type: 'MRO', cap: 50, slots: 50, x: 30, y: 95, gcs: 'GCS-01' },
    { id: 'MRO-B', zone: 'NORTH', lat: 28.384, lon: 77.315, label: 'MRO Hub Beta', type: 'MRO', cap: 40, slots: 40, x: 93, y: 46, gcs: 'GCS-11' }
  ];

  var PILOTS = [
    { id: 'P1', zone: 'SOUTH', name: 'K. Raghavan', station: 'GCS-01 HYD', max: 15 },
    { id: 'P2', zone: 'SOUTH', name: 'S. Mehta', station: 'GCS-02 WGL', max: 15 },
    { id: 'P3', zone: 'SOUTH', name: 'A. de Vries', station: 'GCS-03 ENS', max: 15 },
    { id: 'P4', zone: 'SOUTH', name: 'R. Iyer', station: 'GCS-01 HYD', max: 15 },
    { id: 'P5', zone: 'SOUTH', name: 'B. Naidu', station: 'GCS-04 VJA', max: 15 },
    { id: 'P6', zone: 'SOUTH', name: 'L. Fernandes', station: 'GCS-01 HYD', max: 15 },
    { id: 'P7', zone: 'SOUTH', name: 'D. Kulkarni', station: 'GCS-02 WGL', max: 15 },
    { id: 'P8', zone: 'SOUTH', name: 'V. Prasad', station: 'GCS-03 ENS', max: 15 },
    { id: 'N1', zone: 'NORTH', name: 'H. Chaudhary', station: 'GCS-11 DEL', max: 15 },
    { id: 'N2', zone: 'NORTH', name: 'P. Grewal', station: 'GCS-12 JAI', max: 15 },
    { id: 'N3', zone: 'NORTH', name: 'M. Bakshi', station: 'GCS-11 DEL', max: 15 },
    { id: 'N4', zone: 'NORTH', name: 'T. Rathore', station: 'GCS-14 CDG', max: 15 },
    { id: 'N5', zone: 'NORTH', name: 'S. Ahluwalia', station: 'GCS-12 JAI', max: 15 }
  ];

  /* max payload per airframe */
  var MTOW = 300;

  /* hours flown between scheduled checks, and the concession Maintenance may grant */
  var CHECK_H = 600;
  var EXTEND_H = 50;

  var SOURCES = {
    API:    { label: 'API',     color: '#78AAFF' },
    PORTAL: { label: 'PORTAL',  color: '#3DDC97' },
    PLANNER:{ label: 'PLANNER', color: '#C08CF0' }
  };

  var EXT_POOL = [
    { src: 'PORTAL', cust: 'Yashoda Blood Bank', from: 'MEDCHAL', to: 'WGL', kg: 62,  type: 'COLD CHAIN', win: '07:10–07:50' },
    { src: 'PORTAL', cust: 'Apollo Labs Warangal', from: 'MEDCHAL', to: 'WGL', kg: 48, type: 'COLD CHAIN', win: '07:15–08:00' },
    { src: 'API',    cust: 'Delhivery B2B', from: 'MEDCHAL', to: 'VJA', kg: 135, type: 'DRY', win: '07:20–08:10' },
    { src: 'API',    cust: 'Bosch Spares Desk', from: 'MEDCHAL', to: 'VJA', kg: 96,  type: 'DRY', win: '07:25–08:15' },
    { src: 'PORTAL', cust: 'NIMS Pathology', from: 'WGL', to: 'MEDCHAL', kg: 74, type: 'COLD CHAIN', win: '08:00–08:40' },
    { src: 'API',    cust: 'Telangana Civil Supplies', from: 'VJA', to: 'MEDCHAL', kg: 118, type: 'DRY', win: '08:05–08:45' },
    { src: 'API',    cust: 'Karimnagar Dist. Hospital', from: 'KNR', to: 'MEDCHAL', kg: 54, type: 'COLD CHAIN', win: '07:40–08:20' },
    { src: 'PORTAL', cust: 'Sri Sai Diagnostics', from: 'MEDCHAL', to: 'KNR', kg: 41, type: 'COLD CHAIN', win: '07:30–08:10' },
    { src: 'API',    cust: 'Ramky Industrial Spares', from: 'WGL', to: 'VJA', kg: 88, type: 'DRY', win: '08:10–09:00' },
    { src: 'PORTAL', cust: 'Kamineni Transfusion Unit', from: 'KNR', to: 'WGL', kg: 36, type: 'COLD CHAIN', win: '07:50–08:35' },
    { src: 'API',    cust: 'Maruti Vendor Desk', from: 'DELHI', to: 'JAI', kg: 142, type: 'DRY', win: '07:05–07:55' },
    { src: 'PORTAL', cust: 'Fortis Transplant Unit', from: 'DELHI', to: 'JAI', kg: 58, type: 'COLD CHAIN', win: '07:10–07:45' },
    { src: 'API',    cust: 'Jaipur Gem Exchange', from: 'JAI', to: 'DELHI', kg: 24, type: 'DEFENCE', win: '07:40–08:20' },
    { src: 'PORTAL', cust: 'SN Medical College', from: 'AGR', to: 'DELHI', kg: 66, type: 'COLD CHAIN', win: '08:00–08:40' },
    { src: 'API',    cust: 'Hero Parts Hub', from: 'DELHI', to: 'CDG', kg: 118, type: 'DRY', win: '07:20–08:05' },
    { src: 'PORTAL', cust: 'PGIMER Blood Bank', from: 'CDG', to: 'DELHI', kg: 44, type: 'COLD CHAIN', win: '07:55–08:35' },
    { src: 'API',    cust: 'Rajasthan Civil Supplies', from: 'JAI', to: 'AGR', kg: 96, type: 'DRY', win: '08:10–09:00' }
  ];

  /* build each zone's fleet: a quarter airborne across its corridors, the rest
     on stands at base and spokes, two airframes in maintenance per zone. */
  function buildFleet() {
    var out = [];
    ZONES.forEach(function (z) {
      var corr = ROUTES.filter(function (r) { return r.zone === z.id; });
      var pil = PILOTS.filter(function (p) { return p.zone === z.id; });
      var flying = Math.round(z.ac * 0.66);
      for (var i = 0; i < z.ac; i++) {
        var cs = z.pre + '-' + (1000 + i * 37 + (z.id === 'NORTH' ? 400 : 0));
        var cold = i % 3 === 0;
        var pod = (cold ? 'CC-' : 'DR-') + (100 + i * 7);
        var hrs = (i * 53) % CHECK_H;
        if (i < flying) {
          var r = corr[i % corr.length];
          var dir = i % 2 === 0 ? 1 : -1;
          var loaded = dir > 0;
          out.push({ cs: cs, zone: z.id, r: r.id, p: dir > 0 ? 0.14 + (i % 5) * 0.15 : 0.86 - (i % 5) * 0.15,
            dir: dir, v: 0.00042 + (i % 5) * 0.000025, alt: 1600 + (i % 8) * 200, tgt: 1600 + (i % 8) * 200,
            pilot: pil[i % pil.length].id, pod: pod, kg: loaded ? 180 + (i % 5) * 24 : 0,
            state: 'CRUISE', at: null, dest: dir > 0 ? r.b : r.a, hold: 0, empty: !loaded,
            hrs: hrs, due: CHECK_H, mx: hrs > CHECK_H - 50 ? 'DUE SOON' : 'IN SERVICE', item: null });
        } else if (i < flying + 2) {
          out.push({ cs: cs, zone: z.id, r: null, p: 0, dir: 1, v: 0.00045, alt: 0, tgt: 0, pilot: null,
            pod: null, kg: 0, state: 'MAINT', at: (mroOf(z.id) || {}).id || z.base, dest: null,
            hold: 0, empty: true, hrs: CHECK_H, due: CHECK_H, mx: 'GROUNDED',
            item: 'ROTOR INSPECTION', mroT: 0 });
        } else {
          var spokes = corr.map(function (c) { return c.b; });
          var at = i % 4 === 0 ? spokes[i % spokes.length] : z.base;
          out.push({ cs: cs, zone: z.id, r: null, p: 0, dir: 1, v: 0.00045, alt: 0, tgt: 0, pilot: null,
            pod: pod, kg: 0, state: 'GROUND', at: at, dest: null, hold: 0, empty: true,
            hrs: hrs, due: CHECK_H, mx: hrs > CHECK_H - 50 ? 'DUE SOON' : 'IN SERVICE', item: null });
        }
      }
    });
    return out;
  }

  function seed() {
    return {
      t: 0,
      seq: 100,
      zone: 'SOUTH',
      intake: [
        { id: 'REQ-4480', src: 'API', cust: 'Delhivery B2B', from: 'MEDCHAL', to: 'VJA', kg: 135, type: 'DRY', win: '07:20–08:10', state: 'NEW' },
        { id: 'REQ-4481', src: 'PORTAL', cust: 'Yashoda Blood Bank', from: 'MEDCHAL', to: 'WGL', kg: 62, type: 'COLD CHAIN', win: '07:10–07:50', state: 'NEW' }
      ],
      fleet: buildFleet(),
      demands: [
        { id: 'REQ-4471', from: 'MEDCHAL', to: 'WGL', kg: 268, type: 'COLD CHAIN', win: '06:40–07:20', state: 'OPEN', ac: null, eta: null },
        { id: 'REQ-4472', from: 'MEDCHAL', to: 'VJA', kg: 240, type: 'DRY', win: '06:50–07:40', state: 'OPEN', ac: null, eta: null },
        { id: 'REQ-4473', from: 'KNR', to: 'MEDCHAL', kg: 180, type: 'DEFENCE', win: '07:00–07:30', state: 'OPEN', ac: null, eta: null }
      ],
      inbox: [],
      events: [],
      log: [
        { src: 'AI', text: 'Orchestrator online · 2 zones, 6 corridors, 8 hubs, 71 aircraft', c: '#C08CF0' }
      ]
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.fleet) { if (!s.intake) s.intake = []; normalise(s); return s; }
      }
    } catch (e) {}
    var s = seed();
    /* a fresh seed goes through the same reconciliation as stored state, so the
       maintenance hub, intake board and utilisation open populated */
    normalise(s);
    save(s);
    return s;
  }

  /* backfill zone stamps on state written by an older build, and release any
     aircraft left holding without an open event to resolve it */
  function normalise(s) {
    s.fleet.forEach(function (a, i) {
      if (a.hrs == null) a.hrs = (i * 53) % CHECK_H;
      if (!a.due) a.due = CHECK_H;
      if (!a.mx) a.mx = a.state === 'MAINT' ? 'GROUNDED' : (a.due - a.hrs <= 50 ? 'DUE SOON' : 'IN SERVICE');
    });
    (s.events || []).forEach(function (e) {
      if (!e.zone) e.zone = acZone(s, e.cs) || 'SOUTH';
    });
    (s.inbox || []).forEach(function (n) {
      if (!n.zone) n.zone = (n.payload && n.payload.cs ? acZone(s, n.payload.cs) : null) ||
        (n.payload && n.payload.hub ? zoneOf(n.payload.hub) : null) || 'SOUTH';
    });
    var openCs = {};
    (s.events || []).forEach(function (e) { if (e.state === 'OPEN') openCs[e.cs] = 1; });
    s.fleet.forEach(function (a) {
      if (a.hold && !openCs[a.cs]) { a.hold = 0; if (a.state === 'HOLD') a.state = 'CRUISE'; }
    });
    s.inbox.forEach(function (n) {
      if (n.state === 'PENDING' && n.kind === 'WITHDRAW') n.state = 'FILED';
    });

    /* grounded airframes live in the maintenance hub, not on an operational stand */
    s.fleet.forEach(function (a) {
      if (a.state !== 'MAINT') return;
      var mro = mroOf(a.zone || 'SOUTH');
      if (mro && a.at !== mro.id) { a.ferried = a.at; a.at = mro.id; }
      if (a.mroT == null) a.mroT = 0;
      a.mx = 'GROUNDED';
    });

    /* the inverse: a flying tail must never carry a hub flag */
    s.fleet.forEach(function (a) {
      if (a.state === 'MAINT') return;
      if (a.mx !== 'GROUNDED' && a.mx !== 'FERRY-IN') return;
      var left = (a.due || CHECK_H) - (a.hrs || 0);
      a.mx = left <= 0 ? 'WITHDRAW' : (left <= 50 ? 'DUE SOON' : 'IN SERVICE');
    });

    /* the client intake board should never open empty: top it up to three
       waiting requests so triage always has something on it */
    if (!s.intake) s.intake = [];
    for (var q = 0; q < 6 && s.intake.length < 3; q++) intakeArrive(s, true);

    /* in-trail spacing: state written before the rule existed can have six
       aircraft stacked on one point. Re-space them and give each a cruise
       variance so a pair cannot fly locked together. */
    var lanes = {};
    s.fleet.forEach(function (a) {
      if (a.state === 'GROUND' || a.state === 'MAINT' || !a.r) return;
      var r = route(a.r);
      if (!r) return;
      var key = a.r + '|' + a.dir;
      lanes[key] = lanes[key] || [];
      var step = (MIN_TRAIL_KM * 1.15) / r.km;
      var p = a.p;
      for (var g = 0; g < 40; g++) {
        var clash = false;
        for (var i = 0; i < lanes[key].length; i++) {
          if (Math.abs(lanes[key][i] - p) * r.km < MIN_TRAIL_KM) { clash = true; break; }
        }
        if (!clash) break;
        p = a.dir > 0 ? p - step : p + step;
        if (p < 0.02) p = 0.02 + g * step;
        if (p > 0.98) p = 0.98 - g * step;
      }
      a.p = Math.max(0.01, Math.min(0.99, p));
      lanes[key].push(a.p);
      a.v = 0.00040 + (parseInt(a.cs.slice(4), 10) % 7) * 0.000018;
    });

    /* supervisory capacity: state written before the cap existed can have one
       pilot on nine aircraft. Rebuild assignments within each pilot's max. */
    var seen = {};
    s.fleet.forEach(function (a) {
      if (a.state === 'GROUND' || a.state === 'MAINT') return;
      var z = a.zone || 'SOUTH';
      var p = null;
      PILOTS.forEach(function (x) { if (x.id === a.pilot) p = x; });
      var k = a.pilot || '';
      seen[k] = (seen[k] || 0) + 1;
      if (p && p.zone === z && seen[k] <= p.max) return;
      seen[k] -= 1;
      var next = freePilot(s, z);
      if (next) { a.pilot = next.id; seen[next.id] = (seen[next.id] || 0) + 1; }
    });

    ZONES.forEach(function (z) {
      var mro = mroOf(z.id);
      if (!mro) return;
      var inHub = s.fleet.filter(function (a) { return a.state === 'MAINT' && a.at === mro.id; });
      var want = Math.round(mro.slots * 0.14);
      if (inHub.length < want) {
        var cand = s.fleet.filter(function (a) {
          return (a.zone || 'SOUTH') === z.id && a.state === 'GROUND' && a.mx !== 'EXTENDED';
        }).sort(function (p, q) { return (q.hrs || 0) - (p.hrs || 0); });
        cand.slice(0, want - inHub.length).forEach(function (a, i) {
          a.state = 'MAINT';
          a.mx = 'GROUNDED';
          a.at = mro.id;
          a.r = null; a.dest = null; a.pilot = null; a.alt = 0; a.tgt = 0; a.kg = 0;
          a.hrs = a.due || CHECK_H;
          a.item = ['AIRFRAME ' + (a.due || CHECK_H) + ' h CHECK', 'ROTOR INSPECTION',
            'AVIONICS BAY', 'BATTERY PACK B', 'TILT ACTUATOR'][i % 5];
          a.ferried = zone(z.id).base;
          a.mroT = -(60 + i * 95);
        });
      }
      /* one airframe on its way back out, so a non-revenue leg is visible */
      var out = s.fleet.filter(function (a) {
        return (a.zone || 'SOUTH') === z.id && a.rev === false &&
          a.state !== 'GROUND' && a.state !== 'MAINT';
      });
      if (!out.length) {
        var done = s.fleet.filter(function (a) { return a.state === 'MAINT' && a.at === mro.id; })
          .sort(function (p, q) { return p.mroT - q.mroT; })[0];
        if (done) closeWork(s, done.cs);
      }
    });

    /* bring each zone up to its utilisation target: state written before the
       auto-dispatch rules existed can open with most of the fleet parked */
    for (var k = 0; k < 12; k++) {
      var low = false;
      ZONES.forEach(function (z) { if (utilisation(s, z.id) < TARGET_UTIL) low = true; });
      if (!low) break;
      autoDispatch(s);
    }
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function reset() { var s = seed(); save(s); return s; }

  /* one console drives the clock at a time. Air takes it whenever open; any
     other console picks it up when the holder's heartbeat goes stale, so flight
     hours keep accruing into Maintenance with Air closed. */
  var CLOCK_KEY = KEY + '.clock';
  function clockLease(id, prefer) {
    var now = Date.now(), cur = null;
    try { cur = JSON.parse(localStorage.getItem(CLOCK_KEY) || 'null'); } catch (e) {}
    if (!cur || cur.id === id || now - cur.t > 1500 || prefer) {
      try { localStorage.setItem(CLOCK_KEY, JSON.stringify({ id: id, t: now })); } catch (e) {}
      return true;
    }
    return false;
  }
  function clockOwner() {
    try { var c = JSON.parse(localStorage.getItem(CLOCK_KEY) || 'null');
      return c && Date.now() - c.t <= 1500 ? c.id : null; } catch (e) { return null; }
  }
  /* advance by elapsed wall time if this console holds the clock */
  function runClock(id, s, lastT) {
    if (!clockLease(id, false)) return false;
    var n = Math.min(40, Math.max(1, Math.round((Date.now() - lastT) / 140)));
    while (n--) step(s);
    save(s);
    return true;
  }

  /* an airframe the orchestrator may task: not in or bound for the hub, and
     not already flagged to withdraw at its check */
  function serviceable(a) {
    if (a.state === 'MAINT' || a.mroBound) return false;
    if (a.mx === 'WITHDRAW' || a.mx === 'FERRY-IN' || a.mx === 'GROUNDED') return false;
    return (a.due || CHECK_H) - (a.hrs || 0) > 5;
  }

  function nid(s, pre) { s.seq += 1; return pre + '-' + s.seq; }

  function log(s, src, text, c) {
    s.log.unshift({ src: src, text: text, c: c || '#939BA5' });
    if (s.log.length > 8) s.log.pop();
  }

  function acZone(s, cs) {
    var z = null;
    s.fleet.forEach(function (a) { if (a.cs === cs) z = a.zone || 'SOUTH'; });
    return z;
  }

  function notify(s, to, kind, title, text, payload, color) {
    var pz = payload && payload.cs ? acZone(s, payload.cs) : null;
    if (!pz && payload && payload.hub) pz = zoneOf(payload.hub);
    s.inbox.push({ id: nid(s, 'N'), to: to, kind: kind, title: title, text: text, zone: pz || 'SOUTH',
      payload: payload || {}, state: 'PENDING', color: color || '#C08CF0' });
  }

  function route(id) { for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) return ROUTES[i]; return null; }
  function hub(id) { for (var i = 0; i < HUBS.length; i++) if (HUBS[i].id === id) return HUBS[i]; return null; }

  function pos(r, p) {
    var pts = r.pts, n = pts.length - 1;
    var t = Math.min(Math.max(p, 0), 0.9999) * n;
    var i = Math.floor(t), f = t - i;
    var a = pts[i], b = pts[Math.min(i + 1, n)];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f };
  }

  /* nearest ground station to a point. Each zone reuses the same 0–100 plan
     space, so the search must be confined to one zone's hubs. */
  function nearestGcs(pt, z) {
    var pool = z ? HUBS.filter(function (h) { return h.zone === z; }) : HUBS;
    var best = null, bd = 1e9;
    for (var i = 0; i < pool.length; i++) {
      var h = pool[i], d = Math.hypot(h.x - pt.x, h.y - pt.y);
      if (d < bd) { bd = d; best = h; }
    }
    return best ? best.gcs : (pool[0] ? pool[0].gcs : 'GCS-01');
  }

  /* occupancy of a hub: aircraft parked there + aircraft inbound to it */
  function occupancy(s, hubId) {
    var parked = 0, inbound = 0;
    s.fleet.forEach(function (a) {
      if (a.at === hubId) parked++;
      else if (a.dest === hubId && a.state !== 'GROUND') inbound++;
    });
    return { parked: parked, inbound: inbound, total: parked + inbound };
  }

  /* corridors that connect two hubs. The network is hub-and-spoke, so any
     spoke-to-spoke pair routes through Medchal as a two-leg path. */
  function routeFor(from, to) {
    for (var i = 0; i < ROUTES.length; i++) {
      var r = ROUTES[i];
      if (r.mro) continue;
      if ((r.a === from && r.b === to) || (r.a === to && r.b === from)) return r.id;
    }
    return null;
  }

  function mroRoute(z) {
    var id = null;
    ROUTES.forEach(function (r) { if (r.mro && r.zone === z) id = r.id; });
    return id;
  }

  function zoneOf(hubId) { var h = hub(hubId); return h ? h.zone : null; }
  function zone(id) { for (var i = 0; i < ZONES.length; i++) if (ZONES[i].id === id) return ZONES[i]; return ZONES[0]; }
  function baseOf(hubId) { return zone(zoneOf(hubId)).base; }

  function mroOf(z) {
    var h = null;
    HUBS.forEach(function (x) { if (x.type === 'MRO' && x.zone === z) h = x; });
    return h;
  }

  /* how full a maintenance hub is */
  function mroLoad(s, id) {
    return s.fleet.filter(function (a) { return a.state === 'MAINT' && a.at === id; }).length;
  }

  /* each zone is hub-and-spoke, so spoke-to-spoke transits its own base.
     There is no inter-zone corridor: cargo does not cross zones. */
  function path(from, to) {
    if (from === to) return { legs: [], km: 0, via: null, hops: [from] };
    if (zoneOf(from) !== zoneOf(to)) return null;
    var direct = routeFor(from, to);
    if (direct) return { legs: [direct], km: route(direct).km, via: null, hops: [from, to] };
    var hb = baseOf(from);
    var a = routeFor(from, hb), b = routeFor(hb, to);
    if (!a || !b) return null;
    return { legs: [a, b], km: route(a).km + route(b).km, via: hb, hops: [from, hb, to] };
  }

  /* the corridor an aircraft actually launches on for this demand */
  function firstLeg(from, to) {
    var p = path(from, to);
    return p && p.legs.length ? p.legs[0] : null;
  }

  function legEnd(from, to) {
    var p = path(from, to);
    return p ? (p.via || to) : to;
  }

  function mins(km) { return Math.round(km / 250 * 60); }

  /* ---- AI orchestrator: propose how to serve a demand ---- */
  function propose(s, d) {
    var out = [];
    var p = path(d.from, d.to);
    var needCold = d.type === 'COLD CHAIN';
    var legMin = p ? mins(p.km) : 60;
    var dz = zoneOf(d.from);
    var inZone = function (a) { return (a.zone || 'SOUTH') === dz; };

    // 1. aircraft that is empty now, or will be empty where it lands — reroute it
    s.fleet.forEach(function (a) {
      if (!inZone(a) || !serviceable(a) || a.state === 'GROUND' || !a.dest) return;
      var ferry = path(a.dest, d.from);
      if (!ferry) return;
      var rr = route(a.r);
      var remain = (a.dir > 0 ? (1 - a.p) : a.p) * (rr ? rr.km : 200);
      var zero = ferry.km === 0;
      var freeNow = !!a.empty;
      out.push({
        kind: 'EMPTY LEG', cs: a.cs,
        score: (zero ? 1 : 1.5) + (freeNow ? 0 : 0.2),
        eta: mins(remain + ferry.km) + ' min',
        why: (freeNow ? 'Airborne empty' : 'Airborne loaded but goes empty on arrival') +
          ' at ' + a.dest + '. ' + (zero
            ? 'It frees up exactly where this load sits, so the pickup costs no extra flight hours.'
            : 'Continuing ' + ferry.hops.join(' → ') + ' (' + ferry.km +
              ' km) fills a leg that would otherwise be flown empty.'),
        cost: zero ? 'ZERO FERRY' : '+' + ferry.km + ' KM FERRY'
      });
    });

    // 2. aircraft parked empty at another spoke, one or two corridors away
    s.fleet.forEach(function (a) {
      if (!inZone(a) || !serviceable(a) || a.state !== 'GROUND' || !a.at || a.at === d.from || a.at === baseOf(d.from)) return;
      var ferry = path(a.at, d.from);
      if (!ferry) return;
      out.push({
        kind: 'REPOSITION', cs: a.cs, score: 3.5,
        eta: (mins(ferry.km) + legMin) + ' min',
        why: 'Sitting idle at ' + a.at + '. Ferry ' + ferry.hops.join(' → ') + ' (' + ferry.km +
          ' km) to collect, which also clears a stand at a capacity-limited hub.',
        cost: 'CLEARS ' + a.at
      });
    });

    // 3. aircraft parked at the pickup hub
    s.fleet.forEach(function (a) {
      if (!inZone(a) || !serviceable(a) || a.state !== 'GROUND' || a.at !== d.from) return;
      var cold = a.pod && a.pod.indexOf('CC') === 0;
      out.push({
        kind: 'AT HUB', cs: a.cs, score: needCold && !cold ? 3 : 2,
        eta: needCold && !cold ? '28 min' : '12 min',
        why: needCold && !cold
          ? 'At ' + d.from + ' but a dry pod is fitted. Ground needs a cold-chain swap first.'
          : 'Parked at ' + d.from + ' with the right pod fitted. Fastest release.',
        cost: needCold && !cold ? '+POD SWAP' : 'READY NOW'
      });
    });

    // 4. positioning flight from base
    if (d.from !== baseOf(d.from)) {
      var hb = baseOf(d.from);
      var free = s.fleet.filter(function (a) { return inZone(a) && serviceable(a) && a.state === 'GROUND' && a.at === hb; })[0];
      var ferryB = path(hb, d.from);
      if (free && ferryB) out.push({
        kind: 'POSITION', cs: free.cs, score: 4,
        eta: (mins(ferryB.km) + legMin) + ' min',
        why: 'No aircraft at ' + d.from + '. Fly ' + free.cs + ' empty from ' + hb + ' base to collect.',
        cost: 'EMPTY LEG'
      });
    }

    out.sort(function (a, b) { return a.score - b.score; });
    return out;
  }

  /* ---- accept a proposal: Roster → Ground ---- */
  function assign(s, demandId, opt) {
    var d = null;
    s.demands.forEach(function (x) { if (x.id === demandId) d = x; });
    if (!d) return;
    d.state = 'ASSIGNED';
    d.ac = opt.cs;
    d.eta = opt.eta;
    log(s, 'ROSTER', opt.cs + ' assigned to ' + d.id + ' · ' + opt.kind + ' · ETA ' + opt.eta, '#C08CF0');
    notify(s, 'GROUND', 'TASK', opt.cs + ' → ' + d.id,
      'Prepare ' + opt.cs + ' at ' + d.from + ' for ' + d.kg + ' kg ' + d.type + ' to ' + d.to + '. ETA to bay ' + opt.eta + '.',
      { cs: opt.cs, demand: d.id }, '#3DDC97');
  }

  /* ---- Ground releases to Air ---- */
  function release(s, cs, demandId) {
    var d = null;
    s.demands.forEach(function (x) { if (x.id === demandId) d = x; });
    var a = null;
    s.fleet.forEach(function (x) { if (x.cs === cs) a = x; });
    if (!a || !d) return;
    d.state = 'READY';
    log(s, 'GROUND', cs + ' pod sealed and loaded · ' + d.kg + ' kg ' + d.type, '#3DDC97');
    notify(s, 'AIR', 'RELEASE', cs + ' ready for ' + d.to,
      d.kg + ' kg ' + d.type + ' sealed at ' + d.from + '. Corridor ' + firstLeg(d.from, d.to) +
        (path(d.from, d.to) && path(d.from, d.to).via ? ' then transit ' + path(d.from, d.to).via : '') +
        '. Needs a supervisory pilot to accept.',
      { cs: cs, demand: d.id, from: d.from, to: d.to }, '#FF8874');
  }

  /* ---- Air: a pilot accepts the flight ---- */
  function accept(s, cs, demandId, pilotId) {
    var a = null, d = null;
    s.fleet.forEach(function (x) { if (x.cs === cs) a = x; });
    s.demands.forEach(function (x) { if (x.id === demandId) d = x; });
    if (!a || !d) return;
    var rid = routeFor(d.from, d.to), r = route(rid);
    if (!rid) { rid = firstLeg(d.from, d.to); r = route(rid); d.via = legEnd(d.from, d.to); }
    a.r = rid;
    a.dir = d.from === baseOf(d.from) ? 1 : -1;
    a.p = launchP(s, rid, a.dir, a.cs);
    /* a small per-airframe cruise variance stops a pair flying locked together */
    a.v = 0.00040 + (parseInt(a.cs.slice(4), 10) % 7) * 0.000018;
    a.dest = d.via || d.to;
    a.at = null;
    a.pilot = pilotId;
    a.kg = d.kg;
    a.empty = false;
    a.state = 'CLIMB';
    a.tgt = assignLevel(s, rid, a.cs);
    a.alt = 200;
    a.hold = 0;
    d.state = 'AIRBORNE';
    log(s, 'AIR', cs + ' accepted by ' + pilotName(pilotId) + ' · ' + rid + ' · level ' + a.tgt + ' ft', '#FF8874');
  }

  function pilotName(id) {
    for (var i = 0; i < PILOTS.length; i++) if (PILOTS[i].id === id) return PILOTS[i].name;
    return id;
  }

  var MIN_TRAIL_KM = 3.0;

  /* first launch slot at least MIN_TRAIL_KM clear of everyone already on the
     corridor heading the same way, measured from the departure end */
  function launchP(s, rid, dir, skipCs) {
    var r = route(rid);
    if (!r) return dir > 0 ? 0.02 : 0.98;
    var step = (MIN_TRAIL_KM * 1.15) / r.km;
    var busy = s.fleet.filter(function (a) {
      return a.r === rid && a.dir === dir && a.cs !== skipCs &&
        a.state !== 'GROUND' && a.state !== 'MAINT';
    }).map(function (a) { return a.p; });
    for (var i = 0; i < 24; i++) {
      var p = dir > 0 ? 0.02 + i * step : 0.98 - i * step;
      if (p <= 0.01 || p >= 0.99) break;
      var clear = true;
      for (var j = 0; j < busy.length; j++) {
        if (Math.abs(busy[j] - p) * r.km < MIN_TRAIL_KM) { clear = false; break; }
      }
      if (clear) return p;
    }
    return dir > 0 ? 0.02 : 0.98;
  }

  /* automatic vertical separation: pick a free level 200 ft clear of everyone on the route */
  function assignLevel(s, rid, skipCs) {
    var used = s.fleet.filter(function (a) {
      return a.r === rid && a.cs !== skipCs && a.state !== 'GROUND' && a.state !== 'MAINT';
    }).map(function (a) { return a.tgt; });
    for (var lvl = 1400; lvl <= 5000; lvl += 200) {
      var free = true;
      for (var i = 0; i < used.length; i++) if (Math.abs(used[i] - lvl) < 200) free = false;
      if (free) return lvl;
    }
    return 2200;
  }

  /* least-loaded pilot */
  function pilotLoad(s, id) {
    return s.fleet.filter(function (a) {
      return a.pilot === id && a.state !== 'GROUND' && a.state !== 'MAINT';
    }).length;
  }

  /* least-loaded supervisor with room, or null when the zone is out of capacity */
  function freePilot(s, z) {
    var best = null, bl = 99;
    PILOTS.forEach(function (p) {
      if (p.zone !== z) return;
      var l = pilotLoad(s, p.id);
      if (l >= p.max) return;
      if (l < bl) { bl = l; best = p; }
    });
    return best;
  }

  function suggestPilot(s) {
    var pool = zPilots(s);
    if (!pool.length) pool = PILOTS;
    var best = pool[0], bl = 99;
    pool.forEach(function (p) {
      var n = s.fleet.filter(function (a) { return a.pilot === p.id && a.state !== 'GROUND' && a.state !== 'MAINT'; }).length;
      if (n < bl) { bl = n; best = p; }
    });
    return best;
  }

  function pilotLoad(s, id) {
    return s.fleet.filter(function (a) { return a.pilot === id && a.state !== 'GROUND' && a.state !== 'MAINT'; }).length;
  }

  /* launch an empty positioning leg. No cargo, no revenue — it shows on the map
     and in the ledger like any other flight so the movement is accountable. */
  function ferry(s, a, destId, why) {
    var rid = a.at === destId ? null : (routeFor(a.at, destId) || mroRoute(a.zone || 'SOUTH'));
    var r = route(rid);
    if (!r) return false;
    var fromIsA = r.a === a.at;
    a.r = rid;
    a.dir = fromIsA ? 1 : -1;
    a.p = launchP(s, rid, a.dir, a.cs);
    a.dest = destId;
    a.at = null;
    a.state = 'CLIMB';
    a.tgt = assignLevel(s, rid, a.cs);
    a.alt = 200;
    a.kg = 0;
    a.empty = true;
    a.rev = false;
    a.why = why;
    a.v = 0.00040 + (parseInt(a.cs.slice(4), 10) % 7) * 0.000018;
    var pil = freePilot(s, a.zone || 'SOUTH');
    a.pilot = pil ? pil.id : null;
    log(s, 'AIR', a.cs + ' positioning ' + r.name.replace('→', a.dir > 0 ? '→' : '←') +
      ' · ' + why + ' · non-revenue', '#FF8874');
    return true;
  }

  /* stands physically free right now */
  function standsFree(s, hubId) {
    var h = hub(hubId);
    if (!h || h.type === 'MRO') return 99;
    var parked = s.fleet.filter(function (a) {
      return a.state === 'GROUND' && a.at === hubId;
    }).length;
    return h.cap - parked;
  }

  /* AI clears the apron so the inbound can land: the aircraft holding a stand
     longest is moved out first — on revenue work if there is any, otherwise
     positioned back to base. Every push is logged against the holding tail. */
  function clearStand(s, hubId, forCs) {
    var h = hub(hubId);
    if (!h) return false;
    var onStand = s.fleet.filter(function (a) {
      return a.state === 'GROUND' && a.at === hubId && a.mx !== 'GROUNDED';
    });
    if (!onStand.length) return false;

    /* 1 · anything already loaded and waiting on a release goes now */
    for (var i = 0; i < onStand.length; i++) {
      var a = onStand[i], d = null;
      s.demands.forEach(function (x) {
        if (!d && x.ac === a.cs && (x.state === 'READY' || x.state === 'ASSIGNED')) d = x;
      });
      if (!d) continue;
      if (d.state === 'ASSIGNED') release(s, a.cs, d.id);
      var p1 = freePilot(s, a.zone || 'SOUTH');
      if (!p1) continue;
      accept(s, a.cs, d.id, p1.id);
      log(s, 'AI', hubId + ' apron full · ' + a.cs + ' pushed out on ' + d.id +
        ' to clear a stand for ' + forCs, '#C08CF0');
      return true;
    }

    /* 2 · otherwise raise outbound work for the aircraft that has sat longest */
    var lane = null;
    ROUTES.forEach(function (r) {
      if (lane || r.mro) return;
      if (r.a === hubId || r.b === hubId) lane = r;
    });
    var out = onStand[0];
    if (lane) {
      var to = lane.a === hubId ? lane.b : lane.a;
      var dem = {
        id: nid(s, 'CLR'), from: hubId, to: to,
        kg: 90 + (s.seq % 5) * 26, type: 'DRY', win: 'APRON CLEARANCE',
        state: 'OPEN', ac: null, eta: null,
        cust: 'Backhaul raised to clear the apron', src: 'PLANNER'
      };
      s.demands.push(dem);
      var opt = { kind: 'AT HUB', cs: out.cs, score: 0, eta: '12 min',
        why: 'Pushed out to clear a stand at ' + hubId, cost: 'APRON CLEARANCE' };
      assign(s, dem.id, opt);
      release(s, out.cs, dem.id);
      var p2 = freePilot(s, out.zone || 'SOUTH');
      if (p2) {
        accept(s, out.cs, dem.id, p2.id);
        log(s, 'AI', hubId + ' apron full · ' + out.cs + ' pushed out to ' + to +
          ' on backhaul ' + dem.id + ' to clear a stand for ' + forCs, '#C08CF0');
        return true;
      }
    }

    /* 3 · last resort: position it home empty */
    var hb = zone(out.zone || 'SOUTH').base;
    if (hb !== hubId && ferry(s, out, hb, 'pushed out to clear a stand at ' + hubId)) {
      log(s, 'AI', hubId + ' apron full · ' + out.cs + ' positioned to ' + hb +
        ' to clear a stand for ' + forCs, '#C08CF0');
      return true;
    }
    return false;
  }

  /* ---- arrival: Air → Ground, with capacity optimisation ---- */
  function arrive(s, a) {
    var destId = a.dest;
    var h = hub(destId);
    var occ = occupancy(s, destId);
    a.state = 'GROUND';
    a.at = destId;
    a.r = null;
    a.alt = 0;
    a.tgt = 0;
    a.pilot = null;
    a.dest = null;
    a.rev = true;
    a.why = null;
    if (a.mx === 'FERRY-OUT') a.mx = 'IN SERVICE';
    /* mid-route stop on the way to the maintenance hub: launch the next leg */
    if (a.mroBound) {
      if (destId === a.mroBound) {
        a.state = 'MAINT';
        a.mx = 'GROUNDED';
        a.mroBound = null;
        a.mroT = s.t;
        log(s, 'MAINT', a.cs + ' arrived ' + (hub(destId) || {}).label + ' · slot taken, ' +
          (a.item || 'check') + ' in work', '#FF8874');
        return;
      }
      if (ferry(s, a, a.mroBound, 'withdrawn for ' + (a.item || 'check'))) return;
      a.state = 'MAINT';
      a.at = a.mroBound;
      a.mroBound = null;
      return;
    }
    s.demands.forEach(function (d) {
      if (d.ac !== a.cs || d.state !== 'AIRBORNE') return;
      /* a two-leg routing landed at its transit hub: hand back to Ground for the onward leg */
      if (d.via && d.via === destId && d.to !== destId) {
        d.from = destId; d.via = null; d.state = 'ASSIGNED'; d.eta = '25 min';
        log(s, 'AIR', a.cs + ' transited ' + destId + ' · onward leg to ' + d.to + ' pending Ground', '#78AAFF');
        notify(s, 'GROUND', 'TASK', a.cs + ' → ' + d.id + ' (transit)',
          'Load stays sealed. Re-release ' + a.cs + ' at ' + destId + ' for the onward leg to ' + d.to + '.',
          { cs: a.cs, demand: d.id }, '#78AAFF');
        return;
      }
      d.state = 'DELIVERED';
      if (d.merged) d.merged.forEach(function (cid) {
        s.demands.forEach(function (x) { if (x.id === cid) x.state = 'DELIVERED'; });
      });
    });
    a.kg = 0;
    a.empty = true;
    log(s, 'AIR', a.cs + ' landed at ' + destId + ' · pod handed to Ground', '#3DDC97');
    if (a.mx === 'WITHDRAW') {
      a.state = 'MAINT';
      a.mx = 'GROUNDED';
      a.item = 'AIRFRAME ' + a.due + ' h CHECK';
      a.queue = [];
      var mro = mroOf(a.zone || 'SOUTH');
      var hb = zone(a.zone || 'SOUTH').base;
      a.mroBound = mro ? mro.id : null;
      a.ferried = destId;
      log(s, 'MAINT', a.cs + ' withdrawn at ' + destId + ' · ' + a.item +
        ' opened, off the roster, routing to ' + (mro ? mro.label : destId), '#FF8874');
      /* fly it in: base first if it landed at a spoke, then the MRO corridor */
      if (mro && destId !== mro.id) {
        a.state = 'GROUND';
        a.at = destId;
        if (ferry(s, a, destId === hb ? mro.id : hb, 'withdrawn for ' + a.item)) {
          a.mx = 'FERRY-IN';
        } else { a.state = 'MAINT'; a.at = mro.id; a.mroBound = null; }
      }
      notify(s, 'MAINT', 'INTAKE', a.cs + ' routing to ' + (mro ? mro.label : destId),
        'Scheduled check due. Close the work to return the airframe, or extend operations by ' + EXTEND_H + ' h under the continuing-airworthiness concession.',
        { cs: a.cs, hub: destId }, '#FF8874');
    }
    notify(s, 'GROUND', 'ARRIVAL', a.cs + ' on stand at ' + destId,
      'Pod recovery and access grant required. ' + destId + ' holding ' + occ.parked + ' of ' + h.cap + ' aircraft.',
      { cs: a.cs, hub: destId }, '#3DDC97');
    if (a.queue && a.queue.length) {
      var nextId = a.queue.shift();
      var nd = null;
      s.demands.forEach(function (x) { if (x.id === nextId) nd = x; });
      if (nd && nd.from === destId) {
        nd.state = 'ASSIGNED'; nd.ac = a.cs; nd.eta = '12 min';
        log(s, 'AI', a.cs + ' continuing its sequenced plan · next leg ' + nd.id + ' out of ' + destId, '#C08CF0');
        notify(s, 'GROUND', 'TASK', a.cs + ' → ' + nd.id,
          'Backhaul leg of a sequenced plan. Load ' + nd.kg + ' kg ' + nd.type + ' at ' + destId + ' for ' + nd.to + '. Aircraft is already on stand.',
          { cs: a.cs, demand: nd.id }, '#3DDC97');
      }
    }
    if (h.type === 'WAREHOUSE' && occ.parked > h.cap) {
      notify(s, 'ROSTER', 'CAPACITY', destId + ' over capacity',
        destId + ' holds ' + occ.parked + ' aircraft against a limit of ' + h.cap +
        '. Orchestrator proposes returning ' + a.cs + ' to Medchal base as an empty leg.',
        { cs: a.cs, hub: destId, action: 'RETURN' }, '#FAC83C');
    }
  }

  /* return an aircraft to base as an empty leg */
  function returnToBase(s, cs) {
    var a = null;
    s.fleet.forEach(function (x) { if (x.cs === cs) a = x; });
    if (!a || !a.at) return;
    var rid = routeFor(a.at, baseOf(a.at));
    if (!rid) return;
    a.r = rid;
    a.dir = -1;
    a.p = 0.98;
    a.dest = 'MEDCHAL';
    a.at = null;
    a.empty = true;
    a.kg = 0;
    a.state = 'CLIMB';
    a.alt = 200;
    a.tgt = assignLevel(s, rid, cs);
    a.pilot = suggestPilot(s).id;
    log(s, 'AI', cs + ' released to Medchal base as an empty leg · warehouse capacity restored', '#C08CF0');
  }

  /* ---- airspace events that need a pilot decision ---- */
  var EVENT_POOL = [
    { kind: 'WEATHER', title: 'Convective cell on corridor', color: '#FAC83C',
      text: 'A convective cell has developed across the eastern third of the corridor, moving 040 at 18 kt. Aircraft is holding until a decision is made.' },
    { kind: 'NO-FLY', title: 'Temporary restriction raised', color: '#FF8874',
      text: 'A temporary no-fly volume has been raised ahead of the aircraft for a police operation. Aircraft is holding until a decision is made.' }
  ];

  function raiseEvent(s, forced) {
    var flying = s.fleet.filter(function (a) { return a.state === 'CRUISE' && !a.hold; });
    if (!flying.length) return;
    if (!forced && Math.random() > 0.004) return;
    var openZones = {};
    s.events.forEach(function (e) { if (e.state === 'OPEN') openZones[e.zone || acZone(s, e.cs) || 'SOUTH'] = 1; });
    flying = flying.filter(function (a) { return !openZones[a.zone || 'SOUTH']; });
    if (!flying.length) return;
    var a = flying[Math.floor(Math.random() * flying.length)];
    var tpl = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
    a.hold = 1;
    a.state = 'HOLD';
    s.events.push({
      id: nid(s, 'E'), kind: tpl.kind, title: tpl.title, text: tpl.text,
      color: tpl.color, cs: a.cs, zone: a.zone || 'SOUTH', state: 'OPEN'
    });
    log(s, 'AIR', tpl.kind + ' · ' + a.cs + ' entered a hold pending a pilot decision', tpl.color);
  }

  function resolveEvent(s, eventId, choice) {
    var e = null;
    s.events.forEach(function (x) { if (x.id === eventId) e = x; });
    if (!e) return;
    var a = null;
    s.fleet.forEach(function (x) { if (x.cs === e.cs) a = x; });
    e.state = 'CLOSED';
    e.choice = choice;
    if (!a) return;
    a.hold = 0;
    a.state = 'CRUISE';
    if (choice === 'CLIMB') { a.tgt = Math.min(5000, a.tgt + 600); log(s, 'AIR', a.cs + ' climbing 600 ft over the ' + e.kind.toLowerCase(), '#3DDC97'); }
    if (choice === 'CONTINUE') { log(s, 'AIR', a.cs + ' continuing on the filed profile · ' + e.kind.toLowerCase() + ' accepted', '#3DDC97'); }
    if (choice === 'DIVERT') {
      a.dir = -a.dir;
      a.dest = 'MEDCHAL';
      a.empty = false;
      log(s, 'AIR', a.cs + ' diverting to Medchal base · payload returns undelivered', '#FF8874');
    }
  }

  /* ---- simulation step (driven by whichever console is open) ---- */
  function step(s) {
    s.t += 1;
    s.fleet.forEach(function (a) {
      if (a.state === 'GROUND' || a.state === 'MAINT') return;
      if (a.hrs == null) { a.hrs = 0; a.due = CHECK_H; a.mx = 'IN SERVICE'; }
      a.hrs = Math.min(a.due, a.hrs + 0.05);
      if (a.state !== 'MAINT' && a.mx !== 'WITHDRAW' && a.mx !== 'FERRY-IN') {
        var left = a.due - a.hrs;
        if (left <= 0) {
          var wasExt = a.mx === 'EXTENDED';
          a.mx = 'WITHDRAW';
          log(s, 'MAINT', a.cs + ' reached its ' + a.due + ' h check in flight' +
            (wasExt ? ' · concession used up' : '') + ' · withdrawn on arrival at ' + a.dest, '#FF8874');
          notify(s, 'MAINT', 'INTAKE', a.cs + ' withdrawing at ' + a.dest,
            'Flight hours from Air reached the ' + a.due + ' h limit. The airframe comes off the roster on landing and routes to the maintenance hub.',
            { cs: a.cs, hub: a.dest }, '#FF8874');
          log(s, 'ROSTER', a.cs + ' leaves the roster on arrival at ' + a.dest +
            ' · ' + a.due + ' h check reached', '#FF8874');
        } else if (left <= 50 && a.mx === 'IN SERVICE') {
          a.mx = 'DUE SOON';
          log(s, 'MAINT', a.cs + ' inside 50 h of its scheduled check · ' + Math.round(left) + ' h remaining', '#FAC83C');
        }
      }
      if (a.hold) {
        a.hold += 0.06;
        if (a.hold > 100) a.hold = 1;
        /* recheck the apron each orbit; keep clearing traffic until it opens */
        if (a.holdFor === 'STAND' && s.t % 40 === 0) {
          var f2 = standsFree(s, a.dest);
          var q2 = s.fleet.filter(function (x) {
            return x.cs !== a.cs && x.dest === a.dest && x.holdFor === 'STAND' &&
              (x.holdT || 0) < (a.holdT || 0);
          }).length;
          if (f2 - q2 > 0) {
            a.holdFor = null; a.hold = 0; a.holdT = null; a.state = 'CRUISE';
            log(s, 'AIR', a.cs + ' cleared to land at ' + a.dest + ' · stand opened', '#3DDC97');
          } else if (!clearStand(s, a.dest, a.cs)) {
            if (s.t % 400 === 0) log(s, 'AIR', a.dest +
              ' apron gridlocked · nothing on stand can be pushed out, ' + a.cs +
              ' still holding', '#FF8874');
          }
        }
      }
      else {
        a.p += a.v * a.dir;
        var atEnd = (a.dir > 0 && a.p >= 1) || (a.dir < 0 && a.p <= 0);
        if (atEnd) {
          a.p = a.dir > 0 ? 1 : 0;
          /* landing clearance: a stand must exist, and the queue is first-come */
          var free = standsFree(s, a.dest);
          var ahead = s.fleet.filter(function (x) {
            return x.cs !== a.cs && x.dest === a.dest && x.holdFor === 'STAND' &&
              (x.holdT || 0) < (a.holdT || s.t);
          }).length;
          if (free - ahead <= 0) {
            if (!a.holdFor) {
              a.holdFor = 'STAND';
              a.holdT = s.t;
              a.hold = 1;
              a.state = 'HOLD';
              log(s, 'AIR', a.cs + ' holding off ' + a.dest + ' · no stand available (' +
                hub(a.dest).cap + ' stands, ' + (ahead + 1) + ' in the landing queue)', '#FAC83C');
              notify(s, 'AIR', 'HOLD', a.cs + ' holding for a stand at ' + a.dest,
                'The apron is full. The orchestrator is pushing traffic out to open a stand; ' +
                a.cs + ' orbits at 1.2 km until one frees.',
                { cs: a.cs, hub: a.dest }, '#FAC83C');
              clearStand(s, a.dest, a.cs);
            }
            return;
          }
          if (a.holdFor === 'STAND') {
            a.holdFor = null; a.hold = 0; a.holdT = null;
            log(s, 'AIR', a.cs + ' cleared to land at ' + a.dest + ' · stand opened', '#3DDC97');
          }
          arrive(s, a);
          return;
        }
      }
      if (a.alt < a.tgt) { a.alt = Math.min(a.tgt, a.alt + 26); if (!a.hold) a.state = 'CLIMB'; }
      else if (a.alt > a.tgt) { a.alt = Math.max(a.tgt, a.alt - 26); if (!a.hold) a.state = 'DESCEND'; }
      else if (!a.hold && (a.state === 'CLIMB' || a.state === 'DESCEND')) a.state = 'CRUISE';
    });
    autoSeparate(s);
    raiseEvent(s, false);
    intakeArrive(s, false);
    if (s.t % 60 === 0) autoDispatch(s);
    if (s.t % 20 === 0) workLine(s);
    if (s.t % 90 === 0) autoClear(s);
    prune(s);
  }

  /* flight control holds separation automatically */
  function autoSeparate(s) {
    var byRoute = {};
    s.fleet.forEach(function (a) {
      if (a.state === 'GROUND' || a.state === 'MAINT' || !a.r) return;
      (byRoute[a.r] = byRoute[a.r] || []).push(a);
    });
    var acted = null;
    Object.keys(byRoute).forEach(function (rid) {
      var list = byRoute[rid], r = route(rid);
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          var A = list[i], B = list[j];
          if (A.dir !== B.dir) continue;
          var dkm = Math.abs(A.p - B.p) * r.km;
          if (dkm >= MIN_TRAIL_KM) continue;
          var trail = (A.dir > 0 ? A.p < B.p : A.p > B.p) ? A : B;
          var lead = trail === A ? B : A;
          /* open the gap: ease the trailing aircraft until it is MIN_TRAIL_KM clear */
          trail.v = Math.max(0.00024, (trail.v || 0.00045) * 0.94);
          lead.v = Math.min(0.00060, (lead.v || 0.00045) * 1.02);
          if (Math.abs(A.tgt - B.tgt) < 200) {
            var lvl = assignLevel(s, rid, trail.cs);
            if (lvl !== trail.tgt) {
              trail.tgt = lvl;
              acted = trail.cs + ' auto-stepped to ' + lvl + ' ft and eased · ' +
                MIN_TRAIL_KM.toFixed(1) + ' km in-trail from ' + lead.cs;
            }
          } else if (!acted) {
            acted = trail.cs + ' eased to restore ' + MIN_TRAIL_KM.toFixed(1) +
              ' km in-trail from ' + lead.cs;
          }
        }
      }
    });
    if (acted) log(s, 'AI', acted, '#C08CF0');
  }

  function separation(s) {
    var out = [], byRoute = {};
    s.fleet.forEach(function (a) {
      if (a.state === 'GROUND' || a.state === 'MAINT' || !a.r) return;
      (byRoute[a.r] = byRoute[a.r] || []).push(a);
    });
    Object.keys(byRoute).forEach(function (rid) {
      var list = byRoute[rid].slice().sort(function (a, b) { return a.p - b.p; });
      var r = route(rid);
      for (var i = 0; i < list.length - 1; i++) {
        var A = list[i], B = list[i + 1];
        out.push({
          r: rid, a: A.cs, b: B.cs,
          dkm: (B.p - A.p) * r.km,
          dalt: Math.abs(A.alt - B.alt)
        });
      }
    });
    return out;
  }

  /* ---- external demand intake ---- */
  function intakeArrive(s, forced, wantZone) {
    if (!s.intake) s.intake = [];
    if (!forced) {
      if (s.intake.length >= 6) return;
      if (Math.random() > 0.09) return;
    }
    var live = {};
    s.intake.forEach(function (i) { live[i.cust + i.to] = 1; });
    s.demands.forEach(function (d) { if (d.state !== 'DELIVERED' && d.cust) live[d.cust + d.to] = 1; });
    /* a zone request must come from that zone: narrow first, then relax the
       repeat-customer rule rather than falling through to the other zone */
    var base = wantZone
      ? EXT_POOL.filter(function (t) { return zoneOf(t.from) === wantZone; })
      : EXT_POOL;
    var pool = base.filter(function (t) { return !live[t.cust + t.to]; });
    if (!pool.length && wantZone) pool = base;
    if (!pool.length) return;
    if (!wantZone) {
      var perZone = {};
      s.intake.forEach(function (i) { var k = zoneOf(i.from); perZone[k] = (perZone[k] || 0) + 1; });
      var lean = (perZone.NORTH || 0) < (perZone.SOUTH || 0) ? 'NORTH' : 'SOUTH';
      var leanPool = pool.filter(function (t) { return zoneOf(t.from) === lean; });
      if (leanPool.length) pool = leanPool;
    }
    var tpl = pool[Math.floor(Math.random() * pool.length)];
    var item = { id: nid(s, 'REQ'), src: tpl.src, cust: tpl.cust, from: tpl.from, to: tpl.to,
      kg: tpl.kg, type: tpl.type, win: tpl.win, state: 'NEW' };
    s.intake.push(item);
    log(s, 'INTAKE', item.id + ' received from ' + (item.src === 'API' ? 'partner API' : 'booking portal') + ' · ' + item.cust + ' · ' + item.kg + ' kg ' + item.to,
      SOURCES[item.src].color);
    return item;
  }

  function addPlanner(s, from, to, kg, type) {
    var item = { id: nid(s, 'REQ'), src: 'PLANNER', cust: 'Logged by ops planner',
      from: from, to: to, kg: Math.min(MTOW, Math.max(1, parseInt(kg, 10) || 50)),
      type: type, win: 'NEXT AVAILABLE', state: 'NEW' };
    s.intake.push(item);
    log(s, 'INTAKE', item.id + ' entered manually · ' + item.kg + ' kg ' + item.type + ' ' + from + ' → ' + to, '#C08CF0');
    return item;
  }

  function admit(s, id) {
    var i = -1;
    s.intake.forEach(function (x, k) { if (x.id === id) i = k; });
    if (i < 0) return;
    var x = s.intake[i];
    if (!path(x.from, x.to)) {
      log(s, 'INTAKE', x.id + ' rejected · no corridor serves ' + x.from + ' → ' + x.to, '#FF8874');
      s.intake.splice(i, 1);
      return;
    }
    s.intake.splice(i, 1);
    s.demands.push({ id: x.id, from: x.from, to: x.to, kg: x.kg, type: x.type, win: x.win,
      state: 'OPEN', ac: null, eta: null, cust: x.cust, src: x.src });
    log(s, 'ROSTER', x.id + ' admitted to the demand board · ' + x.cust, '#FAC83C');
  }

  function reject(s, id) {
    var i = -1;
    s.intake.forEach(function (x, k) { if (x.id === id) i = k; });
    if (i < 0) return;
    var x = s.intake[i];
    s.intake.splice(i, 1);
    log(s, 'ROSTER', x.id + ' declined · returned to ' + SOURCES[x.src].label, '#868E99');
  }

  /* ---- load optimiser: consolidate, fill to MTOW, pair backhauls, sequence stops ---- */
  function dem(s, id) { var o = null; s.demands.forEach(function (x) { if (x.id === id) o = x; }); return o; }

  function pickAircraft(s, d, taken) {
    var opts = propose(s, d).filter(function (o) { return !taken[o.cs]; });
    if (opts[0]) return opts[0];
    /* nothing immediately available: queue against the next airframe to free up */
    var r = route(firstLeg(d.from, d.to));
    var dz = zoneOf(d.from);
    var cand = null, soonest = 1e9;
    s.fleet.forEach(function (a) {
      if ((a.zone || 'SOUTH') !== dz) return;
      if (!serviceable(a) || taken[a.cs]) return;
      var rr = route(a.r);
      var remain = a.state === 'GROUND' ? 0 : (a.dir > 0 ? (1 - a.p) : a.p) * (rr ? rr.km : 120) / 250 * 60;
      var free = remain + (a.dest && a.dest !== d.from ? 20 : 0);
      if (free < soonest) { soonest = free; cand = a; }
    });
    if (!cand) return null;
    return {
      kind: 'NEXT FREE', cs: cand.cs, score: 9,
      eta: Math.round(soonest + (r ? r.km / 250 * 60 : 40)) + ' min',
      why: 'No airframe is free at ' + d.from + ' right now. ' + cand.cs + ' is the soonest to release' +
        (cand.dest ? ' (inbound ' + cand.dest + ')' : '') + ' and is queued for this load.',
      cost: 'QUEUED'
    };
  }

  function optimise(s) {
    var z = zid(s);
    var open = s.demands.filter(function (d) { return d.state === 'OPEN' && zoneOf(d.from) === z; });
    var used = {}, taken = {}, plans = [];
    var pid = function () { return 'PLAN-' + (plans.length + 1); };

    /* 1 · consolidate same-corridor requests up to MTOW */
    open.forEach(function (a, i) {
      if (used[a.id]) return;
      var g = [a], kg = a.kg, cold = a.type === 'COLD CHAIN';
      for (var j = i + 1; j < open.length; j++) {
        var b = open[j];
        if (used[b.id]) continue;
        if (b.from !== a.from || b.to !== a.to) continue;
        if ((b.type === 'COLD CHAIN') !== cold) continue;
        if (kg + b.kg > MTOW) continue;
        g.push(b); kg += b.kg; used[b.id] = 1;
      }
      if (g.length < 2) return;
      var opt = pickAircraft(s, a, taken);
      if (!opt) { g.forEach(function (x) { used[x.id] = 0; }); return; }
      used[a.id] = 1; taken[opt.cs] = 1;
      plans.push({
        id: pid(), kind: 'CONSOLIDATE', cs: opt.cs, option: opt, primary: a.id,
        merge: g.map(function (x) { return x.id; }), queue: [],
        kg: kg, util: Math.round(kg / MTOW * 100),
        lane: a.from + ' → ' + a.to,
        legs: [g.length + ' requests · one leg ' + a.from + ' → ' + a.to],
        note: g.length + ' requests on the same corridor merged into one sortie at ' + kg + ' of ' + MTOW + ' kg. ' +
          (g.length - 1) + ' separate flight' + (g.length > 2 ? 's' : '') + ' avoided.',
        saves: (g.length - 1) + ' SORTIE' + (g.length > 2 ? 'S' : '')
      });
    });

    /* 2 · pair an outbound with a return in the opposite direction */
    open.forEach(function (a) {
      if (used[a.id]) return;
      var b = null;
      open.forEach(function (x) { if (!b && !used[x.id] && x.id !== a.id && x.from === a.to && x.to === a.from) b = x; });
      if (!b) return;
      var opt = pickAircraft(s, a, taken);
      if (!opt) return;
      used[a.id] = 1; used[b.id] = 1; taken[opt.cs] = 1;
      var r = route(firstLeg(a.from, a.to));
      plans.push({
        id: pid(), kind: 'BACKHAUL', cs: opt.cs, option: opt, primary: a.id,
        merge: [], queue: [b.id],
        kg: Math.max(a.kg, b.kg), util: Math.round(Math.max(a.kg, b.kg) / MTOW * 100),
        lane: a.from + ' → ' + a.to + ' → ' + a.from,
        legs: ['Leg 1 · ' + a.id + ' ' + a.kg + ' kg to ' + a.to, 'Leg 2 · ' + b.id + ' ' + b.kg + ' kg back to ' + a.from],
        note: a.id + ' outbound pairs with ' + b.id + ' on the return. The aircraft flies loaded both ways instead of ferrying ' +
          (r ? r.km : 0) + ' km empty.',
        saves: (r ? r.km : 0) + ' KM EMPTY'
      });
    });

    /* 3 · everything left flies on its own */
    open.forEach(function (a) {
      if (used[a.id]) return;
      var opt = pickAircraft(s, a, taken);
      if (!opt) return;
      used[a.id] = 1; taken[opt.cs] = 1;
      plans.push({
        id: pid(), kind: opt.kind === 'EMPTY LEG' ? 'EMPTY LEG' : (opt.kind === 'NEXT FREE' ? 'NEXT FREE' : 'DIRECT'),
        cs: opt.cs, option: opt,
        primary: a.id, merge: [], queue: [],
        kg: a.kg, util: Math.round(a.kg / MTOW * 100),
        lane: a.from + ' → ' + a.to,
        legs: ['Single leg · ' + a.id + ' ' + a.kg + ' kg'],
        note: opt.why,
        saves: opt.cost
      });
    });

    return plans;
  }

  function commitPlan(s, p) {
    if (p.merge && p.merge.length > 1) {
      var head = dem(s, p.primary);
      var rest = p.merge.filter(function (id) { return id !== p.primary; });
      if (head) {
        head.kg = p.kg;
        head.merged = rest;
        rest.forEach(function (id) {
          var c = dem(s, id);
          if (c) { c.state = 'MERGED'; c.parent = head.id; c.ac = p.cs; }
        });
        log(s, 'AI', rest.length + ' request' + (rest.length > 1 ? 's' : '') + ' merged into ' + head.id +
          ' · ' + p.kg + ' kg on ' + p.cs + ' (' + p.util + '% of MTOW)', '#C08CF0');
      }
    }
    assign(s, p.primary, p.option);
    if (p.queue && p.queue.length) {
      var a = null;
      s.fleet.forEach(function (x) { if (x.cs === p.cs) a = x; });
      if (a) a.queue = p.queue.slice();
      p.queue.forEach(function (id) {
        var d = dem(s, id);
        if (d) { d.state = 'PLANNED'; d.ac = p.cs; }
      });
      log(s, 'AI', p.cs + ' sequenced · ' + p.primary + ' then ' + p.queue.join(', ') + ' on the return leg', '#C08CF0');
    }
  }

  function commitAll(s) {
    var plans = optimise(s);
    plans.forEach(function (p) { commitPlan(s, p); });
    if (plans.length) log(s, 'ROSTER', 'Batch confirmed by supervisor · ' + plans.length +
      ' sortie' + (plans.length > 1 ? 's' : '') + ' pushed to Ground', '#FAC83C');
    prune(s);
    return plans.length;
  }

  /* keep the demand board readable: retire closed work and orphaned in-flight rows */
  function prune(s) {
    /* retire settled notifications: the inbox was append-only */
    /* unactioned notices file themselves, and no console keeps more than 30
       pending: the inbox was append-only and the blob grew without bound */
    s.inbox.forEach(function (n) {
      if (n.state !== 'PENDING') return;
      if (n.kind !== 'RETURN' && n.kind !== 'INTAKE') return;
      if (n.bornT == null) n.bornT = s.t;
      if (s.t - n.bornT > 600) n.state = 'FILED';
    });
    ['MAINT', 'GROUND', 'AIR', 'ROSTER'].forEach(function (to) {
      var pend = s.inbox.filter(function (n) { return n.to === to && n.state === 'PENDING'; });
      if (pend.length <= 30) return;
      pend.slice(0, pend.length - 30).forEach(function (n) { n.state = 'FILED'; });
    });
    var settled = s.inbox.filter(function (n) { return n.state !== 'PENDING'; });
    if (settled.length > 40) {
      var keep = {};
      settled.slice(settled.length - 40).forEach(function (n) { keep[n.id] = 1; });
      s.inbox = s.inbox.filter(function (n) { return n.state === 'PENDING' || keep[n.id]; });
    }
    if (s.log.length > 70) s.log = s.log.slice(0, 70);
    var flying = {};
    s.fleet.forEach(function (a) {
      if (a.state !== 'GROUND' && a.state !== 'MAINT') flying[a.cs] = 1;
    });
    /* one airframe carries one demand: retire every AIRBORNE row that isn't the
       newest for its aircraft, and any whose aircraft is no longer flying */
    var newest = {};
    s.demands.forEach(function (d, i) {
      if (d.state === 'AIRBORNE' && d.ac) newest[d.ac] = i;
    });
    var changed = false;
    s.demands.forEach(function (d, i) {
      if (d.state !== 'AIRBORNE') return;
      if (!d.ac || !flying[d.ac] || newest[d.ac] !== i) { d.state = 'DELIVERED'; changed = true; }
    });
    /* MERGED children whose parent is gone or closed are dead weight */
    var liveParent = {};
    s.demands.forEach(function (d) { if (d.state !== 'DELIVERED') liveParent[d.id] = 1; });
    s.demands.forEach(function (d) {
      if (d.state === 'MERGED' && !liveParent[d.parent]) { d.state = 'DELIVERED'; changed = true; }
    });
    var closed = s.demands.filter(function (d) { return d.state === 'DELIVERED'; });
    if (closed.length <= 4) return changed;
    var drop = {};
    closed.slice(0, closed.length - 4).forEach(function (d) { drop[d.id] = 1; });
    /* merged children go with their parent */
    s.demands.forEach(function (d) { if (d.state === 'MERGED' && drop[d.parent]) drop[d.id] = 1; });
    var before = s.demands.length;
    s.demands = s.demands.filter(function (d) { return !drop[d.id]; });
    return changed || s.demands.length !== before;
  }

  var AUTO_QUEUE = 50;

  /* Ground and Air normally gate every step on a human. When the pending queue
     for a console passes AUTO_QUEUE the backlog is worked automatically under
     standing supervisor policy, and every action still lands in the log. */
  function autoClear(s) {
    ['GROUND', 'AIR', 'MAINT'].forEach(function (to) {
      var pend = s.inbox.filter(function (n) { return n.to === to && n.state === 'PENDING'; });
      if (pend.length <= AUTO_QUEUE) return;
      var work = pend.slice(0, Math.min(6, pend.length - AUTO_QUEUE));
      var done = 0;
      work.forEach(function (n) {
        if (!n.payload || !n.payload.cs) return;
        var a = null, d = null;
        s.fleet.forEach(function (x) { if (x.cs === n.payload.cs) a = x; });
        s.demands.forEach(function (x) { if (x.id === n.payload.demand) d = x; });
        if (!a || !d) { n.state = 'DISMISSED'; return; }
        if (to === 'GROUND' && n.kind === 'TASK') {
          release(s, a.cs, d.id);
          var pil = freePilot(s, a.zone || 'SOUTH');
          if (pil) accept(s, a.cs, d.id, pil.id);
          n.state = 'ACCEPTED';
          done += 1;
        } else if (to === 'AIR') {
          var p2 = freePilot(s, a.zone || 'SOUTH');
          if (p2) { accept(s, a.cs, d.id, p2.id); n.state = 'ACCEPTED'; done += 1; }
        } else {
          n.state = 'ACCEPTED';
          done += 1;
        }
      });
      if (done) log(s, 'AI', to + ' queue over ' + AUTO_QUEUE + ' · ' + done +
        ' item' + (done > 1 ? 's' : '') + ' auto-accepted under standing policy', '#C08CF0');
    });
  }

  /* ---- keep the fleet earning: a parked airframe makes nothing ----
     When a zone's utilisation falls below target, the orchestrator admits a
     waiting request and commits the best plan under standing supervisor policy. */
  var TARGET_UTIL = 0.6;

  function utilisation(s, z) {
    var all = s.fleet.filter(function (a) { return (a.zone || 'SOUTH') === z && a.state !== 'MAINT'; });
    if (!all.length) return 1;
    var flying = all.filter(function (a) { return a.state !== 'GROUND'; });
    return flying.length / all.length;
  }

  function autoDispatch(s) {
    if (s.autoDispatch === false) return;
    ZONES.forEach(function (z) {
      var all = s.fleet.filter(function (a) { return (a.zone || 'SOUTH') === z.id && a.state !== 'MAINT'; });
      if (!all.length) return;
      var need = Math.ceil(all.length * TARGET_UTIL) -
        all.filter(function (a) { return a.state !== 'GROUND'; }).length;
      if (need <= 0) return;
      /* one sortie at a time, and no more than a handful per pass: re-running the
         full optimiser per launch is what stalled the clock */
      need = Math.min(need, 4);
      var launched = 0;
      var lanes = ROUTES.filter(function (r) { return r.zone === z.id; });
      for (var i = 0; i < need; i++) {
        /* standing scheduled volume, raised by the orchestrator itself */
        var lane = lanes[(s.seq + i) % lanes.length];
        var outbound = (s.seq + i) % 2 === 0;
        var d = {
          id: nid(s, 'SCH'), from: outbound ? lane.a : lane.b, to: outbound ? lane.b : lane.a,
          kg: 120 + ((s.seq + i * 37) % 6) * 28, type: (s.seq + i) % 3 === 0 ? 'COLD CHAIN' : 'DRY',
          win: 'SCHEDULED BLOCK', state: 'OPEN', ac: null, eta: null,
          cust: 'Scheduled contract volume', src: 'PLANNER'
        };
        s.demands.push(d);
        /* pick a PARKED airframe: an empty-leg reroute flies nothing new */
        var opts = propose(s, d);
        var opt = null;
        opts.forEach(function (o) {
          if (opt) return;
          var a = null;
          s.fleet.forEach(function (x) { if (x.cs === o.cs) a = x; });
          if (a && a.state === 'GROUND') opt = o;
        });
        if (!opt) break;
        var pil = freePilot(s, z.id);
        if (!pil) {
          log(s, 'AIR', 'No supervisory capacity in ' + z.label + ' · ' + d.id +
            ' stays open until a pilot frees up (max ' + PILOTS[0].max + ' aircraft per supervisor)', '#FAC83C');
          break;
        }
        assign(s, d.id, opt);
        release(s, opt.cs, d.id);
        accept(s, opt.cs, d.id, pil.id);
        launched += 1;
      }
      if (launched) log(s, 'AI', 'Auto-dispatch · ' + launched + ' sortie' + (launched > 1 ? 's' : '') +
        ' tasked to hold ' + z.label + ' above ' + Math.round(TARGET_UTIL * 100) + '% utilisation', '#C08CF0');
    });
  }

  /* airframes hold their slot until Maintenance releases them. The line only
     works a check on its own once the hub runs short of slots. */
  function workLine(s) {
    ZONES.forEach(function (z) {
      var mro = mroOf(z.id);
      if (!mro) return;
      var inHub = s.fleet.filter(function (a) { return a.state === 'MAINT' && a.at === mro.id; });
      inHub.forEach(function (a) { if (a.mroT == null) a.mroT = s.t; });
      if (inHub.length < mro.slots * 0.8) return;
      /* over 80% of slots used: sign off the longest-dwelling airframes */
      inHub.sort(function (p, q) { return p.mroT - q.mroT; });
      var free = Math.ceil(mro.slots * 0.2);
      inHub.slice(0, free).forEach(function (a) {
        a.mroT = null;
        closeWork(s, a.cs);
      });
      log(s, 'MAINT', mro.label + ' at ' + inHub.length + '/' + mro.slots +
        ' slots · ' + Math.min(free, inHub.length) + ' checks signed off to free the line', '#FAC83C');
    });
  }

  /* ---- Maintenance authority ---- */
  function closeWork(s, cs) {
    var a = null;
    s.fleet.forEach(function (x) { if (x.cs === cs) a = x; });
    if (!a) return;
    var item = a.item || 'SCHEDULED CHECK';
    a.hrs = 0; a.due = CHECK_H; a.mx = 'IN SERVICE'; a.item = null;
    if (a.state === 'MAINT') {
      a.state = 'GROUND';
      a.mroT = null;
      a.mroBound = null;
      var hb = zone(a.zone || 'SOUTH').base;
      log(s, 'MAINT', item + ' closed on ' + a.cs + ' · airworthiness certified, hours reset', '#3DDC97');
      /* fly it out of the hub rather than teleporting it onto the roster */
      if (!ferry(s, a, hb, 'released from ' + (hub(a.at) || {}).label)) a.at = hb;
      a.mx = a.state === 'GROUND' ? 'IN SERVICE' : 'FERRY-OUT';
    } else {
      log(s, 'MAINT', item + ' closed on ' + a.cs + ' · airworthiness certified, hours reset', '#3DDC97');
    }
    notify(s, 'ROSTER', 'RETURN', a.cs + ' released to service',
      item + ' closed and signed off at ' + a.at + '. Full ' + CHECK_H + ' h available; the airframe is back on the roster.',
      { cs: a.cs, hub: a.at }, '#3DDC97');
  }

  function extendOps(s, cs) {
    var a = null;
    s.fleet.forEach(function (x) { if (x.cs === cs) a = x; });
    if (!a) return;
    a.due += EXTEND_H;
    a.mx = 'EXTENDED';
    if (a.state === 'MAINT') { a.state = 'GROUND'; }
    log(s, 'MAINT', a.cs + ' operations extended ' + EXTEND_H + ' h under concession · check now due at ' + a.due + ' h', '#FAC83C');
    notify(s, 'ROSTER', 'RETURN', a.cs + ' extended ' + EXTEND_H + ' h',
      'Maintenance granted a continuing-airworthiness extension. ' + a.cs + ' may fly ' + EXTEND_H +
      ' more hours before the check; it is back on the roster with the concession recorded.',
      { cs: a.cs, hub: a.at }, '#FAC83C');
  }

  /* ---- zone-scoped views: every console reads the zone the user is in ---- */
  function zid(s) { return s.zone || 'SOUTH'; }
  function setZone(s, z) {
    s.zone = z;
    log(s, 'ROSTER', 'Console switched to ' + zone(z).label + ' · ' + zone(z).tons + ' t/day · ' + zone(z).ac + ' airframes', '#78AAFF');
  }
  function zHubs(s) { var z = zid(s); return HUBS.filter(function (h) { return h.zone === z && h.type !== 'MRO'; }); }
  function zMro(s) { return mroOf(zid(s)); }
  function zRoutes(s) { var z = zid(s); return ROUTES.filter(function (r) { return r.zone === z && !r.mro; }); }
  /* everything the map should draw, including the maintenance corridor and hubs */
  function zMapRoutes(s) { var z = zid(s); return ROUTES.filter(function (r) { return r.zone === z; }); }
  function zMapHubs(s) { var z = zid(s); return HUBS.filter(function (h) { return h.zone === z; }); }
  function zPilots(s) { var z = zid(s); return PILOTS.filter(function (p) { return p.zone === z; }); }
  function zFleet(s) { var z = zid(s); return s.fleet.filter(function (a) { return (a.zone || 'SOUTH') === z; }); }
  function zDemands(s) { var z = zid(s); return s.demands.filter(function (d) { return zoneOf(d.from) === z; }); }
  function zEvents(s) {
    var z = zid(s);
    return s.events.filter(function (e) {
      return (e.zone || acZone(s, e.cs) || 'SOUTH') === z;
    });
  }
  function zInbox(s, to) {
    var z = zid(s);
    return s.inbox.filter(function (n) {
      if (to && n.to !== to) return false;
      var nz = n.zone || (n.payload && n.payload.cs ? acZone(s, n.payload.cs) : null) ||
        (n.payload && n.payload.hub ? zoneOf(n.payload.hub) : null) || 'SOUTH';
      return nz === z;
    });
  }
  function zIntake(s) { var z = zid(s); return (s.intake || []).filter(function (i) { return zoneOf(i.from) === z; }); }

  window.VectorCore = {
    ZONES: ZONES, zone: zone, zoneOf: zoneOf, baseOf: baseOf, zid: zid, setZone: setZone,
    zHubs: zHubs, zRoutes: zRoutes, zPilots: zPilots, zFleet: zFleet, zDemands: zDemands, zIntake: zIntake,
    zEvents: zEvents, zInbox: zInbox, acZone: acZone,
    KEY: KEY, ROUTES: ROUTES, HUBS: HUBS, PILOTS: PILOTS, MTOW: MTOW, SOURCES: SOURCES,
    intakeArrive: intakeArrive, addPlanner: addPlanner, admit: admit, reject: reject,
    optimise: optimise, commitPlan: commitPlan, commitAll: commitAll, prune: prune,
    CHECK_H: CHECK_H, EXTEND_H: EXTEND_H, closeWork: closeWork, extendOps: extendOps,
    utilisation: utilisation, autoDispatch: autoDispatch, TARGET_UTIL: TARGET_UTIL, workLine: workLine,
    pilotLoad: pilotLoad, freePilot: freePilot, launchP: launchP, MIN_TRAIL_KM: MIN_TRAIL_KM,
    autoClear: autoClear, AUTO_QUEUE: AUTO_QUEUE, mroOf: mroOf, mroLoad: mroLoad, zMro: zMro,
    mroRoute: mroRoute, zMapRoutes: zMapRoutes, zMapHubs: zMapHubs,
    standsFree: standsFree, clearStand: clearStand,
    load: load, save: save, reset: reset,
    clockLease: clockLease, clockOwner: clockOwner, runClock: runClock, serviceable: serviceable,
    route: route, hub: hub, pos: pos, nearestGcs: nearestGcs,
    occupancy: occupancy, routeFor: routeFor, path: path, firstLeg: firstLeg,
    propose: propose, assign: assign, release: release, accept: accept,
    arrive: arrive, returnToBase: returnToBase,
    raiseEvent: raiseEvent, resolveEvent: resolveEvent,
    step: step, separation: separation, assignLevel: assignLevel,
    suggestPilot: suggestPilot, pilotLoad: pilotLoad, pilotName: pilotName,
    notify: notify, log: log
  };
})();

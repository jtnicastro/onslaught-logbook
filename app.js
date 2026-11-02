(function () {
'use strict';

/* =========================================================================
   Program data (Onslaught, weeks 5–12) + indexes
   ========================================================================= */
const PLATFORM = window.__PLATFORM__ || 'artifact';
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
let PROGRAM = null, WEEKS = [], DAYS = [], DAY = {}, EX = {}, KEY_EX = {}, KEY_NAME = {};
function indexProgram(p) {
  PROGRAM = p; WEEKS = p.weeks; DAYS = []; DAY = {}; EX = {}; KEY_EX = {}; KEY_NAME = p.keyNames || {};
  for (const w of WEEKS) for (const d of w.days) {
    d.week = w.week; d.idx = DAYS.length; DAYS.push(d); DAY[d.id] = d;
    for (const x of d.exercises) { x.dayId = d.id; EX[x.id] = x; (KEY_EX[x.key] = KEY_EX[x.key] || []).push(x); }
  }
  IDX = null; bump();
}
const GROUP_TONE = { Chest: 'red', Shoulders: 'red', Back: 'blue', Legs: 'yellow', Triceps: 'green', Biceps: 'green', Abs: 'white', Calves: 'white' };
const FOCUS_TONE = { 'Back': 'blue', 'Legs': 'yellow', 'Chest & Shoulders': 'red', 'Arms': 'green' };
const FOCUS_ABBR = { 'Back': 'B', 'Legs': 'L', 'Chest & Shoulders': 'C/S', 'Arms': 'A' };
const GROUP_ORDER = ['Chest', 'Shoulders', 'Back', 'Triceps', 'Biceps', 'Legs', 'Abs', 'Calves'];
const BLOCKS = [
  { label: 'Back block', weeks: [5, 6, 7, 8] },
  { label: 'Chest & shoulders block', weeks: [9, 10, 11, 12] },
];
const RPE_VALUES = ['6', '7', '8', '8.5', '9', '10', '11', '12', '13'];
const RPE_CHART = [
  ['6', 'Fairly easy, like a warm-up weight'], ['7', 'You can do 4–6 more reps'], ['8', 'You can do 2–3 more reps'],
  ['8.5', 'You have 2 more reps left in the tank'], ['9', 'You have 1 more rep left in the tank'],
  ['10', 'Went to failure at perfect form'], ['11', 'Went to failure with loose form after the perfect reps'],
  ['12', 'Used a high-intensity technique to push beyond failure'], ['13', 'Used multiple high-intensity techniques'],
];
const RPE_SHORT = {
  'last set is RPE of 12. It feels like RPE of 1 million..ha.': '12 on the last set',
  'On the first 2 sets is 10 | On the last set is 11.': '10, last set 11',
  'On the first 2 sets is 10 | On the last set is 11': '10, last set 11',
  '8-9 until set 3 which is a 12.': '8-9, set 3 at 12',
  '8-10 increasing as you go': '8 rising to 10',
  '8-11 increasing as you go': '8 rising to 11',
};
const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };

/* =========================================================================
   Utilities
   ========================================================================= */
const $ = (s, el) => (el || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; };
const repsNum = (v) => { const m = String(v == null ? '' : v).match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
const pad = (n, l) => String(n).padStart(l || 2, '0');
function todayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseDate(s) { const p = String(s || '').split('-').map(Number); return p.length === 3 ? new Date(p[0], p[1] - 1, p[2]) : null; }
function fmtDate(s, opts) {
  const d = parseDate(s); if (!d) return '';
  return d.toLocaleDateString(undefined, opts || { weekday: 'short', month: 'short', day: 'numeric' });
}
function relDate(s) {
  const d = parseDate(s); if (!d) return '';
  const t = parseDate(todayStr());
  const diff = Math.round((t - d) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return fmtDate(s, { month: 'short', day: 'numeric' });
}
function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
}
function fmtDur(ms) { const m = Math.round(ms / 60000); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + ' min'; }
function fmtNum(n) { return Math.round(n).toLocaleString(); }
function linkify(text) {
  return esc(text).replace(/https?:\/\/[^\s<]+/g, (u) => '<a href="' + u + '" target="_blank" rel="noopener">' + (/youtube|youtu\.be/.test(u) ? 'Watch video ↗' : u) + '</a>');
}
function targetLabel(t) {
  if (t == null || t === '') return '';
  t = String(t);
  if (t === 'F') return 'to fail';
  if (/^[~\d]/.test(t)) return '×' + t.replace(/ F$/, ' fail');
  return t;
}
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  program: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8.5 4v16M14 4v16"/></svg>',
  log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 4h11l3 3v13H5z"/><path d="M9 10h7M9 14h7M9 18h4"/></svg>',
  lifts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12h18"/><rect x="5" y="7" width="3" height="10" rx="1"/><rect x="16" y="7" width="3" height="10" rx="1"/><path d="M2 10v4M22 10v4"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>',
};

/* =========================================================================
   State + persistence
   ========================================================================= */
const LS = 'onslaught-logbook-v1';
const defaultSettings = () => ({ unit: 'lb', rest: 90, autoRest: true, sound: true, wake: true, round: 1, lastBackupAt: 0, updatedAt: 0 });
const S = {
  sessions: {},
  settings: defaultSettings(),
  dirty: new Set(),
  deleted: new Set(),
  mode: 'loading',            // loading | cloud | local
  localReason: '',
  cloudReady: false,
  syncErr: null,
  view: { tab: 'program', dayId: null, round: null, week: null, key: null, open: {}, notes: {}, q: '', coach: false },
};
let VER = 0;
const bump = () => { VER++; };

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (o && o.sessions && typeof o.sessions === 'object') S.sessions = o.sessions;
    if (o && o.settings) S.settings = Object.assign(defaultSettings(), o.settings);
    (o.dirty || []).forEach((id) => S.dirty.add(id));
    (o.deleted || []).forEach((id) => S.deleted.add(id));
  } catch (e) { /* storage unavailable */ }
}
function saveLocal() {
  try {
    localStorage.setItem(LS, JSON.stringify({ v: 1, sessions: S.sessions, settings: S.settings, dirty: [...S.dirty], deleted: [...S.deleted] }));
  } catch (e) { /* storage unavailable */ }
}
let lsTimer = 0;
function saveLocalSoon() { clearTimeout(lsTimer); lsTimer = setTimeout(saveLocal, 250); }

/* =========================================================================
   Cloud sync (claude.ai artifact db) with local cache + outbox
   ========================================================================= */
let DB = null;
const wTimers = {}, inflight = {};
let retryTimer = 0;

async function initCloud() {
  const C = window.claude;
  if (!C || typeof C.use !== 'function') { setLocal('nohost'); return; }
  let db = null, user = null;
  try { [db, user] = await Promise.all([C.use('db'), C.use('user')]); } catch (e) { /* treat as unavailable */ }
  if (!db) { setLocal('nodb'); return; }
  let can = true;
  try { if (user) can = await user.canEdit(); } catch (e) { can = true; }
  if (!can) { setLocal('viewer'); return; }
  DB = db; S.mode = 'cloud'; renderSync();
  const loadTimer = setTimeout(() => { if (!S.cloudReady) { S.syncErr = 'unavailable'; renderSync(); } }, 10000);
  try {
    DB.collection('sessions').onSnapshot((snap) => {
      mergeSessions(snap);
      if (!snap.metadata.fromCache) {
        clearTimeout(loadTimer);
        if (!S.cloudReady) { S.cloudReady = true; S.syncErr = null; flushAll(); }
      }
      renderSync();
    }, (err) => {
      clearTimeout(loadTimer);
      S.syncErr = (err && err.code) || 'unavailable';
      if (err && (err.code === 'revoked' || err.code === 'not_granted')) setLocal('revoked');
      renderSync();
    });
    DB.doc('meta/settings').onSnapshot(mergeSettings, () => {});
  } catch (e) { setLocal('nodb'); }
}
function setLocal(reason) { S.mode = 'local'; S.localReason = reason; DB = null; renderSync(); }

function mergeSessions(snap) {
  let changed = false;
  const seen = new Set();
  for (const d of snap.docs) {
    seen.add(d.id);
    if (S.deleted.has(d.id)) continue;
    const srv = d.data();
    if (!srv || typeof srv !== 'object') continue;
    const loc = S.sessions[d.id];
    if (loc && S.dirty.has(d.id) && (loc.updatedAt || 0) >= (srv.updatedAt || 0)) continue;
    if (loc && !S.dirty.has(d.id) && (loc.updatedAt || 0) === (srv.updatedAt || 0)) continue;
    const copy = JSON.parse(JSON.stringify(srv));
    if (loc && JSON.stringify(loc) === JSON.stringify(copy)) { S.dirty.delete(d.id); continue; }
    S.sessions[d.id] = copy; S.dirty.delete(d.id); changed = true;
  }
  if (!snap.metadata.fromCache) {
    for (const id of Object.keys(S.sessions)) {
      if (!seen.has(id) && !S.dirty.has(id)) { delete S.sessions[id]; changed = true; }
    }
  }
  if (changed) { bump(); saveLocalSoon(); render(); }
}
function mergeSettings(snap) {
  if (!snap || !snap.exists) return;
  const srv = snap.data() || {};
  if (S.dirty.has('settings') && (S.settings.updatedAt || 0) >= (srv.updatedAt || 0)) return;
  if ((srv.updatedAt || 0) <= (S.settings.updatedAt || 0)) return;
  S.settings = Object.assign(defaultSettings(), JSON.parse(JSON.stringify(srv)));
  saveLocalSoon(); render();
}
function markDirty(id) {
  if (PLATFORM === 'pwa') { saveLocalSoon(); renderSync(); return; }
  S.dirty.add(id);
  saveLocalSoon();
  if (S.mode === 'cloud') {
    clearTimeout(wTimers[id]);
    wTimers[id] = setTimeout(() => flush(id), 800);
  }
  renderSync();
}
function refFor(id) { return id === 'settings' ? DB.doc('meta/settings') : DB.doc('sessions/' + id); }
async function flush(id) {
  if (S.mode !== 'cloud' || !DB) return;
  if (inflight[id]) { inflight[id].again = true; return; }
  const job = inflight[id] = { again: false };
  renderSync();
  try {
    if (id !== 'settings' && S.deleted.has(id) && !S.sessions[id]) {
      await refFor(id).delete();
      S.deleted.delete(id); S.dirty.delete(id);
    } else {
      const body = id === 'settings' ? S.settings : S.sessions[id];
      if (body) {
        const ver = body.updatedAt;
        await refFor(id).set(JSON.parse(JSON.stringify(body)));
        const cur = id === 'settings' ? S.settings : S.sessions[id];
        if (cur && cur.updatedAt === ver) S.dirty.delete(id);
      } else S.dirty.delete(id);
    }
    S.syncErr = null;
    saveLocalSoon();
  } catch (e) {
    S.syncErr = (e && e.code) || 'unavailable';
    if (S.syncErr === 'quota_exceeded') toast('Cloud storage is full — this change is kept on this device.');
    clearTimeout(retryTimer); retryTimer = setTimeout(flushAll, 15000);
  } finally {
    delete inflight[id];
    if (job.again) flush(id);
    renderSync();
  }
}
function flushAll() { new Set([...S.dirty, ...S.deleted]).forEach((id) => flush(id)); }
window.addEventListener('online', flushAll);

function backupInfo() {
  const logged = Object.values(S.sessions).filter(hasLogged);
  if (!logged.length) return { cls: '', text: 'On this phone' };
  const last = S.settings.lastBackupAt || 0;
  const now = Date.now(), week = 7 * 864e5;
  if (!last) {
    const first = logged.reduce((m, s) => Math.min(m, s.startedAt || s.updatedAt || now), now);
    return now - first > week ? { cls: 'warn', text: 'Not backed up' } : { cls: '', text: 'On this phone' };
  }
  const newest = logged.reduce((m, s) => Math.max(m, s.updatedAt || 0), 0);
  if (newest > last && now - last > week) return { cls: 'warn', text: 'Backup due' };
  return { cls: 'ok', text: 'Backed up' };
}
function syncInfo() {
  if (PLATFORM === 'pwa') return backupInfo();
  if (S.mode === 'loading') return { cls: 'busy', text: 'Connecting' };
  if (S.mode === 'local') return { cls: '', text: 'This device' };
  const pending = S.dirty.size + S.deleted.size;
  if (pending && S.syncErr) return { cls: 'warn', text: 'Offline · ' + pending + ' to sync' };
  if (pending) return { cls: 'busy', text: 'Saving' };
  if (!S.cloudReady && S.syncErr) return { cls: 'warn', text: 'Offline' };
  if (!S.cloudReady) return { cls: 'busy', text: 'Loading' };
  return { cls: 'ok', text: 'Synced' };
}
function syncChip() {
  const i = syncInfo();
  if (PLATFORM === 'pwa') return '<button class="sync ' + i.cls + '" data-sync data-act="tab" data-tab="more" aria-label="Backup status: ' + esc(i.text) + '"><i></i><span>' + esc(i.text) + '</span></button>';
  return '<span class="sync ' + i.cls + '" data-sync role="status"><i></i><span>' + esc(i.text) + '</span></span>';
}
function renderSync() {
  const i = syncInfo();
  document.querySelectorAll('[data-sync]').forEach((el) => {
    el.className = 'sync ' + i.cls;
    el.lastElementChild.textContent = i.text;
  });
}

/* =========================================================================
   Sessions, logs, history index
   ========================================================================= */
const sid = (round, dayId) => 'r' + round + '-' + dayId;
const viewRound = () => S.view.round || S.settings.round || 1;
const getS = (round, dayId) => S.sessions[sid(round, dayId)] || null;
const isPerf = (st) => !!(st && (st.done || (st.r !== '' && st.r != null)));
function hasLogged(s) { return !!(s && s.ex && Object.values(s.ex).some((l) => (l.sets || []).some(isPerf))); }
function status(s) {
  if (!s) return 'none';
  if (s.skipped) return 'skipped';
  if (s.finishedAt) return 'done';
  if (!hasLogged(s)) return 'none';
  if (Date.now() - (s.updatedAt || 0) > 12 * 3600e3) return 'done';
  return 'active';
}
function maxRound() {
  let m = S.settings.round || 1;
  for (const s of Object.values(S.sessions)) if (s && s.round > m) m = s.round;
  return m;
}
function templateSets(x) {
  const n = x.rows || 1, out = [];
  for (let i = 0; i < n; i++) {
    const nd = x.allDrops ? x.allDrops : (i === n - 1 && x.lastDrops ? x.lastDrops : 0);
    out.push({ t: 'work', w: '', r: '', done: false, rpe: '', drops: Array.from({ length: nd }, () => ({ w: '', r: '' })) });
  }
  return out;
}
function ensureS(round, dayId) {
  const id = sid(round, dayId);
  let s = S.sessions[id];
  if (!s) {
    const d = DAY[dayId], now = Date.now();
    s = S.sessions[id] = { v: 1, id, round, week: d.week, day: d.n, dayId, date: todayStr(), startedAt: now, finishedAt: null, skipped: false, bw: '', notes: '', ex: {}, updatedAt: now };
    S.deleted.delete(id);
  }
  return s;
}
function ensureLog(s, exId) {
  if (!s.ex[exId]) s.ex[exId] = { sets: templateSets(EX[exId]), note: '', swap: '' };
  return s.ex[exId];
}
function touch(s) { s.updatedAt = Date.now(); bump(); markDirty(s.id); }
function stamp(s) { return (s.date || '') + '|' + String(s.startedAt || 0).padStart(14, '0'); }

let IDX = null, IDXV = -1;
function idx() {
  if (IDX && IDXV === VER) return IDX;
  const byKey = {};
  for (const s of Object.values(S.sessions)) {
    if (!s || !s.ex || s.skipped) continue;
    const st = stamp(s);
    for (const exId of Object.keys(s.ex)) {
      const x = EX[exId]; if (!x) continue;
      const log = s.ex[exId];
      const sets = (log.sets || []).filter((z) => z.t !== 'warm' && isPerf(z));
      if (!sets.length) continue;
      (byKey[x.key] = byKey[x.key] || []).push({ s, x, log, sets, st });
    }
  }
  for (const k in byKey) byKey[k].sort((a, b) => (a.st < b.st ? 1 : a.st > b.st ? -1 : 0));
  IDX = { byKey }; IDXV = VER;
  return IDX;
}
function curStamp(s) { return s ? stamp(s) : todayStr() + '|' + String(Date.now()).padStart(14, '0'); }
function prevEntry(x, s) {
  const list = idx().byKey[x.key] || [], cur = curStamp(s);
  for (const e of list) { if (s && e.s.id === s.id) continue; if (e.st < cur) return e; }
  return null;
}
function slotPrev(x, round) {
  for (let r = round - 1; r >= 1; r--) {
    const s = getS(r, x.dayId);
    const log = s && !s.skipped && s.ex && s.ex[x.id];
    if (log && (log.sets || []).some((z) => z.t !== 'warm' && isPerf(z))) return { s, log, sets: log.sets.filter((z) => z.t !== 'warm' && isPerf(z)) };
  }
  return null;
}
const e1 = (st) => { const w = num(st.w), r = repsNum(st.r); return w > 0 && r > 0 && r <= 30 ? w * (1 + r / 30) : null; };
function bestBefore(x, s) {
  const list = idx().byKey[x.key] || [], cur = curStamp(s);
  let best = null;
  for (const e of list) {
    if (s && e.s.id === s.id) continue;
    if (e.st >= cur) continue;
    for (const z of e.sets) { const v = e1(z); if (v != null && (best == null || v > best)) best = v; }
  }
  return best;
}
function fmtSet(st, opts) {
  const unitless = (v) => (v === '' || v == null ? 'BW' : v);
  let t = unitless(st.w) + '×' + (st.r === '' || st.r == null ? '–' : st.r);
  if (!(opts && opts.noDrops)) for (const d of st.drops || []) if (d.w !== '' || d.r !== '') t += ' → ' + unitless(d.w) + '×' + (d.r || '–');
  return t;
}
function setsLine(sets, max) {
  max = max || 4;
  const parts = sets.slice(0, max).map((z) => fmtSet(z));
  if (sets.length > max) parts.push('+' + (sets.length - max));
  return parts.join(' · ');
}
function dayLabel(d) { return 'W' + d.week + ' ' + d.abbr; }
function sessionTitle(s) { const d = DAY[s.dayId]; return d ? 'Week ' + d.week + ' · ' + DAY_NAMES[d.abbr] : s.id; }
function sessionStats(s) {
  let sets = 0, vol = 0;
  for (const exId of Object.keys(s.ex || {})) {
    for (const z of s.ex[exId].sets || []) {
      if (z.t === 'warm' || !isPerf(z)) continue;
      sets++;
      const w = num(z.w), r = repsNum(z.r);
      if (w && r) vol += w * r;
      for (const d of z.drops || []) { const dw = num(d.w), dr = repsNum(d.r); if (dw && dr) vol += dw * dr; }
    }
  }
  return { sets, vol };
}
function sessionPRs(s) {
  const out = [];
  const d = DAY[s.dayId]; if (!d) return out;
  for (const x of d.exercises) {
    const log = s.ex && s.ex[x.id]; if (!log) continue;
    const best = bestBefore(x, s); if (best == null) continue;
    let top = null;
    for (const z of log.sets || []) { if (z.t === 'warm' || !isPerf(z)) continue; const v = e1(z); if (v != null && v > best + 0.01 && (!top || v > e1(top))) top = z; }
    if (top) out.push({ x, set: top });
  }
  return out;
}

/* =========================================================================
   Navigation
   ========================================================================= */
const scrollMem = {};
function go(hash) {
  scrollMem[S.view.tab] = window.scrollY;
  if (location.hash === '#' + hash) route(); else location.hash = hash;
}
function route() {
  if (!PROGRAM) { renderUnlock(); return; }
  const h = decodeURIComponent(location.hash.slice(1));
  const prevTab = S.view.tab;
  let m;
  if ((m = h.match(/^r(\d+)-(w\d+d\d)$/)) && DAY[m[2]]) {
    S.view.tab = 'day'; S.view.round = +m[1]; S.view.dayId = m[2];
  } else if (['program', 'log', 'lifts', 'more'].includes(h)) {
    S.view.tab = h;
  } else if (h.indexOf('lift-') === 0) {
    const k = h.slice(5).replace(/-/g, ' ');
    const key = Object.keys(KEY_NAME).find((kk) => slug(kk) === h.slice(5)) || k;
    S.view.tab = 'lift'; S.view.key = key;
  } else {
    S.view.tab = 'program';
  }
  render();
  const y = S.view.tab === 'day' && prevTab !== 'day' ? 0 : (scrollMem[S.view.tab] || 0);
  window.scrollTo(0, S.view.tab === prevTab ? window.scrollY : y);
  if (S.view.tab === 'day') wakeOn(); else wakeOff();
}
const slug = (k) => k.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
window.addEventListener('hashchange', route);

/* =========================================================================
   Render: shell
   ========================================================================= */
function captureFocus() {
  const a = document.activeElement;
  if (!a || !a.dataset || !a.dataset.fk) return null;
  let s0 = null, s1 = null;
  try { s0 = a.selectionStart; s1 = a.selectionEnd; } catch (e) { /* not a text field */ }
  return { fk: a.dataset.fk, s0, s1 };
}
function restoreFocus(f) {
  if (!f) return;
  const el = document.querySelector('[data-fk="' + CSS.escape(f.fk) + '"]');
  if (!el) return;
  el.focus({ preventScroll: true });
  try { if (f.s0 != null) el.setSelectionRange(f.s0, f.s1); } catch (e) { /* ignore */ }
}
function render() {
  const app = $('#app');
  const f = captureFocus();
  const t = S.view.tab;
  let html;
  if (t === 'day') html = viewDay();
  else if (t === 'log') html = viewLog();
  else if (t === 'lifts') html = viewLifts();
  else if (t === 'lift') html = viewLift();
  else if (t === 'more') html = viewMore();
  else html = viewProgram();
  app.innerHTML = html;
  document.body.classList.toggle('in-day', t === 'day');
  renderTabs();
  restoreFocus(f);
  if (t === 'lift') mountChart();
  tickClock();
}
function renderTabs() {
  const t = S.view.tab === 'lift' ? 'lifts' : S.view.tab;
  const R = S.settings.round || 1;
  const hasActive = DAYS.some((d) => status(getS(R, d.id)) === 'active');
  const tabs = [['program', 'Program', ICON.program], ['log', 'Log', ICON.log], ['lifts', 'Lifts', ICON.lifts], ['more', 'More', ICON.more]];
  $('#tabs').innerHTML = '<div class="in2">' + tabs.map(([k, l, ic]) =>
    '<button data-act="tab" data-tab="' + k + '"' + (t === k ? ' aria-current="page"' : '') + '>' + ic + '<span>' + l + '</span>' +
    (k === 'program' && hasActive ? '<i class="dot" aria-label="Workout in progress"></i>' : '') + '</button>').join('') + '</div>';
}

/* =========================================================================
   Program view
   ========================================================================= */
function nextUp(R) {
  let active = null;
  for (const d of DAYS) {
    const s = getS(R, d.id);
    if (status(s) === 'active' && (!active || s.updatedAt > active.s.updatedAt)) active = { day: d, s };
  }
  if (active) return { day: active.day, state: 'active', s: active.s };
  let last = -1;
  DAYS.forEach((d, i) => { const st = status(getS(R, d.id)); if (st === 'done' || st === 'skipped') last = i; });
  const nx = DAYS[last + 1];
  return nx ? { day: nx, state: 'next' } : { day: null, state: 'complete' };
}
function groupChips(d) {
  return d.summary.map((g) => '<span class="chip"><i class="pip tone-' + (GROUP_TONE[g.group] || 'white') + '"></i>' + esc(g.group) + ' ' + g.exercises + '</span>').join('');
}
function workSetsOf(d) { return d.exercises.reduce((a, x) => a + (x.rows || 0), 0); }
function exCount(d) { return new Set(d.exercises.map((x) => x.id.replace(/[a-c]$/, ''))).size; }

function viewProgram() {
  const R = viewRound();
  const up = nextUp(R);
  const done = DAYS.filter((d) => ['done', 'skipped'].includes(status(getS(R, d.id)))).length;
  const selWeek = S.view.week || (up.day ? up.day.week : 12);
  const mr = maxRound();
  let rounds = '';
  for (let r = 1; r <= mr; r++) rounds += '<button class="rchip" data-act="round" data-round="' + r + '" aria-pressed="' + (r === R) + '">Round ' + r + '</button>';
  rounds += '<button class="rchip add" data-act="newround">+ New round</button>';

  let upHtml;
  if (up.state === 'complete') {
    const outro = (WEEKS.find((w) => w.week === 12) || {}).outro || '';
    upHtml = '<section class="card upnext complete"><div class="eyebrow">Round ' + R + ' complete</div><h2 class="display">All 48 days done</h2>' +
      '<p>Meadows planned a two-week, very-low-intensity deload after week 12. ' + esc(outro) + '</p>' +
      (R === mr ? '<button class="btn primary block" data-act="newround">Start round ' + (R + 1) + '</button>' : '') + '</section>';
  } else {
    const d = up.day;
    const first = d.exercises.slice(0, 3).map((x) => x.name).join(', ') + (d.exercises.length > 3 ? '…' : '');
    const label = up.state === 'active' ? 'In progress · started ' + esc(relDate(up.s.date)) : 'Up next · Round ' + R;
    const btn = up.state === 'active' ? 'Resume workout' : 'Start workout';
    upHtml = '<section class="card upnext"><div class="row1"><span class="eyebrow">' + label + '</span><span class="eyebrow">' + done + '/48 days</span></div>' +
      '<h2 class="display">Week&nbsp;' + d.week + '&nbsp;· ' + DAY_NAMES[d.abbr] + '</h2>' +
      '<div class="focus"><i class="pip tone-' + FOCUS_TONE[d.focus] + '"></i>' + esc(d.focus) + '</div>' +
      '<div class="meta">' + groupChips(d) + '<span class="chip">' + workSetsOf(d) + ' sets</span></div>' +
      '<div class="first">' + esc(first) + '</div>' +
      '<button class="btn primary block" data-act="open" data-day="' + d.id + '" data-round="' + R + '">' + btn + '</button></section>';
  }

  let grid = '<section class="card grid" aria-label="Round ' + R + ' calendar"><div class="prog"><span class="display">Round ' + R + '</span><span class="muted tnum">' + done + ' of 48 days</span></div>' +
    '<div class="ghead"><span></span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>';
  for (const b of BLOCKS) {
    grid += '<div class="blk">' + b.label + '</div>';
    for (const wn of b.weeks) {
      const wk = WEEKS.find((w) => w.week === wn);
      grid += '<div class="grow' + (wn === selWeek ? ' sel' : '') + '"><button class="wk" data-act="week" data-week="' + wn + '" aria-label="Show week ' + wn + '">' + wn + '</button>';
      for (const d of wk.days) {
        const st = status(getS(R, d.id));
        const isNext = up.day && up.day.id === d.id && up.state === 'next';
        const cls = 'cell tone-' + FOCUS_TONE[d.focus] + (st === 'done' ? ' done' : st === 'active' ? ' active' : st === 'skipped' ? ' skip' : isNext ? ' next' : '');
        const lbl = 'Week ' + wn + ' ' + DAY_NAMES[d.abbr] + ', ' + d.focus + (st === 'none' ? '' : ', ' + (st === 'active' ? 'in progress' : st));
        grid += '<button class="' + cls + '" data-act="open" data-day="' + d.id + '" data-round="' + R + '" aria-label="' + esc(lbl) + '"><i class="pip tone-' + FOCUS_TONE[d.focus] + '"></i>' + FOCUS_ABBR[d.focus] + '</button>';
      }
      grid += '</div>';
    }
  }
  grid += '<div class="legend"><span><i class="pip tone-blue"></i><b>B</b> Back</span><span><i class="pip tone-yellow"></i><b>L</b> Legs</span><span><i class="pip tone-red"></i><b>C/S</b> Chest &amp; shoulders</span><span><i class="pip tone-green"></i><b>A</b> Arms</span></div></section>';

  const wk = WEEKS.find((w) => w.week === selWeek);
  const blk = selWeek <= 8 ? 'Back block · week ' + (selWeek - 4) + ' of 4' : 'Chest & shoulders block · week ' + (selWeek - 8) + ' of 4';
  let week = '<section class="week"><h2 class="display">Week ' + selWeek + ' <small>' + blk + '</small></h2>' + (wk.intro ? '<p class="intro">' + esc(wk.intro) + '</p>' : '') + '<ul class="days">';
  for (const d of wk.days) {
    const s = getS(R, d.id), st = status(s);
    const stTxt = st === 'done' ? 'Done<br>' + esc(fmtDate(s.date, { month: 'short', day: 'numeric' })) : st === 'active' ? 'In progress' : st === 'skipped' ? 'Skipped' : (up.day && up.day.id === d.id ? 'Up next' : '');
    const names = d.exercises.filter((x) => x.group !== 'Abs' && x.group !== 'Calves').map((x) => x.name);
    week += '<li><button class="dayrow" data-act="open" data-day="' + d.id + '" data-round="' + R + '"><span class="dn">' + d.abbr + '</span>' +
      '<span class="df"><i class="pip tone-' + FOCUS_TONE[d.focus] + '"></i>' + esc(d.focus) + ' <span class="cnt">· ' + exCount(d) + ' exercises · ' + workSetsOf(d) + ' sets</span></span>' +
      '<span class="ds ' + st + '">' + stTxt + '</span>' +
      '<span class="dl">' + esc(names.slice(0, 4).join(', ') + (names.length > 4 ? '…' : '')) + '</span></button></li>';
  }
  week += '</ul></section>';

  return '<header class="top"><div class="eyebrow">John Meadows · weeks 5–12</div>' + syncChip() + '<h1 class="display">Onslaught</h1></header>' + installHint() +
    '<div class="rounds" role="group" aria-label="Rounds">' + rounds + '</div>' + upHtml + grid + week;
}

/* =========================================================================
   Day (workout) view
   ========================================================================= */
function displayLabels(d) {
  const out = {};
  let n = 0;
  d.exercises.forEach((x) => {
    if (x.ss && x.ssPos > 1) out[x.id] = n + String.fromCharCode(96 + x.ssPos);
    else { n++; out[x.id] = x.ss ? n + 'a' : String(n); }
  });
  return out;
}
function groupLabelFor(d, x) {
  if (!x.ss) return x.group;
  const mates = d.exercises.filter((y) => y.ss === x.ss);
  return [...new Set(mates.map((y) => y.group))].join(' + ');
}
function viewDay() {
  const R = S.view.round, d = DAY[S.view.dayId];
  if (!d) return '<p class="emptynote">That day is not in the program.</p>';
  const s = getS(R, d.id), st = status(s);
  const wk = WEEKS.find((w) => w.week === d.week);
  const labels = displayLabels(d);

  let h = '<header class="dayhead"><button class="iconbtn" data-act="back" aria-label="Back to program">' + ICON.back + '</button>' +
    '<div class="t"><div class="t1">Week&nbsp;' + d.week + '&nbsp;· ' + d.abbr + '</div><div class="t2">' + esc(d.focus) + ' · Round ' + R + '</div></div>' +
    '<div class="right"><span class="clock" id="clock" aria-label="Workout time"></span>' + syncChip() + '</div></header>';

  h += '<div class="daymeta">';
  if (st === 'done') h += '<span class="state done">Done</span>';
  else if (st === 'skipped') h += '<span class="state skipped">Skipped</span>';
  else if (st === 'active') h += '<span class="state">In progress</span>';
  h += '<label for="sdate">Date <input type="date" id="sdate" data-sf="date" value="' + esc(s ? s.date : todayStr()) + '"></label>';
  h += '</div><div class="groups">' + groupChips(d) + '<span class="chip">' + workSetsOf(d) + ' work sets</span></div>';
  if (S.mode === 'local' && S.localReason === 'viewer') h += '<p class="banner">You can view this log but only its owner can save to it, so anything you enter stays on this device.</p>';

  const coach = [];
  if (d.n === 1 && wk.intro) coach.push(wk.intro);
  if (d.intro) coach.push(d.intro);
  if (coach.length) {
    const open = S.view.coach;
    h += '<section class="coach"><button data-act="coach" aria-expanded="' + open + '"><span>Coach’s notes for this day</span><span aria-hidden="true">' + (open ? '−' : '+') + '</span></button>' +
      (open ? '<div class="body">' + coach.map((p) => '<p>' + linkify(p) + '</p>').join('') + '</div>' : '') + '</section>';
  }

  let lastLabel = null, i = 0;
  const shownNotes = new Set();
  while (i < d.exercises.length) {
    const x = d.exercises[i];
    const gl = groupLabelFor(d, x);
    if (gl !== lastLabel) {
      const notes = gl.split(' + ').map((g) => (d.sectionNotes[g] || []).filter((n) => !shownNotes.has(n))).flat();
      notes.forEach((n) => shownNotes.add(n));
      const tone = GROUP_TONE[gl.split(' + ')[0]] || 'white';
      h += '<div class="ghead"><i class="pip tone-' + tone + '"></i>' + esc(gl) + (notes.length ? ' <span class="gnote">' + esc(notes.join(' ')) + '</span>' : '') + '</div>';
      lastLabel = gl;
    }
    if (x.ss) {
      const mates = d.exercises.filter((y) => y.ss === x.ss);
      h += '<div class="ss"><div class="sshead"><b>Superset</b><span>' + esc(mates[0].ssName ? mates[0].ssName : 'Alternate sets between these') + '</span></div>';
      mates.forEach((y) => { h += cardHTML(y, s, R, labels[y.id]); });
      h += '</div>';
      i += mates.length;
    } else {
      h += cardHTML(x, s, R, labels[x.id]);
      i++;
    }
  }
  h += finishHTML(d, s, R, st);
  return h;
}

function prevInSession(sets, i) {
  for (let k = i - 1; k >= 0; k--) { const z = sets[k]; if (z && z.t !== 'warm' && (z.w !== '' || z.r !== '')) return z; }
  return null;
}
function refFor2(x, s, R) { return slotPrev(x, R) || prevEntry(x, s); }
function cardHTML(x, s, R, label) {
  const log = s && s.ex && s.ex[x.id];
  const sets = log ? log.sets : templateSets(x);
  const prev = prevEntry(x, s);
  const slot = slotPrev(x, R);
  const ref = slot || prev;
  const refSets = ref ? ref.sets : [];
  const best = bestBefore(x, s);
  const unit = S.settings.unit;
  const open = !!S.view.open[x.id];
  const descX = x.descRef ? EX[x.descRef] : x;

  let h = '<article class="ex" id="card-' + x.id + '" data-card="' + x.id + '">';
  h += '<div class="h"><span class="num">' + esc(label) + '</span><div><div class="name">' +
    (log && log.swap ? esc(log.swap) + ' <s>' + esc(x.name) + '</s>' : esc(x.name)) + '</div>' +
    '<div class="rx">' + esc(x.rx) + '</div></div>' +
    '<button class="menu" data-act="exmenu" data-ex="' + x.id + '" aria-label="More for ' + esc(x.name) + '">' + ICON.dots + '</button></div>';
  const tags = [];
  if (x.goal) tags.push('<span class="chip">' + esc(x.goal) + '</span>');
  if (x.rpe) tags.push('<span class="chip">RPE ' + esc(RPE_SHORT[x.rpe] || x.rpe) + '</span>');
  if (x.rest) tags.push('<span class="chip">Rest ' + (x.rest >= 60 && x.rest % 60 === 0 ? x.rest / 60 + ' min' : x.rest + 's') + '</span>');
  if (tags.length) h += '<div class="tags">' + tags.join('') + '</div>';

  const vid = descX.video;
  h += '<div class="links"><button class="lnk" data-act="howto" data-ex="' + x.id + '" aria-expanded="' + open + '">' + (open ? 'Hide instructions' : 'Instructions') + '</button>' +
    (vid ? '<a class="lnk" href="' + esc(vid) + '" target="_blank" rel="noopener">' + ICON.play + 'Demo video</a>' : '') +
    '<button class="lnk" data-act="lift" data-key="' + esc(x.key) + '">History</button></div>';
  if (open) {
    h += '<div class="howto">' + (descX.desc ? '<p>' + linkify(descX.desc) + '</p>' : '') +
      (descX.notes && descX.notes.length ? '<ul>' + descX.notes.map((n) => '<li>' + linkify(n) + '</li>').join('') + '</ul>' : '') +
      '<div class="meta">Total work sets as written: ' + esc(x.setsLabel) + (RPE_SHORT[x.rpe] ? ' · RPE as written: ' + esc(x.rpe) : '') + '</div></div>';
  }

  if (prev || slot) {
    h += '<div class="last">';
    if (prev) h += '<div><b>Last</b> ' + esc(dayLabel(DAY[prev.s.dayId])) + ' · ' + esc(relDate(prev.s.date)) + ' — <span class="v">' + esc(setsLine(prev.sets)) + '</span></div>';
    if (slot && (!prev || slot.s.id !== prev.s.id)) h += '<div><b>Round ' + slot.s.round + '</b> same day — <span class="v">' + esc(setsLine(slot.sets)) + '</span></div>';
    h += '</div>';
  }

  h += '<div class="sets" role="group" aria-label="Sets for ' + esc(x.name) + '">';
  if (!sets.length) h += '<div class="empty-sets">No sets yet.</div>';
  else h += '<div class="hdr" aria-hidden="true"><span>Set</span><span>' + esc(unit) + '</span><span>Reps</span><span></span></div>';
  let wi = 0;
  sets.forEach((st, i) => {
    const warm = st.t === 'warm';
    const wIdx = warm ? -1 : wi++;
    const target = warm ? '' : (x.targets && x.targets[wIdx] != null ? x.targets[wIdx] : x.reps);
    const rs = warm ? null : (refSets[wIdx] || prevInSession(sets, i));
    const phW = rs && rs.w !== '' ? rs.w : (warm ? '' : unit);
    const phR = rs && rs.r !== '' && (refSets[wIdx] || !/^\d+$/.test(String(target))) ? rs.r : (/^\d+$/.test(String(target)) ? String(target) : (warm ? '' : 'reps'));
    const isPR = !warm && best != null && isPerf(st) && (e1(st) || 0) > best + 0.01;
    const n = warm ? 'W' : wIdx + 1;
    const nm = warm ? 'Warm-up set' : 'Set ' + n;
    h += '<div class="srow' + (st.done ? ' on' : '') + (warm ? ' warm' : '') + '">' +
      '<button class="setno" data-act="setmenu" data-ex="' + x.id + '" data-i="' + i + '" aria-label="' + nm + ' options">' +
      '<span class="n">' + n + (isPR ? '<span class="prtag">PR</span>' : '') + '</span>' +
      (target ? '<span class="tg">' + esc(targetLabel(target)) + '</span>' : '') +
      (st.rpe ? '<span class="rpe">@' + esc(st.rpe) + '</span>' : '') + '</button>' +
      '<input class="in" id="w-' + x.id + '-' + i + '" data-fk="w|' + x.id + '|' + i + '" data-ex="' + x.id + '" data-i="' + i + '" data-f="w" inputmode="decimal" enterkeyhint="next" autocomplete="off" value="' + esc(st.w) + '" placeholder="' + esc(phW) + '" aria-label="' + nm + ' weight">' +
      '<input class="in" id="r-' + x.id + '-' + i + '" data-fk="r|' + x.id + '|' + i + '" data-ex="' + x.id + '" data-i="' + i + '" data-f="r" inputmode="numeric" enterkeyhint="done" autocomplete="off" value="' + esc(st.r) + '" placeholder="' + esc(phR) + '" aria-label="' + nm + ' reps">' +
      '<button class="chk" data-act="done" data-ex="' + x.id + '" data-i="' + i + '" aria-pressed="' + !!st.done + '" aria-label="' + (st.done ? 'Undo ' : 'Complete ') + nm.toLowerCase() + '">' + ICON.check + '</button></div>';
    (st.drops || []).forEach((dp, j) => {
      const rd = rs && rs.drops && rs.drops[j];
      h += '<div class="srow drop"><span class="dl">↳ Drop</span>' +
        '<input class="in" id="dw-' + x.id + '-' + i + '-' + j + '" data-fk="dw|' + x.id + '|' + i + '|' + j + '" data-ex="' + x.id + '" data-i="' + i + '" data-di="' + j + '" data-f="w" inputmode="decimal" autocomplete="off" value="' + esc(dp.w) + '" placeholder="' + esc(rd && rd.w ? rd.w : unit) + '" aria-label="' + nm + ' drop ' + (j + 1) + ' weight">' +
        '<input class="in" id="dr-' + x.id + '-' + i + '-' + j + '" data-fk="dr|' + x.id + '|' + i + '|' + j + '" data-ex="' + x.id + '" data-i="' + i + '" data-di="' + j + '" data-f="r" inputmode="numeric" autocomplete="off" value="' + esc(dp.r) + '" placeholder="' + esc(rd && rd.r ? rd.r : 'reps') + '" aria-label="' + nm + ' drop ' + (j + 1) + ' reps">' +
        '<button class="xbtn" data-act="rmdrop" data-ex="' + x.id + '" data-i="' + i + '" data-di="' + j + '" aria-label="Remove drop ' + (j + 1) + '">×</button></div>';
    });
  });
  h += '</div>';

  const noteOpen = S.view.notes[x.id] || (log && log.note);
  h += '<div class="exfoot"><button class="btn" data-act="addset" data-ex="' + x.id + '">+ Set</button>' +
    '<button class="btn" data-act="adddrop" data-ex="' + x.id + '">+ Drop</button>' +
    (noteOpen ? '' : '<button class="btn" data-act="note" data-ex="' + x.id + '">Note</button>') + '</div>';
  if (noteOpen) h += '<div class="note"><textarea class="ta" id="note-' + x.id + '" data-fk="note|' + x.id + '" data-xf="note" data-ex="' + x.id + '" rows="2" placeholder="Seat setting, grip, how it felt…" aria-label="Note for ' + esc(x.name) + '">' + esc(log ? log.note : '') + '</textarea></div>';
  h += '</article>';
  return h;
}

function finishHTML(d, s, R, st) {
  const unit = S.settings.unit;
  let h = '<section class="card finish" id="finish">';
  if (st === 'done' && s) {
    const ss = sessionStats(s);
    const dur = s.finishedAt && s.startedAt ? s.finishedAt - s.startedAt : 0;
    const prs = sessionPRs(s);
    h += '<h3>Workout logged</h3><div class="summary">' +
      '<div class="stat"><div class="v">' + ss.sets + '</div><div class="l">work sets</div></div>' +
      '<div class="stat"><div class="v">' + (ss.vol ? fmtNum(ss.vol) : '–') + '</div><div class="l">' + esc(unit) + ' volume</div></div>' +
      '<div class="stat"><div class="v">' + (dur > 0 && dur < 6 * 3600e3 ? fmtDur(dur) : prs.length) + '</div><div class="l">' + (dur > 0 && dur < 6 * 3600e3 ? 'duration' : 'PRs') + '</div></div></div>' +
      (prs.length ? '<p class="muted">PRs: ' + esc(prs.map((p) => p.x.name + ' ' + fmtSet(p.set, { noDrops: true })).join(' · ')) + '</p>' : '');
  } else {
    h += '<h3>Finish up</h3>';
  }
  h += '<label class="fld" for="sbw">Bodyweight<span class="bw"><input class="in" id="sbw" data-fk="sbw" data-sf="bw" inputmode="decimal" autocomplete="off" value="' + esc(s ? s.bw : '') + '" placeholder="–"><span>' + esc(unit) + '</span></span></label>';
  h += '<label class="fld" for="snotes">Workout notes<textarea class="ta" id="snotes" data-fk="snotes" data-sf="notes" rows="3" placeholder="Energy, sleep, pumps, anything worth remembering">' + esc(s ? s.notes : '') + '</textarea></label>';
  if (st === 'done' && s && s.finishedAt) h += '<button class="btn block" data-act="reopen">Reopen workout</button>';
  else if (st !== 'skipped') h += '<button class="btn primary block" data-act="finish">Finish workout</button>';
  h += '<div class="row-btns">' +
    (st === 'skipped' ? '<button class="btn primary" data-act="unskip">Undo skip</button>' : '<button class="btn" data-act="skip">Skip this day</button>') +
    (s ? '<button class="btn danger" data-act="clearday">Clear this day</button>' : '') + '</div>';
  h += '</section>';
  return h;
}
function rerenderCard(exId) {
  const x = EX[exId], el = document.getElementById('card-' + exId);
  if (!x || !el) { render(); return; }
  const d = DAY[x.dayId];
  const f = captureFocus();
  const wrap = document.createElement('div');
  wrap.innerHTML = cardHTML(x, getS(S.view.round, d.id), S.view.round, displayLabels(d)[x.id]);
  el.replaceWith(wrap.firstElementChild);
  restoreFocus(f);
  updateDayChrome();
}
function updateDayChrome() {
  renderTabs();
  tickClock();
}
function tickClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const s = S.view.tab === 'day' ? getS(S.view.round, S.view.dayId) : null;
  if (!s || !s.startedAt || s.finishedAt || s.skipped || s.date !== todayStr() || Date.now() - s.startedAt > 6 * 3600e3 || !hasLogged(s)) { el.textContent = ''; return; }
  el.textContent = fmtClock(Date.now() - s.startedAt);
}
setInterval(tickClock, 1000);

/* =========================================================================
   Log view
   ========================================================================= */
function viewLog() {
  const all = Object.values(S.sessions).filter((s) => s && DAY[s.dayId] && (status(s) !== 'none'));
  all.sort((a, b) => (stamp(a) < stamp(b) ? 1 : -1));
  const done = all.filter((s) => status(s) === 'done');
  const now = parseDate(todayStr());
  const last7 = done.filter((s) => { const d = parseDate(s.date); return d && (now - d) / 864e5 < 7; }).length;
  const totalSets = done.reduce((a, s) => a + sessionStats(s).sets, 0);
  let h = '<header class="pagehead"><h1 class="display">Log</h1>' + syncChip() + '</header>';
  h += '<div class="statrow"><div class="stat"><div class="v">' + done.length + '</div><div class="l">workouts</div></div>' +
    '<div class="stat"><div class="v">' + last7 + '</div><div class="l">last 7 days</div></div>' +
    '<div class="stat"><div class="v">' + fmtNum(totalSets) + '</div><div class="l">work sets</div></div></div>';
  if (!all.length) return h + '<p class="emptynote">Workouts you log show up here, newest first. Open a day from the Program tab and enter your first set to get started.</p>';
  let lastMonth = '';
  h += '<div>';
  for (const s of all) {
    const d = DAY[s.dayId];
    const mo = fmtDate(s.date, { month: 'long', year: 'numeric' });
    if (mo !== lastMonth) { if (lastMonth) h += '</ul>'; h += '<div class="datehead">' + esc(mo) + '</div><ul class="list">'; lastMonth = mo; }
    const st = status(s), ss = sessionStats(s);
    const span = s.finishedAt && s.startedAt ? s.finishedAt - s.startedAt : 0;
    const dur = span >= 60000 && span < 6 * 3600e3 ? ' · ' + fmtDur(span) : '';
    h += '<li><button class="item" data-act="open" data-day="' + s.dayId + '" data-round="' + s.round + '">' +
      '<span class="a"><i class="pip tone-' + FOCUS_TONE[d.focus] + '"></i><span>' + esc(fmtDate(s.date)) + ' — ' + esc(d.focus) + '</span></span>' +
      '<span class="b">Round ' + s.round + ' · Week ' + d.week + ' ' + DAY_NAMES[d.abbr] + (st === 'active' ? ' · in progress' : st === 'skipped' ? ' · skipped' : '') + dur + (s.notes ? ' · ' + esc(s.notes.slice(0, 60)) + (s.notes.length > 60 ? '…' : '') : '') + '</span>' +
      '<span class="c">' + (st === 'skipped' ? '' : '<b>' + ss.sets + '</b>sets') + '</span></button></li>';
  }
  h += '</ul></div>';
  return h;
}

/* =========================================================================
   Lifts views
   ========================================================================= */
function liftRows(q) {
  const I = idx().byKey;
  q = (q || '').trim().toLowerCase();
  const byGroup = {};
  for (const key of Object.keys(KEY_NAME)) {
    const name = KEY_NAME[key];
    if (q && name.toLowerCase().indexOf(q) < 0 && key.indexOf(q) < 0) continue;
    const g = KEY_EX[key][0].group;
    (byGroup[g] = byGroup[g] || []).push(key);
  }
  let h = '';
  let any = false;
  for (const g of GROUP_ORDER) {
    const keys = byGroup[g]; if (!keys) continue;
    keys.sort((a, b) => {
      const la = I[a] ? I[a][0].st : '', lb = I[b] ? I[b][0].st : '';
      if (la !== lb) return la < lb ? 1 : -1;
      return KEY_NAME[a].localeCompare(KEY_NAME[b]);
    });
    any = true;
    h += '<div class="lgroup"><i class="pip tone-' + GROUP_TONE[g] + '"></i>' + g + '</div><ul class="list">';
    for (const key of keys) {
      const ent = I[key] || [];
      const days = KEY_EX[key].length;
      let best = null;
      for (const e of ent) for (const z of e.sets) { const v = e1(z); if (v != null && (best == null || v > best)) best = v; }
      const sub = ent.length ? 'Last ' + esc(relDate(ent[0].s.date)) + ' · ' + esc(setsLine(ent[0].sets, 3)) : 'Not logged yet · in ' + days + ' day' + (days > 1 ? 's' : '') + ' of the program';
      h += '<li><button class="item" data-act="lift" data-key="' + esc(key) + '"><span class="a"><span>' + esc(KEY_NAME[key]) + '</span></span><span class="b">' + sub + '</span>' +
        '<span class="c">' + (best ? '<b>' + fmtNum(best) + '</b>est. 1RM' : ent.length ? '<b>' + ent.length + '</b>logged' : '') + '</span></button></li>';
    }
    h += '</ul>';
  }
  if (!any) h = '<p class="emptynote">No exercise matches “' + esc(q) + '”.</p>';
  return h;
}
function viewLifts() {
  return '<header class="pagehead"><h1 class="display">Lifts</h1>' + syncChip() + '</header>' +
    '<input class="search" id="liftq" data-fk="liftq" type="search" placeholder="Search ' + Object.keys(KEY_NAME).length + ' exercises" value="' + esc(S.view.q) + '" aria-label="Search exercises" autocomplete="off">' +
    '<div id="liftlist">' + liftRows(S.view.q) + '</div>';
}
function liftSeries(key) {
  const ent = (idx().byKey[key] || []).slice().reverse();
  const weighted = ent.some((e) => e.sets.some((z) => num(z.w) > 0));
  const pts = [];
  for (const e of ent) {
    let v = null, top = null;
    for (const z of e.sets) {
      const val = weighted ? e1(z) : repsNum(z.r);
      if (val != null && (v == null || val > v)) { v = val; top = z; }
    }
    if (v != null) pts.push({ v, e, top });
  }
  return { weighted, pts };
}
function viewLift() {
  const key = S.view.key, name = KEY_NAME[key] || key;
  const ent = idx().byKey[key] || [];
  const ex0 = (KEY_EX[key] || [])[0];
  const tone = ex0 ? GROUP_TONE[ex0.group] : 'white';
  const ser = liftSeries(key);
  const unit = S.settings.unit;
  let h = '<header class="lifthead"><button class="iconbtn" data-act="tab" data-tab="lifts" aria-label="Back to lifts">' + ICON.back + '</button><div><div class="eyebrow"><i class="pip tone-' + tone + '"></i> ' + esc(ex0 ? ex0.group : '') + '</div><h1 class="display">' + esc(name) + '</h1></div></header>';
  let heavy = null, best = null;
  for (const e of ent) for (const z of e.sets) {
    if (num(z.w) != null && (!heavy || num(z.w) > num(heavy.w) || (num(z.w) === num(heavy.w) && repsNum(z.r) > repsNum(heavy.r)))) heavy = z;
    const v = e1(z); if (v != null && (best == null || v > best)) best = v;
  }
  h += '<div class="statrow"><div class="stat"><div class="v">' + ent.length + '</div><div class="l">times logged</div></div>' +
    '<div class="stat"><div class="v">' + (heavy ? esc(fmtSet(heavy, { noDrops: true })) : '–') + '</div><div class="l">heaviest set</div></div>' +
    '<div class="stat"><div class="v">' + (best ? fmtNum(best) : '–') + '</div><div class="l">best est. 1RM</div></div></div>';
  if (ser.pts.length >= 2) {
    h += '<section class="card chart tone-' + tone + '" id="chart" data-key="' + esc(key) + '"><div class="ttl">' + (ser.weighted ? 'Best estimated 1-rep max per session (' + esc(unit) + ', Epley)' : 'Most reps in a set per session') + '</div><div class="plot"></div></section>';
  } else if (ent.length) {
    h += '<p class="emptynote">Log this exercise one more time to see a trend line.</p>';
  }
  const days = KEY_EX[key] || [];
  h += '<div class="sect"><h2>In the program</h2><div class="inprog">' + days.map((x) => '<button data-act="open" data-day="' + x.dayId + '" data-round="' + viewRound() + '">' + esc(dayLabel(DAY[x.dayId])) + '</button>').join('') + '</div></div>';
  h += '<div class="sect"><h2>Sessions</h2>';
  if (!ent.length) h += '<p class="emptynote">Nothing logged for this exercise yet.</p>';
  else {
    h += '<ul class="list sesslist">';
    for (const e of ent) {
      const d = DAY[e.s.dayId];
      h += '<li><button class="item" data-act="open" data-day="' + e.s.dayId + '" data-round="' + e.s.round + '"><span class="a"><span>' + esc(fmtDate(e.s.date)) + '</span></span>' +
        '<span class="b">R' + e.s.round + ' · ' + esc(dayLabel(d)) + (e.log.swap ? ' · did ' + esc(e.log.swap) : '') + '<br><span class="tnum" style="color:var(--ink)">' + esc(e.sets.map((z) => fmtSet(z) + (z.rpe ? ' @' + z.rpe : '')).join(' · ')) + '</span>' + (e.log.note ? '<br>' + esc(e.log.note) : '') + '</span></button></li>';
    }
    h += '</ul>';
  }
  h += '</div>';
  return h;
}
function niceTicks(min, max, count) {
  if (min === max) { min -= 5; max += 5; }
  const span = max - min, step0 = span / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || 10 * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const t = []; for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(6));
  return t;
}
function mountChart() {
  const wrap = document.getElementById('chart'); if (!wrap) return;
  const ser = liftSeries(wrap.dataset.key);
  const pts = ser.pts; if (pts.length < 2) return;
  const W = 340, H = 170, L = 40, Rr = 44, T = 12, B = 26;
  const vals = pts.map((p) => p.v);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals), 3);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = (i) => L + (pts.length === 1 ? 0 : i * (W - L - Rr) / (pts.length - 1));
  const Y = (v) => T + (H - T - B) * (1 - (v - y0) / (y1 - y0 || 1));
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Trend for ' + esc(KEY_NAME[wrap.dataset.key] || '') + '" tabindex="0">';
  for (const t of ticks) svg += '<line x1="' + L + '" x2="' + (W - Rr + 8) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" style="stroke:var(--line)" stroke-width="1"/>' +
    '<text x="' + (L - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end" font-size="11" style="fill:var(--muted)">' + fmtNum(t) + '</text>';
  const first = pts[0].e.s.date, last = pts[pts.length - 1].e.s.date;
  svg += '<text x="' + L + '" y="' + (H - 6) + '" font-size="11" style="fill:var(--muted)">' + esc(fmtDate(first, { month: 'short', day: 'numeric' })) + '</text>' +
    '<text x="' + X(pts.length - 1) + '" y="' + (H - 6) + '" text-anchor="end" font-size="11" style="fill:var(--muted)">' + esc(fmtDate(last, { month: 'short', day: 'numeric' })) + '</text>';
  svg += '<polyline fill="none" style="stroke:var(--tone)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + pts.map((p, i) => X(i) + ',' + Y(p.v)).join(' ') + '"/>';
  pts.forEach((p, i) => { svg += '<circle cx="' + X(i) + '" cy="' + Y(p.v) + '" r="' + (i === pts.length - 1 ? 5 : 4) + '" style="fill:var(--tone);stroke:var(--surface)" stroke-width="2"/>'; });
  const lp = pts[pts.length - 1];
  svg += '<text x="' + (X(pts.length - 1) + 9) + '" y="' + (Y(lp.v) + 4) + '" font-size="12" font-weight="700" style="fill:var(--ink)">' + fmtNum(lp.v) + '</text>';
  svg += '<line class="xh" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" style="stroke:var(--ink-2)" stroke-width="1" visibility="hidden"/>';
  svg += '<rect x="' + (L - 10) + '" y="0" width="' + (W - L - Rr + 20) + '" height="' + H + '" fill="transparent" class="hit"/></svg>';
  const plot = wrap.querySelector('.plot');
  plot.innerHTML = svg;
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; wrap.appendChild(tip);
  const el = plot.querySelector('svg'), xh = el.querySelector('.xh');
  let cur = -1;
  const show = (i) => {
    cur = Math.max(0, Math.min(pts.length - 1, i));
    const p = pts[cur];
    xh.setAttribute('x1', X(cur)); xh.setAttribute('x2', X(cur)); xh.setAttribute('visibility', 'visible');
    tip.textContent = '';
    const b = document.createElement('b'); b.textContent = fmtNum(p.v) + (ser.weighted ? ' ' + S.settings.unit : ' reps');
    const l2 = document.createElement('div'); l2.textContent = fmtDate(p.e.s.date) + ' · ' + fmtSet(p.top, { noDrops: true });
    tip.appendChild(b); tip.appendChild(l2);
    const r = el.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const px = r.left - wr.left + X(cur) * r.width / W, py = r.top - wr.top + Y(p.v) * r.height / H - 10;
    tip.style.left = Math.max(70, Math.min(wr.width - 70, px)) + 'px'; tip.style.top = py + 'px'; tip.hidden = false;
  };
  const hide = () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); };
  const pick = (ev) => { const r = el.getBoundingClientRect(); const sx = (ev.clientX - r.left) * W / r.width; let bi = 0, bd = 1e9; pts.forEach((p, i) => { const dd = Math.abs(X(i) - sx); if (dd < bd) { bd = dd; bi = i; } }); show(bi); };
  el.addEventListener('pointermove', pick); el.addEventListener('pointerdown', pick); el.addEventListener('pointerleave', hide);
  el.addEventListener('focus', () => show(pts.length - 1)); el.addEventListener('blur', hide);
  el.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowLeft') { show(cur - 1); ev.preventDefault(); } if (ev.key === 'ArrowRight') { show(cur + 1); ev.preventDefault(); } });
}

/* =========================================================================
   More view
   ========================================================================= */
function toggleRow(k, label, desc) {
  return '<div class="setting"><div><div class="k">' + label + '</div>' + (desc ? '<div class="d">' + desc + '</div>' : '') + '</div>' +
    '<button class="toggle" role="switch" aria-checked="' + !!S.settings[k] + '" data-act="toggle" data-k="' + k + '" aria-label="' + esc(label) + '"></button></div>';
}
function viewMore() {
  const st = S.settings;
  let storage;
  if (PLATFORM === 'pwa') storage = 'Your log is saved on this ' + (IS_IOS ? 'iPhone' : 'device') + ', inside the app, and works with no signal. Back it up every week or two: tap Backup and choose Save to Files (iCloud Drive). Deleting the app from your Home Screen deletes its data.';
  else if (S.mode === 'cloud') storage = 'Your log is saved to your Claude account and syncs between your phone and computer. It is also cached on this device, so sets you enter with no signal sync when you are back online.';
  else if (S.localReason === 'viewer') storage = 'You are viewing someone else’s logbook. Anything you enter is saved in this browser only.';
  else storage = 'Your log is saved in this browser only right now. Open the logbook from claude.ai while signed in to sync it to your account.';
  let h = '<header class="pagehead"><h1 class="display">More</h1>' + syncChip() + '</header>';
  h += installHint() + '<p class="banner">' + esc(storage) + '</p>';
  h += '<section class="sect"><h2>Training</h2><div class="card">' +
    '<div class="setting"><div><div class="k">Weight unit</div></div><div class="seg" role="group" aria-label="Weight unit">' +
    ['lb', 'kg'].map((u) => '<button data-act="set" data-k="unit" data-v="' + u + '" aria-pressed="' + (st.unit === u) + '">' + u + '</button>').join('') + '</div></div>' +
    '<div class="setting wide"><div><div class="k">Default rest</div><div class="d">Meadows: 60–90 seconds for most sets, up to 3 minutes for heavy, explosive or all-out sets. Exercises that name their own rest use it instead.</div></div><div class="seg" role="group" aria-label="Default rest">' +
    [60, 75, 90, 120, 180].map((r) => '<button data-act="set" data-k="rest" data-v="' + r + '" aria-pressed="' + (st.rest === r) + '">' + (r % 60 === 0 ? r / 60 + 'm' : r + 's') + '</button>').join('') + '</div></div>' +
    toggleRow('autoRest', 'Start rest timer on completed sets', '') +
    toggleRow('sound', 'Beep when rest is over', 'Your phone also vibrates where the browser allows it.') +
    toggleRow('wake', 'Keep screen on during workouts', 'Works where the browser allows it.') + '</div></section>';
  const mr = maxRound();
  h += '<section class="sect"><h2>Rounds</h2><div class="card"><div class="setting"><div><div class="k">Current round: ' + st.round + '</div><div class="d">Each round runs weeks 5–12 once (48 training days). Earlier rounds stay in your log for comparison.</div></div>' +
    '<button class="btn small" data-act="newround">Start round ' + (mr + 1) + '</button></div></div></section>';
  h += '<section class="sect"><h2>Your data</h2><div class="card">' +
    '<div class="setting"><div><div class="k">Export for Excel</div><div class="d">One row per set: round, week, day, date, exercise, weight, reps, drops, RPE and notes.</div></div><button class="btn small" data-act="csv">CSV</button></div>' +
    '<div class="setting"><div><div class="k">Back up everything</div><div class="d">A complete copy you can restore later.' + (PLATFORM === 'pwa' ? ' Last backup: ' + (S.settings.lastBackupAt ? esc(new Date(S.settings.lastBackupAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })) : 'never') + '.' : '') + '</div></div><button class="btn small" data-act="json">Backup</button></div>' +
    '<div class="setting"><div><div class="k">Restore a backup</div><div class="d">Merges with what is here; the newer copy of each workout wins.</div></div><label class="btn small" for="importfile">Restore<input type="file" id="importfile" accept=".json,application/json" class="sr"></label></div>' +
    '</div></section>';
  h += '<section class="sect"><h2>RPE chart</h2><div class="card"><table class="rpetable"><tbody>' + RPE_CHART.map(([k, v]) => '<tr><td>' + k + '</td><td>' + esc(v) + '</td></tr>').join('') + '</tbody></table>' +
    '<p class="prose" style="padding-top:10px">Meadows generally counts sets at RPE 7 and above as working sets.</p></div></section>';
  h += '<section class="sect"><h2>Program notes</h2><div class="card prose">' +
    '<p><b>Rest breaks.</b> Generally 60–90 seconds. For very heavy explosive work or very intense sets you may need 3 minutes. Don’t start a set out of breath, but it’s fine to be breathing a little hard.</p>' +
    '<p><b>Bands</b> (optional): 1 orange micro mini for face pulls, 2 red long pro minis for chest presses, 1 red short pro mini for spidercrawls, and 2 grey average bands if you want reverse-band work.</p>' +
    '<p><b>The blocks.</b> Weeks 5–8 hit back three times a week (Mon, Thu, Sat). Weeks 9–12 do the same for chest and shoulders. Legs and arms get one day each.</p>' +
    '<p>Exercise instructions, goals, RPE targets and demo links are from John Meadows’ Onslaught program.</p></div></section>';
  return h;
}

/* =========================================================================
   Sheets, toasts, confirm
   ========================================================================= */
let sheetReturnFocus = null;
function openSheet(inner) {
  const el = $('#sheet');
  sheetReturnFocus = document.activeElement;
  el.innerHTML = '<div class="scrim" data-act="closesheet"></div><div class="panel" role="dialog" aria-modal="true"><div class="inner">' + inner + '</div></div>';
  el.hidden = false;
  const f = el.querySelector('input, button:not(.scrim)');
  if (f) f.focus({ preventScroll: true });
}
function closeSheet() {
  const el = $('#sheet');
  el.hidden = true; el.innerHTML = '';
  if (sheetReturnFocus && document.contains(sheetReturnFocus)) sheetReturnFocus.focus({ preventScroll: true });
}
let pendingConfirm = null;
function confirmSheet(title, body, ok, fn, danger) {
  pendingConfirm = fn;
  openSheet('<h3>' + esc(title) + '</h3><p class="sub">' + esc(body) + '</p><div class="two"><button class="btn" data-act="closesheet">Cancel</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-act="confirm">' + esc(ok) + '</button></div>');
}
let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* =========================================================================
   Rest timer, sound, wake lock
   ========================================================================= */
const T = { end: 0, total: 0, iv: 0, fired: false };
let AC = null;
function audioUnlock() {
  try {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    AC = AC || new A();
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { AC = null; }
}
function beep() {
  if (!S.settings.sound || !AC) return;
  try {
    const t0 = AC.currentTime + 0.02;
    [0, 0.22, 0.44].forEach((dt, k) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = k === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.17);
      o.connect(g); g.connect(AC.destination); o.start(t0 + dt); o.stop(t0 + dt + 0.2);
    });
  } catch (e) { /* audio unavailable */ }
}
function startRest(sec) {
  T.total = sec; T.end = Date.now() + sec * 1000; T.fired = false;
  const el = $('#restbar'); el.hidden = false; el.classList.remove('over');
  clearInterval(T.iv); T.iv = setInterval(tickRest, 250); tickRest();
}
function stopRest() { clearInterval(T.iv); $('#restbar').hidden = true; }
function tickRest() {
  const el = $('#restbar'); if (el.hidden) return;
  const left = T.end - Date.now();
  const s = Math.max(0, Math.ceil(left / 1000));
  el.querySelector('.tm').textContent = left > 0 ? fmtClock(s * 1000) : 'Go';
  el.querySelector('.lb').textContent = left > 0 ? 'Rest' : 'Rest over';
  el.querySelector('.fill').style.transform = 'scaleX(' + Math.max(0, Math.min(1, left / (T.total * 1000))) + ')';
  if (left <= 0 && !T.fired) {
    T.fired = true; el.classList.add('over'); beep();
    try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) { /* not allowed */ }
  }
  if (left < -45000) stopRest();
}
let WL = null;
async function wakeOn() {
  if (!S.settings.wake || WL || document.visibilityState !== 'visible' || !navigator.wakeLock) return;
  try { WL = await navigator.wakeLock.request('screen'); WL.addEventListener('release', () => { WL = null; }); } catch (e) { WL = null; }
}
function wakeOff() { try { if (WL) WL.release(); } catch (e) { /* ignore */ } WL = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (S.view.tab === 'day') wakeOn(); tickRest(); flushAll(); }
});

/* =========================================================================
   Actions
   ========================================================================= */
function curDay() { return { R: S.view.round, d: DAY[S.view.dayId] }; }
function placeholderFor(x, s, i) {
  const ref = refFor2(x, s, S.view.round);
  const log = s && s.ex && s.ex[x.id];
  const sets = log ? log.sets : templateSets(x);
  let wIdx = -1;
  for (let k = 0; k <= i; k++) if (sets[k] && sets[k].t !== 'warm') wIdx++;
  const hist = ref && sets[i] && sets[i].t !== 'warm' ? ref.sets[wIdx] : null;
  const rs = hist || (sets[i] && sets[i].t !== 'warm' ? prevInSession(sets, i) : null);
  const target = x.targets && x.targets[wIdx] != null ? x.targets[wIdx] : x.reps;
  const numT = /^\d+$/.test(String(target)) ? String(target) : '';
  const r = hist && hist.r !== '' ? hist.r : (numT || (rs && rs.r !== '' ? rs.r : ''));
  return { w: rs && rs.w !== '' ? rs.w : '', r, drops: hist && hist.drops ? hist.drops : [] };
}
function toggleDone(exId, i) {
  audioUnlock();
  const { R, d } = curDay();
  const x = EX[exId];
  const s0 = getS(R, d.id);
  const before = s0 && s0.ex[exId] ? s0.ex[exId].sets[i] : templateSets(x)[i];
  if (!before) return;
  if (!before.done) {
    const ph = placeholderFor(x, s0, i);
    if ((before.r === '' || before.r == null) && !ph.r) {
      const inp = document.getElementById('r-' + exId + '-' + i);
      if (inp) { inp.focus(); inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); }
      return;
    }
    const s = ensureS(R, d.id), log = ensureLog(s, exId), st = log.sets[i];
    if (st.w === '' && ph.w) st.w = ph.w;
    if (st.r === '' && ph.r) st.r = ph.r;
    (st.drops || []).forEach((dp, j) => { const pd = ph.drops[j]; if (pd) { if (dp.w === '' && pd.w) dp.w = pd.w; if (dp.r === '' && pd.r) dp.r = pd.r; } });
    st.done = true;
    touch(s);
    if (S.settings.autoRest && st.t !== 'warm') startRest(x.rest || S.settings.rest);
  } else {
    const s = ensureS(R, d.id), log = ensureLog(s, exId);
    log.sets[i].done = false; touch(s);
  }
  rerenderCard(exId);
}
function addSet(exId, warm) {
  const { R, d } = curDay();
  const s = ensureS(R, d.id), log = ensureLog(s, exId);
  const set = { t: warm ? 'warm' : 'work', w: '', r: '', done: false, rpe: '', drops: [] };
  if (warm) {
    let k = log.sets.findIndex((z) => z.t !== 'warm'); if (k < 0) k = log.sets.length;
    log.sets.splice(k, 0, set);
  } else log.sets.push(set);
  touch(s); rerenderCard(exId);
  const i = warm ? log.sets.indexOf(set) : log.sets.length - 1;
  const inp = document.getElementById('w-' + exId + '-' + i); if (inp) inp.focus();
}
function addDrop(exId, i) {
  const { R, d } = curDay();
  const s = ensureS(R, d.id), log = ensureLog(s, exId);
  if (i == null) { i = -1; for (let k = log.sets.length - 1; k >= 0; k--) if (log.sets[k].t !== 'warm') { i = k; break; } }
  if (i < 0) { toast('Add a work set first.'); return; }
  const st = log.sets[i]; st.drops = st.drops || []; st.drops.push({ w: '', r: '' });
  touch(s); rerenderCard(exId);
  const inp = document.getElementById('dw-' + exId + '-' + i + '-' + (st.drops.length - 1)); if (inp) inp.focus();
}
function setMenu(exId, i) {
  const { R, d } = curDay();
  const x = EX[exId], s = getS(R, d.id);
  const st = (s && s.ex[exId] ? s.ex[exId].sets : templateSets(x))[i];
  if (!st) return;
  const warm = st.t === 'warm';
  openSheet('<h3>' + (warm ? 'Warm-up set' : 'Set options') + '</h3><p class="sub">' + esc(x.name) + '</p>' +
    '<div class="field">RPE for this set<div class="rpegrid">' + RPE_VALUES.map((v) => '<button data-act="rpe" data-ex="' + exId + '" data-i="' + i + '" data-v="' + v + '" aria-pressed="' + (st.rpe === v) + '">' + v + '</button>').join('') + '<button data-act="rpe" data-ex="' + exId + '" data-i="' + i + '" data-v="" aria-pressed="false">Clear</button></div></div>' +
    '<div class="opts"><button class="btn" data-act="warmtoggle" data-ex="' + exId + '" data-i="' + i + '">' + (warm ? 'Make it a work set' : 'Mark as warm-up') + '</button>' +
    (warm ? '' : '<button class="btn" data-act="adddrop" data-ex="' + exId + '" data-i="' + i + '">Add a drop</button>') +
    '<button class="btn danger" data-act="delset" data-ex="' + exId + '" data-i="' + i + '">Delete this set</button></div>');
}
function exMenu(exId) {
  const { R, d } = curDay();
  const x = EX[exId], s = getS(R, d.id), log = s && s.ex[exId];
  openSheet('<h3>' + esc(x.name) + '</h3><p class="sub">' + esc(x.rx) + '</p><div class="opts">' +
    '<button class="btn" data-act="addwarm" data-ex="' + exId + '">Add a warm-up set</button>' +
    '<div class="field">Did a different exercise? (e.g. your gym lacks the machine)<input id="swapin" data-fk="swapin" value="' + esc(log ? log.swap : '') + '" placeholder="What you did instead" autocomplete="off"></div>' +
    '<button class="btn" data-act="saveswap" data-ex="' + exId + '">Save swap</button>' +
    '<button class="btn" data-act="lift" data-key="' + esc(x.key) + '">Exercise history</button>' +
    (log ? '<button class="btn danger" data-act="clearex" data-ex="' + exId + '">Clear this exercise</button>' : '') + '</div>');
}
function finishWorkout() {
  const { R, d } = curDay();
  const s = getS(R, d.id);
  if (!s || !hasLogged(s)) { toast('Log at least one set first, or use Skip this day.'); return; }
  s.finishedAt = Date.now(); s.skipped = false;
  touch(s); stopRest();
  const ss = sessionStats(s), prs = sessionPRs(s);
  const dur = s.finishedAt - s.startedAt;
  const up = nextUp(R);
  openSheet('<h3>Week ' + d.week + ' ' + d.abbr + ' done</h3>' +
    '<div class="summary"><div class="stat"><div class="v">' + ss.sets + '</div><div class="l">work sets</div></div>' +
    '<div class="stat"><div class="v">' + (ss.vol ? fmtNum(ss.vol) : '–') + '</div><div class="l">' + esc(S.settings.unit) + ' volume</div></div>' +
    '<div class="stat"><div class="v">' + (dur >= 60000 && dur < 6 * 3600e3 ? fmtDur(dur) : '–') + '</div><div class="l">duration</div></div></div>' +
    (prs.length ? '<p class="sub"><b>' + prs.length + ' PR' + (prs.length > 1 ? 's' : '') + ':</b> ' + esc(prs.map((p) => p.x.name + ' ' + fmtSet(p.set, { noDrops: true })).join(' · ')) + '</p>' : '') +
    (up.day ? '<p class="sub">Next: Week ' + up.day.week + ' ' + DAY_NAMES[up.day.abbr] + ' — ' + esc(up.day.focus) + '</p>' : '<p class="sub">That was the last day of round ' + R + '.</p>') +
    '<button class="btn primary block" data-act="tohome">Back to program</button>');
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act, ds = b.dataset;
  const i = ds.i != null ? +ds.i : null;
  switch (a) {
    case 'tab': go(ds.tab); break;
    case 'open': closeSheet(); go('r' + (ds.round || viewRound()) + '-' + ds.day); break;
    case 'back': go('program'); break;
    case 'tohome': closeSheet(); go('program'); break;
    case 'week': S.view.week = +ds.week; render(); break;
    case 'round': S.view.round = +ds.round; S.view.week = null; render(); break;
    case 'newround': {
      const n = maxRound() + 1;
      confirmSheet('Start round ' + n + '?', 'Round ' + n + ' starts again at week 5. Your earlier rounds stay in the log, and each day shows what you did last round.', 'Start round ' + n, () => {
        S.settings.round = n; S.settings.updatedAt = Date.now(); markDirty('settings');
        S.view.round = n; S.view.week = 5; go('program'); toast('Round ' + n + ' started');
      });
      break;
    }
    case 'coach': S.view.coach = !S.view.coach; render(); break;
    case 'howto': S.view.open[ds.ex] = !S.view.open[ds.ex]; rerenderCard(ds.ex); break;
    case 'lift': closeSheet(); go('lift-' + slug(ds.key)); break;
    case 'done': toggleDone(ds.ex, i); break;
    case 'addset': addSet(ds.ex, false); break;
    case 'addwarm': closeSheet(); addSet(ds.ex, true); break;
    case 'adddrop': closeSheet(); addDrop(ds.ex, i); break;
    case 'rmdrop': {
      const { R, d } = curDay(); const s = ensureS(R, d.id), log = ensureLog(s, ds.ex);
      log.sets[i].drops.splice(+ds.di, 1); touch(s); rerenderCard(ds.ex); break;
    }
    case 'note': S.view.notes[ds.ex] = true; rerenderCard(ds.ex); { const t = document.getElementById('note-' + ds.ex); if (t) t.focus(); } break;
    case 'setmenu': setMenu(ds.ex, i); break;
    case 'exmenu': exMenu(ds.ex); break;
    case 'rpe': {
      const { R, d } = curDay(); const s = ensureS(R, d.id), log = ensureLog(s, ds.ex);
      log.sets[i].rpe = ds.v; touch(s); closeSheet(); rerenderCard(ds.ex); break;
    }
    case 'warmtoggle': {
      const { R, d } = curDay(); const s = ensureS(R, d.id), log = ensureLog(s, ds.ex);
      const st = log.sets[i]; st.t = st.t === 'warm' ? 'work' : 'warm';
      log.sets.splice(i, 1); let k = log.sets.findIndex((z) => z.t !== 'warm'); if (k < 0) k = log.sets.length; log.sets.splice(k, 0, st);
      touch(s); closeSheet(); rerenderCard(ds.ex); break;
    }
    case 'delset': {
      const { R, d } = curDay(); const s = ensureS(R, d.id), log = ensureLog(s, ds.ex);
      log.sets.splice(i, 1); touch(s); closeSheet(); rerenderCard(ds.ex); break;
    }
    case 'saveswap': {
      const { R, d } = curDay(); const s = ensureS(R, d.id), log = ensureLog(s, ds.ex);
      log.swap = ($('#swapin') || {}).value ? $('#swapin').value.trim() : ''; touch(s); closeSheet(); rerenderCard(ds.ex);
      toast(log.swap ? 'Logged as ' + log.swap : 'Swap cleared'); break;
    }
    case 'clearex': {
      const exId = ds.ex;
      confirmSheet('Clear this exercise?', 'Removes the sets, note and swap you logged for ' + EX[exId].name + ' on this day.', 'Clear', () => {
        const { R, d } = curDay(); const s = getS(R, d.id); if (s && s.ex[exId]) { delete s.ex[exId]; touch(s); } rerenderCard(exId);
      }, true);
      break;
    }
    case 'finish': finishWorkout(); break;
    case 'reopen': { const { R, d } = curDay(); const s = getS(R, d.id); if (s) { s.finishedAt = null; s.updatedAt = Date.now(); bump(); markDirty(s.id); } render(); break; }
    case 'skip': {
      const { R, d } = curDay();
      confirmSheet('Skip Week ' + d.week + ' ' + DAY_NAMES[d.abbr] + '?', 'It will be marked skipped and Up next moves to the following day. Sets already logged are kept.', 'Skip day', () => {
        const s = ensureS(R, d.id); s.skipped = true; s.finishedAt = null; touch(s); go('program'); toast('Skipped Week ' + d.week + ' ' + d.abbr);
      });
      break;
    }
    case 'unskip': { const { R, d } = curDay(); const s = getS(R, d.id); if (s) { s.skipped = false; touch(s); } render(); break; }
    case 'clearday': {
      const { R, d } = curDay();
      confirmSheet('Clear this day?', 'Deletes everything logged for Week ' + d.week + ' ' + DAY_NAMES[d.abbr] + ' in round ' + R + '. This can’t be undone.', 'Clear day', () => {
        const id = sid(R, d.id); delete S.sessions[id]; if (PLATFORM !== 'pwa') S.deleted.add(id); bump(); markDirty(id); render(); toast('Day cleared');
      }, true);
      break;
    }
    case 'confirm': { const fn = pendingConfirm; pendingConfirm = null; closeSheet(); if (fn) fn(); break; }
    case 'closesheet': closeSheet(); break;
    case 'toggle': S.settings[ds.k] = !S.settings[ds.k]; S.settings.updatedAt = Date.now(); markDirty('settings'); render(); break;
    case 'set': S.settings[ds.k] = ds.k === 'rest' ? +ds.v : ds.v; S.settings.updatedAt = Date.now(); markDirty('settings'); render(); break;
    case 'rest-minus': T.end -= 15000; T.total = Math.max(15, T.total - 15); tickRest(); break;
    case 'rest-plus': T.end += 15000; T.total += 15; T.fired = false; $('#restbar').classList.remove('over'); tickRest(); break;
    case 'rest-stop': stopRest(); break;
    case 'csv': saveFile('onslaught-log-' + todayStr() + '.csv', buildCSV(), false); break;
    case 'json': saveFile('onslaught-backup-' + todayStr() + '.json', JSON.stringify({ app: 'onslaught-logbook', v: 1, exportedAt: new Date().toISOString(), settings: S.settings, sessions: S.sessions }, null, 1), true); break;
    case 'reload': location.reload(); break;
    case 'copydump': {
      const ta = $('#dump');
      const done = () => toast('Copied');
      try { navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); }); } catch (err) { ta.select(); }
      break;
    }
    default: break;
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t.dataset) return;
  if (t.dataset.f && t.dataset.ex) {
    const { R, d } = curDay();
    const s = ensureS(R, d.id), log = ensureLog(s, t.dataset.ex);
    const st = log.sets[+t.dataset.i]; if (!st) return;
    const v = t.value.trim();
    if (t.dataset.di != null) { const dp = st.drops[+t.dataset.di]; if (dp) dp[t.dataset.f] = v; } else st[t.dataset.f] = v;
    touch(s);
  } else if (t.dataset.xf === 'note') {
    const { R, d } = curDay();
    const s = ensureS(R, d.id), log = ensureLog(s, t.dataset.ex);
    log.note = t.value; touch(s);
  } else if (t.dataset.sf && t.dataset.sf !== 'date') {
    const { R, d } = curDay();
    const s = ensureS(R, d.id);
    s[t.dataset.sf] = t.dataset.sf === 'bw' ? t.value.trim() : t.value; touch(s);
  } else if (t.id === 'liftq') {
    S.view.q = t.value; const L = $('#liftlist'); if (L) L.innerHTML = liftRows(S.view.q);
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.sf === 'date' && t.value) {
    const { R, d } = curDay(); const s = ensureS(R, d.id); s.date = t.value; touch(s); render();
  } else if (t.id === 'importfile' && t.files && t.files[0]) {
    importFile(t.files[0]); t.value = '';
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#sheet').hidden) { closeSheet(); return; }
  const t = e.target;
  if (e.key === 'Enter' && t.classList && t.classList.contains('in') && t.dataset.ex) {
    e.preventDefault();
    if (t.dataset.f === 'w') {
      const nx = document.getElementById((t.dataset.di != null ? 'dr-' : 'r-') + t.dataset.ex + '-' + t.dataset.i + (t.dataset.di != null ? '-' + t.dataset.di : ''));
      if (nx) nx.focus();
    } else t.blur();
  }
});

/* =========================================================================
   Export / import
   ========================================================================= */
function csvCell(v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function buildCSV() {
  const rows = [['Round', 'Week', 'Day', 'Date', 'Focus', 'Order', 'Exercise', 'Done instead', 'Muscle group', 'Set', 'Set type', 'Weight', 'Unit', 'Reps', 'RPE', 'Drops', 'Checked off', 'Exercise note', 'Workout notes', 'Bodyweight']];
  const list = Object.values(S.sessions).filter((s) => s && DAY[s.dayId] && s.ex).sort((a, b) => a.round - b.round || DAY[a.dayId].idx - DAY[b.dayId].idx);
  for (const s of list) {
    const d = DAY[s.dayId], labels = displayLabels(d);
    for (const x of d.exercises) {
      const log = s.ex[x.id]; if (!log) continue;
      let n = 0;
      for (const z of log.sets || []) {
        const warm = z.t === 'warm';
        if (!isPerf(z) && z.w === '') continue;
        const drops = (z.drops || []).filter((dp) => dp.w !== '' || dp.r !== '').map((dp) => (dp.w || 'BW') + 'x' + (dp.r || '')).join(' / ');
        rows.push([s.round, d.week, DAY_NAMES[d.abbr], s.date, d.focus, labels[x.id], x.name, log.swap || '', x.group, warm ? 'W' : ++n, warm ? 'Warm-up' : 'Work', z.w, S.settings.unit, z.r, z.rpe || '', drops, z.done ? 'Y' : '', log.note || '', s.notes || '', s.bw || '']);
      }
    }
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
function markBackedUp() { S.settings.lastBackupAt = Date.now(); S.settings.updatedAt = Date.now(); markDirty('settings'); render(); }
function downloadBlob(filename, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function saveFile(filename, data, isBackup) {
  if (PLATFORM !== 'pwa') return saveFileArtifact(filename, data);
  const type = /\.csv$/.test(filename) ? 'text/csv' : 'application/json';
  let file = null;
  try { file = new File([data], filename, { type }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.share) {
    let ok = false;
    try { ok = navigator.canShare({ files: [file] }); } catch (e) { ok = false; }
    if (ok) {
      navigator.share({ files: [file], title: filename }).then(() => { if (isBackup) markBackedUp(); toast(isBackup ? 'Backup saved' : 'Export ready'); })
        .catch((e) => { if (e && e.name === 'AbortError') return; downloadBlob(filename, data, type); if (isBackup) markBackedUp(); });
      return;
    }
  }
  downloadBlob(filename, data, type);
  if (isBackup) markBackedUp();
  toast('Downloaded ' + filename);
}
async function saveFileArtifact(filename, data) {
  let dl = null;
  try { dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename, data }); toast('Saved ' + filename); return; } catch (e) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) return; }
  }
  openSheet('<h3>Copy your export</h3><p class="sub">Downloads aren’t available here. Copy this text and save it as ' + esc(filename) + '.</p>' +
    '<textarea class="dump" id="dump" readonly>' + esc(data) + '</textarea><button class="btn primary block" data-act="copydump">Copy to clipboard</button>');
}
function importFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    let o = null;
    try { o = JSON.parse(String(rd.result)); } catch (e) { o = null; }
    if (!o || !o.sessions || typeof o.sessions !== 'object') { toast('That file isn’t an Onslaught backup.'); return; }
    const incoming = Object.values(o.sessions).filter((s) => s && s.id && DAY[s.dayId] && s.ex);
    confirmSheet('Restore ' + incoming.length + ' workouts?', 'From a backup made ' + (o.exportedAt ? new Date(o.exportedAt).toLocaleDateString() : 'earlier') + '. Workouts already here are kept unless the backup has a newer copy.', 'Restore', () => {
      let n = 0;
      for (const s of incoming) {
        const loc = S.sessions[s.id];
        if (!loc || (loc.updatedAt || 0) < (s.updatedAt || 0)) { S.sessions[s.id] = JSON.parse(JSON.stringify(s)); S.deleted.delete(s.id); markDirty(s.id); n++; }
      }
      bump(); render(); toast(n ? 'Restored ' + n + ' workouts' : 'Nothing newer in that backup');
    });
  };
  rd.readAsText(file);
}

/* =========================================================================
   Boot
   ========================================================================= */
/* ---------- standalone (installed) app: program unlock, offline cache, updates ---------- */
const PKEY = 'onslaught-program-v1', KKEY = 'onslaught-key-v1';
function installHint() {
  if (PLATFORM !== 'pwa' || STANDALONE) return '';
  return '<p class="banner install"><b>Install it first.</b> ' + (IS_IOS
    ? 'In Safari, tap the Share button, then “Add to Home Screen”. Open the logbook from that icon and log there: Safari and the installed app keep separate data.'
    : 'Use your browser’s install option (or Add to Home Screen) and log from the installed app.') + '</p>';
}
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const normKey = (k) => String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
async function decryptProgram(enc, key) {
  const mat = await crypto.subtle.importKey('raw', new TextEncoder().encode(normKey(key)), 'PBKDF2', false, ['deriveKey']);
  const aes = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(enc.salt), iterations: enc.iter, hash: 'SHA-256' }, mat, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, aes, b64(enc.data));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function fetchEnc() {
  const res = await fetch('program.enc.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('http ' + res.status);
  return res.json();
}
function cachedProgram() {
  try { const o = JSON.parse(localStorage.getItem(PKEY) || 'null'); return o && o.program && o.program.weeks ? o : null; } catch (e) { return null; }
}
function storeProgram(rev, program, key) {
  try { localStorage.setItem(PKEY, JSON.stringify({ rev, program })); if (key) localStorage.setItem(KKEY, normKey(key)); } catch (e) { /* storage full or blocked */ }
}
function renderUnlock(err, busy) {
  document.body.classList.add('locked');
  document.body.classList.remove('in-day');
  $('#tabs').innerHTML = '';
  $('#app').innerHTML = '<section class="unlock"><div class="eyebrow">John Meadows · weeks 5–12</div><h1 class="display">Onslaught</h1>' +
    '<p>Enter your program key to load the workouts on this ' + (IS_IOS ? 'iPhone' : 'device') + '. You only do this once.</p>' + installHint() +
    '<form id="unlockform" class="unlockform" autocomplete="off"><label class="sr" for="pkey">Program key</label>' +
    '<input id="pkey" class="search" name="pkey" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" required>' +
    '<button class="btn primary block" type="submit"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Unlocking…' : 'Unlock') + '</button></form>' +
    (err ? '<p class="err" role="alert">' + esc(err) + '</p>' : '') + '</section>';
}
document.addEventListener('submit', async (e) => {
  if (!e.target || e.target.id !== 'unlockform') return;
  e.preventDefault();
  const key = $('#pkey').value;
  if (normKey(key).length < 8) { renderUnlock('That key looks too short. It has 16 letters and numbers.'); return; }
  renderUnlock('', true);
  let enc;
  try { enc = await fetchEnc(); } catch (err) { renderUnlock('Couldn’t download the program. Connect to the internet for this one-time step and try again.'); return; }
  try {
    const p = await decryptProgram(enc, key);
    storeProgram(enc.rev, p, key);
    indexProgram(p);
    document.body.classList.remove('locked');
    route();
    toast('Program unlocked');
    requestPersist();
  } catch (err) {
    renderUnlock('That key didn’t work. Check it and try again.');
    const f = $('#pkey'); if (f) { f.value = key; }
  }
});
async function refreshProgram() {
  const key = (() => { try { return localStorage.getItem(KKEY); } catch (e) { return null; } })();
  if (!key) return;
  let enc;
  try { enc = await fetchEnc(); } catch (e) { return; }
  const cur = cachedProgram();
  if (cur && cur.rev === enc.rev) return;
  try {
    const p = await decryptProgram(enc, key);
    storeProgram(enc.rev, p, null);
    indexProgram(p);
    render();
  } catch (e) { /* keep the cached program */ }
}
function requestPersist() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* not supported */ }
}
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    setInterval(() => { try { reg.update(); } catch (e) { /* offline */ } }, 3600e3);
  }).catch(() => {});
  let shown = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || shown) return;
    shown = true;
    const el = $('#update');
    if (!el) return;
    el.innerHTML = '<span>New version ready</span><button class="btn small" data-act="reload">Reload</button>';
    el.hidden = false;
  });
}

function boot() {
  loadLocal();
  bump();
  $('#restbar').innerHTML = '<div class="rb" role="timer" aria-live="off"><div><div class="lb">Rest</div><div class="tm">0:00</div></div>' +
    '<button class="rbtn" data-act="rest-minus" aria-label="Fifteen seconds less">−15</button><button class="rbtn" data-act="rest-plus" aria-label="Fifteen seconds more">+15</button>' +
    '<button class="rbtn" data-act="rest-stop" aria-label="Stop rest timer">✕</button><div class="fill"></div></div>';
  if (PLATFORM === 'pwa') {
    registerSW();
    S.mode = 'local'; S.localReason = 'pwa';
    const c = cachedProgram();
    if (!c) { renderUnlock(); return; }
    indexProgram(c.program);
    route();
    refreshProgram();
    requestPersist();
    return;
  }
  indexProgram(window.__ONSLAUGHT__);
  route();
  initCloud().then(() => { if (S.mode === 'cloud') flushAll(); renderSync(); });
}
boot();
})();

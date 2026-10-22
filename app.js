/* PETA ARISAN — app.js (ESM, tanpa build) */
'use strict';

/* ---------- DATA (semua fiktif, CONTOH) ---------- */
const MEMBERS = [
  { nama: 'Sari',  setor: 350000 }, { nama: 'Budi',  setor: 200000 },
  { nama: 'Dewi',  setor: 400000 }, { nama: 'Agus',  setor: 250000 },
  { nama: 'Rina',  setor: 300000 }, { nama: 'Joko',  setor: 500000 },
  { nama: 'Maya',  setor: 250000 }, { nama: 'Dedi',  setor: 300000 },
  { nama: 'Lina',  setor: 200000 }, { nama: 'Fajar', setor: 450000 },
  { nama: 'Nita',  setor: 350000 }, { nama: 'Hendra',setor: 400000 },
  { nama: 'Wulan', setor: 250000 }, { nama: 'Rizky', setor: 300000 },
  { nama: 'Tania', setor: 500000 }, { nama: 'Galih', setor: 350000 },
];
const BELUM = new Set(['Budi', 'Joko', 'Lina', 'Nita', 'Tania']); // contoh status
const BULAN = ['Nov 2026','Des 2026','Jan 2027','Feb 2027','Mar 2027','Apr 2027',
               'Mei 2027','Jun 2027','Jul 2027','Agu 2027','Sep 2027','Okt 2027'];
const WORLD_W = 2200, WORLD_H = 1500;
const ZMIN = 0.6, ZMAX = 2.5;

/* ---------- UTIL ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const fmtRp = n => 'Rp' + new Intl.NumberFormat('id-ID').format(n);
const fmtRpRb = n => 'Rp' + new Intl.NumberFormat('id-ID').format(n / 1000) + 'rb';
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const todayISO = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const todayID = () => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s);

/* ---------- STORE (localStorage arisan-v1, tervalidasi) ---------- */
const STORE_KEY = 'arisan-v1';
function loadStore() {
  const d = { v: STORE_KEY, history: [], motion: true, muted: false, marquee: true };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return d;
    const o = JSON.parse(raw);
    if (!o || o.v !== STORE_KEY) return d;
    if (Array.isArray(o.history)) d.history = o.history.filter(h =>
      h && Number.isInteger(h.ronde) && h.ronde >= 1 && h.ronde <= 12 &&
      typeof h.pemenang === 'string' && typeof h.seed === 'string').slice(0, 200);
    if (typeof o.motion === 'boolean') d.motion = o.motion;
    if (typeof o.muted === 'boolean') d.muted = o.muted;
    if (typeof o.marquee === 'boolean') d.marquee = o.marquee;
  } catch (e) { /* rusak -> pakai default */ }
  return d;
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* penuh/ditolak */ }
}
const store = loadStore();
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionOn = () => store.motion && !reducedMotion();

/* ---------- REFS ---------- */
const peta = $('#peta'), stage = $('#stage'), world = $('#world');
const stampsBox = $('#stamps'), wilayah = $('#wilayah'), wilayahLabel = $('#wilayah-label');
const toastBox = $('#toast'), liveBox = $('#live');
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');

/* ---------- SUARA (WebAudio, opsional, setelah gestur) ---------- */
let actx = null;
function beep(freq, dur, delay = 0, type = 'triangle') {
  if (store.muted || !motionOn()) return;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime + delay;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* audio tidak tersedia */ }
}
const sfxTick = () => beep(620, 0.05, 0, 'square');
const sfxMenang = () => { beep(523, 0.12); beep(784, 0.2, 0.12); beep(1046, 0.3, 0.24); };

/* ---------- TOAST & LIVE ---------- */
let toastTimer = 0;
function toast(html) {
  toastBox.textContent = '';
  const parts = String(html).split(/(\*\*.*?\*\*)/g);
  parts.forEach(p => {
    if (p.startsWith('**') && p.endsWith('**')) toastBox.appendChild(el('b', null, p.slice(2, -2)));
    else toastBox.appendChild(document.createTextNode(p));
  });
  toastBox.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastBox.classList.remove('show'), 4200);
}
const say = msg => { liveBox.textContent = ''; requestAnimationFrame(() => { liveBox.textContent = msg; }); };

/* ---------- MESIN PETA (pan/zoom) ---------- */
const cam = { x: 0, y: 0, z: 1 };
let flyRaf = 0;
function applyCam() {
  stage.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.z})`;
}
function fitCam() {
  const r = peta.getBoundingClientRect();
  const z = clamp(Math.min(r.width / WORLD_W, r.height / WORLD_H) * 1.02, ZMIN, ZMAX);
  cam.z = z;
  cam.x = r.width / 2 - (WORLD_W / 2) * z;
  cam.y = r.height / 2 - (WORLD_H / 2) * z;
  applyCam();
}
function zoomAt(sx, sy, factor) {
  const z2 = clamp(cam.z * factor, ZMIN, ZMAX);
  const k = z2 / cam.z;
  cam.x = sx - (sx - cam.x) * k;
  cam.y = sy - (sy - cam.y) * k;
  cam.z = z2;
  applyCam();
}
function flyTo(wx, wy, z, dur = 900) {
  cancelAnimationFrame(flyRaf);
  const r = peta.getBoundingClientRect();
  const z2 = clamp(z, ZMIN, ZMAX);
  const from = { ...cam };
  const to = { z: z2, x: r.width / 2 - wx * z2, y: r.height / 2 - wy * z2 };
  if (!motionOn() || dur <= 0) { Object.assign(cam, to); applyCam(); return; }
  const t0 = performance.now();
  const step = now => {
    const p = clamp((now - t0) / dur, 0, 1);
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    cam.x = from.x + (to.x - from.x) * e;
    cam.y = from.y + (to.y - from.y) * e;
    cam.z = from.z + (to.z - from.z) * e;
    applyCam();
    if (p < 1) flyRaf = requestAnimationFrame(step);
  };
  flyRaf = requestAnimationFrame(step);
}

/* velocity untuk marquee */
let lastPan = { t: 0, x: 0 }, panVel = 0;
function notePan(x) {
  const now = performance.now();
  if (lastPan.t) panVel = panVel * 0.7 + ((x - lastPan.x) / Math.max(now - lastPan.t, 1) * 1000) * 0.3;
  lastPan = { t: now, x };
  const skew = clamp(panVel / 500, -10, 10).toFixed(1);
  $$('#marquee .track').forEach(t => t.style.setProperty('--skew', skew + 'deg'));
}

/* pointer: drag pan + pinch */
const pointers = new Map();
let dragMoved = 0, suppressClick = false, pinchD0 = 0;
peta.addEventListener('pointerdown', e => {
  cancelAnimationFrame(flyRaf);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragMoved = 0;
  peta.setPointerCapture(e.pointerId);
  wakeMarquee();
  hideHint();
});
peta.addEventListener('pointermove', e => {
  const pt = pointers.get(e.pointerId);
  if (!pt) return;
  const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
  dragMoved += Math.abs(dx) + Math.abs(dy);
  if (pointers.size === 1) {
    cam.x += dx; cam.y += dy; applyCam();
    notePan(e.clientX);
  } else if (pointers.size === 2) {
    pt.x = e.clientX; pt.y = e.clientY;
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const r = peta.getBoundingClientRect();
    if (pinchD0 > 0 && d > 0) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinchD0);
    pinchD0 = d;
    return;
  }
  pt.x = e.clientX; pt.y = e.clientY;
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchD0 = 0;
  if (dragMoved > 8) suppressClick = true;
}
peta.addEventListener('pointerup', endPointer);
peta.addEventListener('pointercancel', endPointer);
peta.addEventListener('click', e => {
  if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; }
}, true);
peta.addEventListener('wheel', e => {
  e.preventDefault();
  cancelAnimationFrame(flyRaf);
  const r = peta.getBoundingClientRect();
  zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
  wakeMarquee();
}, { passive: false });

/* keyboard peta */
peta.addEventListener('keydown', e => {
  const step = e.shiftKey ? 220 : 70;
  let used = true;
  switch (e.key) {
    case 'ArrowLeft': cam.x += step; break;
    case 'ArrowRight': cam.x -= step; break;
    case 'ArrowUp': cam.y += step; break;
    case 'ArrowDown': cam.y -= step; break;
    case 'PageUp': cam.y += 320; break;
    case 'PageDown': cam.y -= 320; break;
    case '+': case '=': { const r = peta.getBoundingClientRect(); zoomAt(r.width/2, r.height/2, 1.2); break; }
    case '-': case '_': { const r2 = peta.getBoundingClientRect(); zoomAt(r2.width/2, r2.height/2, 1/1.2); break; }
    case 'Home': fitCam(); say('Tampilan peta dikembalikan.'); break;
    default: used = false;
  }
  if (used) { e.preventDefault(); cancelAnimationFrame(flyRaf); applyCam(); wakeMarquee(); }
});
$('#btn-zoom-in').addEventListener('click', () => { const r = peta.getBoundingClientRect(); zoomAt(r.width/2, r.height/2, 1.25); });
$('#btn-zoom-out').addEventListener('click', () => { const r = peta.getBoundingClientRect(); zoomAt(r.width/2, r.height/2, 1/1.25); });
$('#btn-reset').addEventListener('click', () => { fitCam(); say('Tampilan peta dikembalikan.'); });

let hintHidden = false;
function hideHint() {
  if (hintHidden) return; hintHidden = true;
  $('#map-hint').classList.add('hide');
}
setTimeout(hideHint, 6000);

/* ---------- STEMPEL ANGGOTA ---------- */
let round = 1;
const rngPos = mulberry32(20261022);
const basePos = (() => {
  const pts = [];
  let guard = 0;
  while (pts.length < MEMBERS.length && guard++ < 4000) {
    const x = 200 + rngPos() * 1800, y = 200 + rngPos() * 1100;
    if (pts.every(p => Math.hypot(p.x - x, p.y - y) > 400)) {
      pts.push({ x, y, rot: (rngPos() * 8 - 4).toFixed(1) });
    }
  }
  while (pts.length < MEMBERS.length) {
    pts.push({ x: 200 + rngPos() * 1800, y: 200 + rngPos() * 1100, rot: (rngPos() * 8 - 4).toFixed(1) });
  }
  return pts;
})();
const stampEls = [];
function roundPos(i) {
  const a = (round - 1) * 18 * Math.PI / 180;
  const cx = WORLD_W / 2, cy = WORLD_H / 2;
  const dx = basePos[i].x - cx, dy = basePos[i].y - cy;
  return {
    x: cx + dx * Math.cos(a) - dy * Math.sin(a),
    y: cy + dx * Math.sin(a) + dy * Math.cos(a),
  };
}
function buildStamps() {
  MEMBERS.forEach((m, i) => {
    const b = el('button', 'stamp');
    b.type = 'button';
    b.dataset.i = i;
    b.style.setProperty('--rot', basePos[i].rot + 'deg');
    b.style.setProperty('--d', (i * 0.035) + 's');
    const inner = el('span', 'stamp-in');
    inner.appendChild(el('span', 'no', String(i + 1)));
    inner.appendChild(el('span', 'nm', m.nama));
    b.appendChild(inner);
    const lunas = !BELUM.has(m.nama);
    b.classList.toggle('lunas', lunas);
    b.setAttribute('aria-label', `Anggota ${i + 1}: ${m.nama}, setoran ${fmtRpRb(m.setor)} per bulan, ${lunas ? 'lunas' : 'belum bayar'} (contoh)`);
    b.addEventListener('click', () => openMember(i));
    const p = roundPos(i);
    b.style.transform = `translate(${p.x}px,${p.y}px)`;
    stampsBox.appendChild(b);
    stampEls.push(b);
  });
}
function winnerOf(r) {
  const h = store.history.filter(e => e.ronde === r);
  return h.length ? h[h.length - 1].pemenang : null;
}
function paintWinner() {
  const w = winnerOf(round);
  stampEls.forEach((b, i) => b.classList.toggle('pemenang', MEMBERS[i].nama === w));
}
function paintWilayah() {
  const a = (round - 1) * 30 * Math.PI / 180;
  const cx = WORLD_W / 2 + 430 * Math.cos(a);
  const cy = WORLD_H / 2 + 300 * Math.sin(a);
  wilayah.style.transform = `translate(${cx - 280}px,${cy - 280}px)`;
  wilayahLabel.textContent = '';
  wilayahLabel.appendChild(document.createTextNode('WILAYAH RONDE ' + round));
}

/* GSAP Flip dimuat malas; fallback = pindah instan */
let FlipPlugin = null;
function layoutStamps(animate) {
  const targets = stampEls.map((_, i) => roundPos(i));
  const doApply = () => targets.forEach((p, i) => {
    stampEls[i].style.transform = `translate(${p.x}px,${p.y}px)`;
  });
  if (animate && FlipPlugin && motionOn() && window.gsap) {
    const state = FlipPlugin.getState('.stamp');
    doApply();
    FlipPlugin.from(state, { duration: 0.7, ease: 'power2.inOut', absolute: true });
  } else {
    doApply();
  }
  paintWinner();
  paintWilayah();
}

function setRound(n, opts = {}) {
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    toast('Eh, **ronde ' + esc(String(n)) + '** nggak ada di kalender Bu. Pilih 1–12 ya.');
    return;
  }
  round = n;
  layoutStamps(!opts.silent);
  $('#ronde-chip-tx').textContent = 'RONDE ' + n;
  renderJadwal();
  if (!opts.silent) {
    say(`Ronde ${n}, ${BULAN[n - 1]}, dibuka. Titik-titik pindah formasi.`);
    try { history.replaceState(null, '', '?ronde=' + n); } catch (e) {}
  }
}

/* ---------- PANEL ---------- */
const panel = $('#panel'), panelCard = $('#panel-card'), panelTitle = $('#panel-title');
const panes = {
  anggota: $('#pane-anggota'), kalk: $('#pane-kalk'), jadwal: $('#pane-jadwal'),
  riwayat: $('#pane-riwayat'), ekspor: $('#pane-ekspor'),
};
let panelOpen = null;
function openPanel(name, title) {
  Object.entries(panes).forEach(([k, p]) => { p.hidden = k !== name; });
  panelTitle.textContent = title;
  panel.hidden = false;
  panelOpen = name;
  $('#panel-tutup').focus({ preventScroll: true });
  if (name === 'jadwal') renderJadwal();
  if (name === 'riwayat') renderRiwayat();
  if (name === 'ekspor') renderRingkasan();
}
function closePanel() {
  panel.hidden = true;
  panelOpen = null;
  panelCard.style.transform = '';
}
$('#panel-tutup').addEventListener('click', closePanel);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#kocok-modal').hidden) closeKocok();
    else if (!$('#lunas-cap').hidden) hideLunas();
    else if (panelOpen) closePanel();
    else finishIntro();
  }
});

/* tilt 3D kartu anggota */
panelCard.addEventListener('pointermove', e => {
  if (panelOpen !== 'anggota' || !motionOn()) return;
  const r = panelCard.getBoundingClientRect();
  const rx = ((e.clientY - r.top) / r.height - 0.5) * -10;
  const ry = ((e.clientX - r.left) / r.width - 0.5) * 12;
  panelCard.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
});
panelCard.addEventListener('pointerleave', () => { panelCard.style.transform = ''; });

/* kartu anggota */
function openMember(i) {
  const m = MEMBERS[i];
  const lunas = !BELUM.has(m.nama);
  $('#anggota-no').textContent = String(i + 1);
  $('#anggota-nama').textContent = m.nama;
  $('#anggota-setoran').textContent = fmtRp(m.setor) + ' /bln (contoh)';
  const st = $('#anggota-status');
  st.textContent = lunas ? 'Lunas' : 'Belum bayar';
  st.className = lunas ? 'badge-lunas' : 'badge-belum';
  const menang = store.history.filter(h => h.pemenang === m.nama).map(h => 'R' + h.ronde);
  $('#anggota-menang').textContent = menang.length ? menang.join(', ') : 'Belum pernah';
  openPanel('anggota', 'Kartu Anggota');
  const p = roundPos(i);
  flyTo(p.x, p.y, Math.max(cam.z, 1.1), 700);
  say(`Kartu anggota ${m.nama} dibuka.`);
}

/* ---------- KALKULATOR ---------- */
$('#kalk-form').addEventListener('submit', e => {
  e.preventDefault();
  const err = $('#kalk-err'), hasil = $('#kalk-hasil');
  err.hidden = true; hasil.hidden = true;
  const target = Number($('#kalk-target').value);
  const orang = Number($('#kalk-orang').value);
  const frek = $('#kalk-frek').value;
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(orang) || orang <= 0 || !Number.isInteger(orang)) {
    err.hidden = false;
    err.textContent = 'Eits, angkanya belum bener. Target & jumlah anggota harus lebih dari nol, ya. Bu nggak bisa ngitung angin.';
    say('Hitungan gagal: angka belum benar.');
    return;
  }
  const per = Math.ceil(target / orang / 1000) * 1000;
  $('#kalk-angka').textContent = fmtRp(per) + (frek === 'pekan' ? ' /pekan' : ' /bulan') + ' /orang';
  $('#kalk-note').textContent = `Bu bulatkan ke ribuan biar gampang. Total terkumpul ≈ ${fmtRp(per * orang)} dari ${orang} orang. Angka contoh, ya.`;
  hasil.hidden = false;
  beep(880, 0.08);
  say(`Iuran ${fmtRp(per)} per orang per ${frek === 'pekan' ? 'pekan' : 'bulan'}.`);
});

/* ---------- JADWAL ---------- */
function renderJadwal() {
  const list = $('#jadwal-list');
  list.textContent = '';
  BULAN.forEach((b, i) => {
    const n = i + 1;
    const li = el('li');
    if (n === round) li.classList.add('sedang');
    const w = winnerOf(n);
    if (w) li.classList.add('menang');
    li.appendChild(el('span', 'jadwal-no', 'R' + n));
    const tx = el('div', 'jadwal-tx');
    tx.appendChild(el('b', null, b));
    const sm = el('small', null, n === round ? 'sedang berjalan' : (w ? 'pemenang: ' + w + ' (contoh)' : 'belum dikocok'));
    tx.appendChild(sm);
    li.appendChild(tx);
    if (n !== round) {
      const btn = el('button', 'btn', 'Buka');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Buka ronde ' + n);
      btn.addEventListener('click', () => { setRound(n); });
      li.appendChild(btn);
    }
    list.appendChild(li);
  });
}

/* ---------- KOCOKAN FAIR (seedable) ---------- */
const kocokModal = $('#kocok-modal'), kocokNama = $('#kocok-nama');
let kocokTimer = 0, kocokOpen = false;

function seedFor(r) {
  const s = r + '-' + todayISO();
  const h = cyrb53(s) >>> 0;
  return { str: s, hex: '#' + h.toString(16).padStart(8, '0'), int: h };
}
function charsOf(n, nama) {
  n.textContent = '';
  Array.from(nama).forEach((ch, i) => {
    const s = el('span', 'ch', ch === ' ' ? '\u00a0' : ch);
    s.style.setProperty('--i', i);
    n.appendChild(s);
  });
}
function openKocok(opts = {}) {
  const { hex, int } = seedFor(round);
  const sudahMenang = new Set(store.history.map(h => h.pemenang));
  let pool = MEMBERS.filter(m => !sudahMenang.has(m.nama));
  let notePool = '';
  if (!pool.length) { pool = MEMBERS.slice(); notePool = ' Semua sudah pernah menang, pool direset.'; }
  kocokOpen = true;
  kocokModal.hidden = false;
  $('#kocok-ronde').textContent = 'RONDE ' + round + ' · ' + BULAN[round - 1];
  $('#kocok-seed').textContent = hex;
  $('#kocok-note').textContent = 'Bu Bendahara ngocok…' + notePool + ' Jangan diganggu dulu.';
  $('#kocok-lihat').hidden = true;
  $('#kocok-live').textContent = 'Kocokan ronde ' + round + ' dimulai.';
  kocokNama.className = 'kocok-nama rolling';
  const rng = mulberry32(int);
  const winnerIdx = Math.floor(rng() * pool.length);
  const fast = !motionOn() || opts.fast;
  let n = 0;
  clearInterval(kocokTimer);
  const tickMs = fast ? 40 : 95;
  const totalMs = fast ? 500 : 2300;
  const t0 = performance.now();
  kocokTimer = setInterval(() => {
    const pick = pool[Math.floor(Math.random() * pool.length)].nama;
    charsOf(kocokNama, pick);
    if (!fast && n % 2 === 0) sfxTick();
    n++;
    if (performance.now() - t0 >= totalMs) {
      clearInterval(kocokTimer);
      finishKocok(pool[winnerIdx].nama, hex, opts);
    }
  }, tickMs);
  $('#kocok-tutup').focus({ preventScroll: true });
}
function finishKocok(nama, hex, opts = {}) {
  kocokNama.className = 'kocok-nama menang';
  charsOf(kocokNama, nama);
  $('#kocok-note').textContent = `Pemenang ronde ${round}: ${nama}. Seed ${hex} tercatat — kocok ulang dengan seed yang sama buat verifikasi.`;
  $('#kocok-live').textContent = `Pemenang ronde ${round}: ${nama}.`;
  $('#kocok-lihat').hidden = false;
  $('#kocok-lihat').onclick = () => {
    closeKocok();
    const i = MEMBERS.findIndex(m => m.nama === nama);
    const p = roundPos(i);
    flyTo(p.x, p.y, 1.5, 900);
    setTimeout(() => openMember(i), motionOn() ? 750 : 0);
  };
  if (!opts.demo) {
    store.history.push({ ronde: round, pemenang: nama, seed: hex, tanggal: todayID(), ts: Date.now() });
    saveStore();
  }
  paintWinner();
  sfxMenang();
  say(`Pemenang ronde ${round}: ${nama}.`);
  $('#kocok-lihat').focus({ preventScroll: true });
}
function closeKocok() {
  clearInterval(kocokTimer);
  kocokModal.hidden = true;
  kocokOpen = false;
}
$('#kocok-tutup').addEventListener('click', closeKocok);
$('#btn-kocok').addEventListener('click', () => openKocok());
kocokModal.addEventListener('click', e => { if (e.target === kocokModal) closeKocok(); });

/* ---------- RIWAYAT ---------- */
function renderRiwayat() {
  const list = $('#riwayat-list'), empty = $('#riwayat-empty'), hapus = $('#riwayat-hapus');
  list.textContent = '';
  const h = store.history.slice().reverse();
  empty.hidden = h.length > 0;
  hapus.hidden = h.length === 0;
  h.forEach(entry => {
    const li = el('li');
    const tx = el('div', 'tx');
    tx.appendChild(el('b', null, `Ronde ${entry.ronde} — ${entry.pemenang} (contoh)`));
    const code = el('code', null, `seed ${entry.seed} · ${entry.tanggal}`);
    tx.appendChild(code);
    li.appendChild(tx);
    const del = el('button', 'iconbtn', null);
    del.type = 'button';
    del.setAttribute('aria-label', `Hapus riwayat ronde ${entry.ronde}`);
    del.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-tutup"/></svg>';
    del.addEventListener('click', () => {
      const idx = store.history.findIndex(x => x.ts === entry.ts && x.ronde === entry.ronde);
      if (idx >= 0) store.history.splice(idx, 1);
      saveStore(); renderRiwayat(); paintWinner();
      toast('Riwayat ronde **' + entry.ronde + '** dihapus. Anggap nggak pernah terjadi.');
    });
    li.appendChild(del);
    list.appendChild(li);
  });
}
$('#riwayat-hapus').addEventListener('click', () => {
  store.history = [];
  saveStore(); renderRiwayat(); paintWinner();
  toast('Riwayat dikosongkan. Mulai lagi dari nol, kayak arisan baru.');
});
$('#riwayat-kocok').addEventListener('click', () => { closePanel(); openKocok(); });

/* ---------- EKSPOR ---------- */
function ringkasanText() {
  const lines = ['*RINGKASAN ARISAN — PETA ARISAN (contoh)*', `Ronde berjalan: RONDE ${round} (${BULAN[round - 1]})`, `Anggota: ${MEMBERS.length} orang · Iuran contoh: ${fmtRpRb(200000)}–${fmtRpRb(500000)}/bln`, ''];
  if (!store.history.length) lines.push('Belum ada kocokan tercatat.');
  else {
    lines.push('Pemenang tercatat:');
    store.history.forEach(h => lines.push(`• Ronde ${h.ronde} — ${h.pemenang} (seed ${h.seed}, ${h.tanggal})`));
  }
  lines.push('', '_Catatan: semua nama & angka = CONTOH, bukan data nyata._');
  return lines.join('\n');
}
function renderRingkasan() { $('#ringkasan-pre').textContent = ringkasanText(); }
$('#ekspor-json').addEventListener('click', () => {
  const data = {
    aplikasi: 'peta-arisan', versi: STORE_KEY, diekspor: todayID(),
    catatan: 'Semua nama & angka = CONTOH',
    rondeBerjalan: round, anggota: MEMBERS.map(m => ({ nama: m.nama, setoran: m.setor })),
    riwayat: store.history,
  };
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'arisan-contoh.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('JSON diunduh. Simpen baik-baik kayak nota belanja.');
  } catch (e) {
    toast('Waduh, **unduhnya gagal**. Coba lagi, atau salin ringkasannya aja.');
  }
});
$('#ekspor-salin').addEventListener('click', async () => {
  const txt = ringkasanText();
  try {
    await navigator.clipboard.writeText(txt);
    toast('Ringkasan **disalin**! Tempel di grup WA gih.');
    beep(990, 0.08);
  } catch (e) {
    try {
      const ta = el('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      toast(ok ? 'Ringkasan **disalin**! Tempel di grup WA gih.' : 'Waduh, **salinnya gagal**. Coba tahan-tahan, atau salin manual ya.');
    } catch (e2) {
      toast('Waduh, **salinnya gagal**. Coba tahan-tahan, atau salin manual ya.');
    }
  }
});

/* ---------- CARI / FILTER ---------- */
$('#cari').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  let visible = 0;
  stampEls.forEach((b, i) => {
    const show = !q || MEMBERS[i].nama.toLowerCase().includes(q);
    b.classList.toggle('dim', !show);
    if (show) visible++;
  });
  if (q && !visible) toast('Waduh, **nggak ketemu**. Coba kata lain, atau hapus saringannya.');
});
$('#btn-kalk').addEventListener('click', () => openPanel('kalk', 'Kalkulator Iuran'));
$('#btn-jadwal').addEventListener('click', () => openPanel('jadwal', 'Jadwal 12 Ronde'));
$('#btn-riwayat').addEventListener('click', () => openPanel('riwayat', 'Riwayat Kocokan'));
$('#btn-ekspor').addEventListener('click', () => openPanel('ekspor', 'Ekspor Catatan'));
$('#ronde-chip').addEventListener('click', () => openPanel('jadwal', 'Jadwal 12 Ronde'));

/* ---------- MARQUEE ---------- */
function buildMarquee() {
  const b1 = MEMBERS.map(m => m.nama).join('  ✦  ') + '  ✦  ';
  const b2 = MEMBERS.map(m => fmtRpRb(m.setor) + '/bln').join('  •  ') + '  •  ';
  const b3 = 'KOCOK ADIL  ✦  SEED TERVERIFIKASI  ✦  RONDE ' + round + '  ✦  ';
  [['#track-1', b1], ['#track-2', b2], ['#track-3', b3]].forEach(([sel, txt]) => {
    const t = $(sel);
    t.textContent = '';
    for (let k = 0; k < 2; k++) t.appendChild(el('span', null, txt));
  });
  applyMarqueePref();
}
function applyMarqueePref() {
  const on = store.marquee;
  $('#marquee').classList.toggle('jeda', !on);
  $('#btn-marquee').setAttribute('aria-pressed', String(on));
  $('#btn-marquee').setAttribute('aria-label', 'Pita berjalan: ' + (on ? 'nyala' : 'mati'));
}
let idleTimer = 0;
function wakeMarquee() {
  if (!store.marquee) return;
  $('#marquee').classList.remove('jeda');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => $('#marquee').classList.add('jeda'), 5000);
}
$('#btn-marquee').addEventListener('click', () => {
  store.marquee = !store.marquee; saveStore(); applyMarqueePref();
  clearTimeout(idleTimer);
});

/* ---------- TOGGLE GERAK & SUARA ---------- */
function applyMotionPref() {
  document.documentElement.classList.toggle('gerak-mati', !store.motion);
  $('#btn-gerak').setAttribute('aria-pressed', String(store.motion));
  $('#btn-gerak').setAttribute('aria-label', 'Gerakan: ' + (store.motion ? 'nyala' : 'mati'));
}
$('#btn-gerak').addEventListener('click', () => {
  store.motion = !store.motion; saveStore(); applyMotionPref();
  toast(store.motion ? 'Gerakan **nyala** lagi. Peta goyang dikit, gapapa.' : 'Gerakan **mati**. Peta diem manis sekarang.');
});
function applyMutePref() {
  $('#btn-suara').setAttribute('aria-pressed', String(!store.muted));
  $('#btn-suara').setAttribute('aria-label', 'Suara: ' + (store.muted ? 'mati' : 'nyala'));
}
$('#btn-suara').addEventListener('click', () => {
  store.muted = !store.muted; saveStore(); applyMutePref();
  if (!store.muted) beep(880, 0.08);
});

/* ---------- EASTER EGG: ketik "lunas" ---------- */
let eggBuf = '';
function hideLunas() { $('#lunas-cap').hidden = true; }
document.addEventListener('keydown', e => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
  if (e.key.length === 1) {
    eggBuf = (eggBuf + e.key.toLowerCase()).slice(-5);
    if (eggBuf === 'lunas') { eggBuf = ''; rainCoins(); }
  }
});
function rainCoins() {
  const box = $('#coin-rain');
  box.textContent = '';
  const n = motionOn() ? 42 : 8;
  for (let i = 0; i < n; i++) {
    const c = el('span', 'coin');
    c.style.left = (Math.random() * 100) + 'vw';
    c.style.animationDuration = (1.6 + Math.random() * 1.8) + 's';
    c.style.animationDelay = (Math.random() * 0.9) + 's';
    c.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-koin"/></svg>';
    box.appendChild(c);
  }
  $('#lunas-cap').hidden = false;
  sfxMenang();
  toast('**LUNAS SEMUA!** Bu Bendahara senyum-senyum sendiri nih.');
  say('Lunas semua! Hujan koin turun.');
  setTimeout(() => { box.textContent = ''; hideLunas(); }, motionOn() ? 3800 : 2500);
}

/* ---------- INTRO ---------- */
function buildIntroWord() {
  const w = $('#kocok-word');
  w.textContent = '';
  Array.from('KOCOK!').forEach((ch, i) => {
    const s = el('span', 'ch', ch);
    s.style.setProperty('--i', i);
    w.appendChild(s);
  });
  w.classList.add('riso');
  w.setAttribute('data-text', 'KOCOK!');
}
let introDone = false;
function finishIntro() {
  if (introDone) return; introDone = true;
  const intro = $('#intro');
  intro.classList.add('done');
  setTimeout(() => {
    intro.remove();
    const app = $('#app');
    app.classList.add('siap');
    app.setAttribute('aria-hidden', 'false');
    stampEls.forEach(b => b.classList.add('on'));
    fitCam();
    buildMarquee();
    say('Peta arisan siap dijelajahi. 16 titik anggota, ronde ' + round + '.');
    afterIntro();
  }, motionOn() ? 450 : 0);
}
$('#intro').addEventListener('click', finishIntro);
$('#intro-skip').addEventListener('click', e => { e.stopPropagation(); finishIntro(); });

/* ---------- DEEP LINK ---------- */
function applyDeepLink() {
  let bad = [];
  const ar = params.get('ronde');
  if (ar !== null) {
    const n = Number(ar);
    if (Number.isInteger(n) && n >= 1 && n <= 12) setRound(n, { silent: true });
    else bad.push('ronde');
  }
  const aa = params.get('anggota');
  if (aa !== null) {
    const i = MEMBERS.findIndex(m => m.nama.toLowerCase() === aa.trim().toLowerCase());
    if (i >= 0) setTimeout(() => openMember(i), motionOn() ? 600 : 0);
    else bad.push('anggota');
  }
  if (bad.length) toast('Eh, link-nya **nyasar** (' + bad.join(' & ') + ' nggak ketemu). Bu bukain yang bener ya.');
}

/* ---------- DEMO (untuk capture hero) ---------- */
function afterIntro() {
  applyDeepLink();
  if (!DEMO) return;
  setTimeout(() => openKocok({ fast: true, demo: true }), 400);
  const t = setInterval(() => {
    if (!$('#kocok-lihat').hidden) {
      clearInterval(t);
      setTimeout(() => $('#kocok-lihat').click(), 700);
      setTimeout(() => { if (panelOpen) closePanel(); }, 3400);
    }
  }, 200);
}

/* GSAP 3.12.5 resmi, self-host (vendor/). Hanya dibutuhkan untuk Flip saat ganti
   ronde — jadi dimuat SEBELUM interaksi pertama, bukan saat load: 0 biaya TBT. */
let gsapWanted = false;
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}
async function ensureGsap() {
  if (FlipPlugin || gsapWanted) return;
  gsapWanted = true;
  try {
    await loadScript('vendor/gsap.min.js');
    await loadScript('vendor/Flip.min.js');
    if (window.gsap && window.Flip) {
      window.gsap.registerPlugin(window.Flip);
      FlipPlugin = window.Flip;
    }
  } catch (e) { /* tanpa Flip = pindah instan */ }
}
function lazyGsap() {
  const t = setTimeout(() => ensureGsap(), 15000);
  const kick = () => { clearTimeout(t); ensureGsap(); };
  window.addEventListener('pointerdown', kick, { once: true, capture: true });
  window.addEventListener('keydown', kick, { once: true, capture: true });
  window.addEventListener('wheel', kick, { once: true, capture: true });
}

/* ---------- INIT ---------- */
function init() {
  buildIntroWord();
  buildStamps();
  applyMotionPref();
  applyMutePref();
  fitCam();
  layoutStamps(false);
  $('#ronde-chip-tx').textContent = 'RONDE ' + round;
  window.addEventListener('resize', fitCam);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitCam());
  lazyGsap();
  wakeMarquee();
  if (!motionOn()) finishIntro();
  else setTimeout(finishIntro, 2700); /* pengaman */
}
init();

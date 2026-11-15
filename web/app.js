/* AnalogAtlas · Bölge sürümü
   Kullanıcı hedef koşulları girer; 0,5° küresel ızgarada uygunluk puanı hesaplanır,
   uygun hücreler bölgelere gruplanır, seçilen bölgenin CMIP6 dönemlerindeki değişimi gösterilir.
   Puan formülü tools/scoring.py ile birebir aynıdır. */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const ok = v => typeof v === 'number' && Number.isFinite(v);
const fmt = (v, d = 1) => ok(v) ? v.toLocaleString(LOC(), {minimumFractionDigits: d, maximumFractionDigits: d}) : '—';
const sgn = (v, d = 1) => !ok(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v), d);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const parseNum = t => { const s = String(t).trim().replace(/\s/g, '').replace(',', '.'); if (s === '') return null; return /^[-+]?\d*\.?\d+$/.test(s) ? parseFloat(s) : NaN; };
const nfmt = v => ok(v) ? v.toLocaleString(LOC(), {maximumFractionDigits: 3, useGrouping: false}) : '';
const ico = id => `<svg class="ic"><use href="#i-${id}"/></svg>`;
/* ---- dil (Türkçe / English): tx(tr, en) seçili dildeki metni döndürür ---- */
let LANG = (window.I18N && window.I18N.initial) === 'en' ? 'en' : 'tr';
const tx = (tr, en) => LANG === 'en' ? en : tr;
const LOC = () => LANG === 'en' ? 'en-US' : 'tr-TR';
const errText = e => typeof e === 'function' ? e() : (e || '');
const toast = t => { const el = $('#toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(el._t); el._t = setTimeout(() => el.style.display = 'none', 3200); };

/* ================= PARAMETERS ================= */
const W = {kapali: 0, dusuk: 1, orta: 2, yuksek: 3};
const WLAB = [['kapali', 'Kapalı'], ['dusuk', 'Düşük'], ['orta', 'Orta'], ['yuksek', 'Yüksek']];
const TOL = {T: 3, DTR: 2, FT: 20, W: 1, bare: 10, elev: 500, relief: 300};
const LOGP = {P: [10, 0.5], AI: [0.01, 0.5]};
const PARAMS = [
  {k: 'T', lab: 'Yıllık ortalama sıcaklık', u: '°C', d: 1, lim: [-60, 35], tip: 'WorldClim 1970–2000 yıllık ortalama hava sıcaklığı.', mars: '≈ −60 °C', moon: 'ekvatorda gece −170, gündüz +120 °C', fut: true},
  {k: 'P', lab: 'Yıllık yağış', u: 'mm', d: 0, lim: [0, 12000], tip: 'Yıllık toplam yağış (WorldClim).', mars: '0 (sıvı yağış yok)', moon: '0', fut: true},
  {k: 'AI', lab: 'Kuraklık indeksi (P/PET)', u: '', d: 3, lim: [0, 10], tip: 'Yağışın potansiyel buharlaşmaya oranı (Hargreaves). < 0,05 hiper-kurak, 0,05–0,2 kurak, 0,2–0,5 yarı-kurak.', mars: '≈ 0', moon: '≈ 0', fut: true},
  {k: 'DTR', lab: 'Gün içi sıcaklık farkı', u: '°C', d: 1, lim: [0, 30], tip: 'Günlük en yüksek ve en düşük sıcaklık farkının yıllık ortalaması (WorldClim BIO2).', mars: '≈ 70–90 °C', moon: '≈ 250–300 °C', fut: true},
  {k: 'FT', lab: 'Donma-çözülme günü', u: 'gün/yıl', d: 0, lim: [0, 365], tip: 'Gün içinde hem donma hem çözülme olan günler. Aylık normallerden yaklaşık hesaplandı (Yöntem ekranı).', mars: 'orta-yüksek enlemlerde mevsimsel', moon: '—', fut: true},
  {k: 'perma', lab: 'Permafrost', u: '', cat: 'perma', tip: 'İklim tabanlı gösterge: yıllık ortalama ≤ −3 °C ise büyük olasılıkla var, ≥ +1 °C ise yok, arası geçiş. Ölçülmüş permafrost haritası değildir.', mars: 'orta-yüksek enlemlerde zemin buzu', moon: 'kutup gölgelerinde buz', fut: true},
  {k: 'W', lab: 'Rüzgâr hızı (2 m)', u: 'm/s', d: 1, lim: [0, 15], tip: 'Yıllık ortalama rüzgâr hızı (WorldClim). Gelecek projeksiyonu yok; sabit tutulur.', mars: '2–10 m/s, toz fırtınaları', moon: '0'},
  {k: 'bare', lab: 'Çıplak yüzey oranı', u: '%', d: 0, lim: [0, 100], tip: 'Hücrede MODIS "çorak" (barren) sınıfının payı, 2023. Sabit tutulur.', mars: '%100', moon: '%100'},
  {k: 'elev', lab: 'Rakım', u: 'm', d: 0, lim: [-500, 7000], tip: 'Hücrenin ortalama rakımı. Yüksek rakım, düşük basınç ve yüksek UV için yaklaşık göstergedir.', mars: 'basınç ≈ 6 mbar', moon: 'vakum'},
  {k: 'relief', lab: 'Bölgesel rölyef', u: 'm', d: 0, lim: [0, 7000], tip: 'Hücre içindeki (~55 km) en yüksek ve en alçak nokta farkı. Düz/engebeli arazi ayrımı için kaba göstergedir.', mars: '—', moon: '—'},
  {k: 'lith', lab: 'Kaya türü', u: '', cat: 'lith', tip: 'GLiM 0,5° hücrede baskın kaya sınıfı (Hartmann & Moosdorf 2012). Seçilen türe 1, aynı ana gruba 0,5, bilinmeyene 0,3 puan.', mars: 'ağırlıkla bazaltik', moon: 'mare bazaltı, anortozit'}
];
const PARAMS_EN = {
  T: {lab: 'Annual mean temperature', tip: 'WorldClim 1970–2000 annual mean air temperature.', mars: '≈ −60 °C', moon: 'equator: −170 at night, +120 °C by day'},
  P: {lab: 'Annual precipitation', tip: 'Total annual precipitation (WorldClim).', mars: '0 (no liquid precipitation)', moon: '0'},
  AI: {lab: 'Aridity index (P/PET)', tip: 'Ratio of precipitation to potential evapotranspiration (Hargreaves). < 0.05 hyper-arid, 0.05–0.2 arid, 0.2–0.5 semi-arid.', mars: '≈ 0', moon: '≈ 0'},
  DTR: {lab: 'Diurnal temperature range', tip: 'Annual mean of the difference between daily maximum and minimum temperature (WorldClim BIO2).', mars: '≈ 70–90 °C', moon: '≈ 250–300 °C'},
  FT: {lab: 'Freeze–thaw days', u: 'days/yr', tip: 'Days with both freezing and thawing. Approximated from monthly normals (see Method).', mars: 'seasonal at mid–high latitudes', moon: '—'},
  perma: {lab: 'Permafrost', tip: 'Climate-based indicator: likely present if the annual mean is ≤ −3 °C, absent if ≥ +1 °C, transitional in between. Not a measured permafrost map.', mars: 'ground ice at mid–high latitudes', moon: 'ice in polar shadows'},
  W: {lab: 'Wind speed (2 m)', tip: 'Annual mean wind speed (WorldClim). No future projection; held constant.', mars: '2–10 m/s, dust storms', moon: '0'},
  bare: {lab: 'Bare surface fraction', tip: 'Share of the MODIS "barren" class in the cell, 2023. Held constant.', mars: '100%', moon: '100%'},
  elev: {lab: 'Elevation', tip: 'Mean elevation of the cell. A rough proxy for low pressure and high UV.', mars: 'pressure ≈ 6 mbar', moon: 'vacuum'},
  relief: {lab: 'Regional relief', tip: 'Difference between the highest and lowest point within the cell (~55 km). A rough indicator of flat versus rugged terrain.', mars: '—', moon: '—'},
  lith: {lab: 'Rock type', tip: 'Dominant rock class in the GLiM 0.5° cell (Hartmann & Moosdorf 2012). The selected type scores 1, the same main group 0.5, unknown 0.3.', mars: 'mainly basaltic', moon: 'mare basalt, anorthosite'}
};
const WLAB_EN = ['Off', 'Low', 'Medium', 'High'];
const PRESETS_EN = {mars_kurak: 'Mars · arid regolith', mars_buz: 'Mars · icy / periglacial', mars_volkanik: 'Mars · basaltic volcanic', mars_sulu: 'Mars · evaporite / aqueous sediment', ay_regolit: 'Moon · basaltic regolith', ay_soguk: 'Moon · polar / extreme cold'};
const PK = Object.fromEntries(PARAMS.map(p => [p.k, p]));
const LITH_GROUP = {1: 'tortul', 3: 'tortul', 5: 'tortul', 6: 'tortul', 14: 'tortul', 2: 'volkanik', 7: 'volkanik', 10: 'volkanik', 12: 'volkanik', 4: 'plutonik', 9: 'plutonik', 13: 'plutonik', 8: 'metamorfik'};
const LITH_OPTS = [2, 12, 10, 7, 14, 1, 3, 5, 6, 8, 4, 9, 13];
const PRESETS = {
  mars_kurak: {label: 'Mars · kurak regolit', color: '#B96D4B', tag: 'mars_kurak', crit: {P: {hi: 100, w: 'yuksek'}, AI: {hi: 0.05, w: 'yuksek'}, bare: {lo: 80, w: 'yuksek', req: true}, DTR: {lo: 14, w: 'orta'}, T: {hi: 15, w: 'orta'}, elev: {lo: 1000, w: 'dusuk'}}},
  mars_buz: {label: 'Mars · buzlu / periglasiyal', color: '#5B84B1', tag: 'mars_buz', crit: {T: {hi: -8, w: 'yuksek'}, P: {hi: 250, w: 'orta'}, perma: {mode: 'var', w: 'yuksek', req: true}, FT: {lo: 30, w: 'orta'}, bare: {lo: 50, w: 'yuksek'}}},
  mars_volkanik: {label: 'Mars · bazaltik volkanik', color: '#7A5C4A', tag: 'mars_volkanik', crit: {lith: {set: [2, 10, 12], w: 'yuksek', req: true}, bare: {lo: 30, w: 'orta'}, T: {hi: 10, w: 'orta'}, P: {hi: 1000, w: 'dusuk'}}},
  mars_sulu: {label: 'Mars · evaporit / sulu çökel', color: '#A88A3D', tag: 'mars_sulu', crit: {lith: {set: [14, 1], w: 'yuksek'}, AI: {hi: 0.2, w: 'yuksek'}, bare: {lo: 50, w: 'orta'}, P: {hi: 300, w: 'orta'}}},
  ay_regolit: {label: 'Ay · bazaltik regolit', color: '#8D8B83', tag: 'ay', crit: {lith: {set: [2, 12], w: 'yuksek'}, P: {hi: 300, w: 'yuksek'}, bare: {lo: 50, w: 'yuksek'}, relief: {hi: 800, w: 'orta'}, W: {hi: 4, w: 'dusuk'}}},
  ay_soguk: {label: 'Ay · kutup / aşırı soğuk', color: '#76866C', tag: null, crit: {T: {hi: -15, w: 'yuksek'}, P: {hi: 200, w: 'yuksek'}, bare: {lo: 50, w: 'yuksek'}}}
};
const SSP = {ssp245: 'SSP2-4.5', ssp585: 'SSP5-8.5'};
const PERIODS = ['2021-2040', '2041-2060', '2061-2080'], PMID = [2030, 2050, 2070];

/* ================= STATE ================= */
const blankCrit = () => Object.fromEntries(PARAMS.map(p => [p.k, p.cat === 'lith' ? {set: [], w: 'kapali', req: false} : p.cat === 'perma' ? {mode: 'onemsiz', w: 'kapali', req: false} : {lo: null, hi: null, w: 'kapali', req: false}]));
const S = {crit: blankCrit(), noice: true, preset: null, step: 'target', listTab: 'regions', ssp: 'ssp245', sel: null, zoom: false, showSites: true, errors: {}, score: null, regions: [], eligible: 0};
let G = null;   // decoded grid

/* ================= DATA DECODE ================= */
async function decodeGrid() {
  const meta = GRID.meta, bin = Uint8Array.from(atob(GRID.b64), c => c.charCodeAt(0));
  let buf;
  if ('DecompressionStream' in window) buf = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  else throw new Error(tx('Tarayıcınız DecompressionStream desteklemiyor. Güncel Chrome, Edge, Firefox veya Safari kullanın.', 'Your browser does not support DecompressionStream. Please use an up-to-date Chrome, Edge, Firefox or Safari.'));
  const n = meta.n, dv = new DataView(buf); let off = 0;
  const cell = new Int32Array(n); for (let i = 0; i < n; i++) cell[i] = dv.getInt32(off + 4 * i, true); off += 4 * n;
  const cidx = new Int16Array(n), ridx = new Int16Array(n);
  for (let i = 0; i < n; i++) cidx[i] = dv.getInt16(off + 2 * i, true); off += 2 * n;
  for (let i = 0; i < n; i++) ridx[i] = dv.getInt16(off + 2 * i, true); off += 2 * n;
  const F = {};
  for (const f of meta.fields) {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = dv.getInt16(off + 2 * i, true); a[i] = v === -32768 ? NaN : v / f.scale; }
    F[f.key] = a; off += 2 * n;
  }
  const pos = new Int32Array(meta.nrows * meta.ncols).fill(-1); for (let i = 0; i < n; i++) pos[cell[i]] = i;
  const lat = new Float32Array(n), lon = new Float32Array(n), area = new Float32Array(n);
  for (let i = 0; i < n; i++) { const r = Math.floor(cell[i] / meta.ncols), k = cell[i] % meta.ncols; lat[i] = 89.75 - 0.5 * r; lon[i] = -179.75 + 0.5 * k; area[i] = 55.6 * 55.6 * Math.cos(lat[i] * Math.PI / 180); }
  return {meta, n, cell, cidx, ridx, F, pos, lat, lon, area};
}

/* ================= SCORING (= tools/scoring.py) ================= */
function rangeScore(k, v, lo, hi) {
  if (!ok(v)) return NaN;   // missing value: never counts as a match
  let x = v, a = lo == null ? -Infinity : lo, b = hi == null ? Infinity : hi, t;
  if (LOGP[k]) { const [o, tt] = LOGP[k]; t = tt; x = Math.log(Math.max(v, 0) + o); a = lo == null ? -Infinity : Math.log(lo + o); b = hi == null ? Infinity : Math.log(hi + o); }
  else t = TOL[k];
  const d = x < a ? a - x : x > b ? x - b : 0;
  return Math.exp(-((d / t) ** 2));
}
const permaIndex = T => Math.min(1, Math.max(0, (1 - T) / 4));
function lithScore(L, sel) {
  if (sel.includes(L)) return 1;
  const g = LITH_GROUP[L];
  if (g && sel.some(x => LITH_GROUP[x] === g)) return 0.5;
  return (L === 0 || L === 11 || L === 15) ? 0.3 : 0;
}
function activeParams(crit = S.crit) {
  return PARAMS.filter(p => {
    const c = crit[p.k];
    if (p.cat === 'lith') return (W[c.w] > 0 || c.req) && c.set.length > 0;
    if (p.cat === 'perma') return c.mode !== 'onemsiz' && (W[c.w] > 0 || c.req);
    return (W[c.w] > 0 || c.req) && (c.lo != null || c.hi != null);
  });
}
/** score for one cell index i. getter(k) returns value for key (baseline or future). Returns {s, parts, failed} */
function cellScore(i, get, crit = S.crit, noice = S.noice) {
  let num = 0, den = 0, failed = false, missing = false; const parts = {};
  for (const p of activeParams(crit)) {
    const c = crit[p.k], w = W[c.w]; let s;
    if (p.cat === 'lith') s = lithScore(Math.round(G.F.lith[i]) || 0, c.set);
    else if (p.cat === 'perma') { const T = get('T', i); s = ok(T) ? (c.mode === 'var' ? permaIndex(T) : 1 - permaIndex(T)) : NaN; }
    else s = rangeScore(p.k, get(p.k, i), c.lo, c.hi);
    parts[p.k] = s;
    if (Number.isNaN(s)) { missing = true; continue; }
    num += w * s; den += w;
    if (c.req && s < 0.999) failed = true;
  }
  if (noice && G.F.icemask[i] >= 0.5) failed = true;
  return {s: (failed || missing) ? NaN : (den ? num / den : 0), parts, failed, missing};
}
const baseGet = (k, i) => G.F[k][i];
const futGet = (ssp, per) => (k, i) => { const f = G.F[`${ssp}_${per}:${k}`]; return f ? f[i] : G.F[k][i]; };

function computeAll() {
  const n = G.n, sc = new Float32Array(n); let elig = 0;
  for (let i = 0; i < n; i++) { const r = cellScore(i, baseGet); sc[i] = r.s; if (!Number.isNaN(r.s)) elig++; }
  S.score = sc; S.eligible = elig;
  S.regions = findRegions(sc);
  if (S.sel && S.sel.kind === 'region') { const same = S.regions.find(r => r.cells.includes(S.sel.best)); S.sel = same ? selRegion(same) : null; }
  if (S.sel && S.sel.kind !== 'region') S.sel = selCell(S.sel.best, S.sel.site);
  if (!S.sel && S.regions.length) S.sel = selRegion(S.regions[0]);
}
/* connected components of high-scoring cells */
function findRegions(sc) {
  const vals = []; for (let i = 0; i < G.n; i++) if (!Number.isNaN(sc[i])) vals.push(sc[i]);
  if (!vals.length) return [];
  vals.sort((a, b) => b - a);
  const q = vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.02))];
  const thr = vals[0] >= 0.7 ? Math.max(0.7, q) : Math.max(q, vals[0] * 0.9);
  const NC = G.meta.ncols, NR = G.meta.nrows, seen = new Uint8Array(G.n), regs = [];
  for (let i = 0; i < G.n; i++) {
    if (seen[i] || !(sc[i] >= thr)) continue;
    const cells = [], stack = [i]; seen[i] = 1;
    while (stack.length) {
      const j = stack.pop(); cells.push(j);
      const r = Math.floor(G.cell[j] / NC), k = G.cell[j] % NC;
      for (let dr = -1; dr <= 1; dr++) for (let dk = -1; dk <= 1; dk++) {
        if (!dr && !dk) continue; const rr = r + dr; if (rr < 0 || rr >= NR) continue;
        const nb = G.pos[rr * NC + ((k + dk + NC) % NC)];
        if (nb >= 0 && !seen[nb] && sc[nb] >= thr) { seen[nb] = 1; stack.push(nb); }
      }
    }
    let sum = 0, best = cells[0], ar = 0; for (const j of cells) { sum += sc[j]; ar += G.area[j]; if (sc[j] > sc[best]) best = j; }
    regs.push({cells, mean: sum / cells.length, max: sc[best], best, area: ar, thr, parts: 1});
  }
  regs.forEach(r => nameRegion(r));
  // merge components that carry the same name (e.g. several parts of one desert) into one region
  const byName = new Map();
  for (const r of regs) {
    const key = r.key;
    const m = byName.get(key);
    if (!m) { byName.set(key, r); continue; }
    const tot = m.cells.length + r.cells.length;
    m.mean = (m.mean * m.cells.length + r.mean * r.cells.length) / tot;
    m.cells = m.cells.concat(r.cells); m.area += r.area; m.parts = (m.parts || 1) + 1;
    if (r.max > m.max) { m.max = r.max; m.best = r.best; }
  }
  const out = [...byName.values()];
  out.forEach(r => nameRegion(r));
  out.sort((a, b) => (b.mean - a.mean) || (b.area - a.area));
  return out;
}
function mode(arr) { const m = new Map(); let best = null, bc = 0; for (const x of arr) { if (x < 0) continue; const c = (m.get(x) || 0) + 1; m.set(x, c); if (c > bc) { bc = c; best = x; } } return best; }
function nameRegion(r) {
  const set = new Set(r.cells);
  r.sites = G.meta.sites.filter(s => s.cell != null && set.has(s.cell));
  const geo = mode(r.cells.map(j => G.ridx[j]));
  const cc = new Map(); r.cells.forEach(j => { const c = G.cidx[j]; if (c >= 0) cc.set(c, (cc.get(c) || 0) + 1); });
  const top = [...cc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  r.countries = top.map(c => G.meta.countries[c]);
  const TRN = TRDATA.meta || G.meta, ri = TRN.regions[G.ridx[r.best]] ? G.ridx[r.best] : geo;
  const nameIn = (regs, cs, loc, suffix) => { const near = ri != null ? regs[ri] : null; return (near ? near.charAt(0).toLocaleUpperCase(loc) + near.slice(1) : null) || (cs[top[0]] ? suffix(cs[top[0]]) : `${fmt(G.lat[r.best], 1)}°, ${fmt(G.lon[r.best], 1)}°`); };
  r.key = nameIn(TRN.regions, TRN.countries, 'tr-TR', c => `${c} bölgesi`);   // birleştirme anahtarı: her dilde aynı bölgeler
  r.name = LANG === 'en' ? nameIn(G.meta.regions, G.meta.countries, 'en-US', c => `${c} region`) : r.key;
}
const selRegion = r => ({kind: 'region', cells: r.cells, best: r.best, name: r.name, countries: r.countries, sites: r.sites, area: r.area, mean: r.mean});
function selCell(i, site = null) {
  // a single cell (or known site's cell): include its component if it is part of a region
  const reg = S.regions.find(r => r.cells.includes(i));
  if (reg && !site) return selRegion(reg);
  const c = G.cidx[i] >= 0 ? G.meta.countries[G.cidx[i]] : '';
  return {kind: site ? 'site' : 'cell', cells: [i], best: i, site, name: site ? site.name : (G.meta.regions[G.ridx[i]] || c || tx('Seçili hücre', 'Selected cell')), countries: c ? [c] : [], sites: site ? [site] : G.meta.sites.filter(s => s.cell === i), area: G.area[i], mean: S.score[i]};
}
/* ---- daha önce yapılan testler: bölgedeki ve bitişiğindeki analog sahaları ---- */
function regionTestSites(sel) {
  const set = new Set(sel.cells), NC = G.meta.ncols, out = [];
  for (const s of G.meta.sites) {
    if (s.cell == null) continue;
    let inside = set.has(s.cell), near = false;
    if (!inside) { const r = Math.floor(G.cell[s.cell] / NC), k = G.cell[s.cell] % NC;
      for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1; b++) { const rr = r + a; if (rr < 0 || rr >= G.meta.nrows) continue; const j = G.pos[rr * NC + ((k + b + NC) % NC)]; if (j >= 0 && set.has(j)) { near = true; break; } } }
    if (inside || near) out.push({site: s, inside});
  }
  const rank = {ajans: 0, bilim: 1, yok: 2};
  return out.sort((x, y) => (rank[x.site.test_level] - rank[y.site.test_level]) || (y.inside - x.inside));
}
function nearestTestSite(sel) {
  const i = sel.best, la = G.lat[i] * Math.PI / 180, lo = G.lon[i] * Math.PI / 180; let best = null, bd = Infinity;
  for (const s of G.meta.sites) { if (!s.tests || !s.tests.length) continue;
    const la2 = s.lat * Math.PI / 180, lo2 = s.lon * Math.PI / 180;
    const d = 6371 * 2 * Math.asin(Math.sqrt(Math.sin((la2 - la) / 2) ** 2 + Math.cos(la) * Math.cos(la2) * Math.sin((lo2 - lo) / 2) ** 2));
    if (d < bd) { bd = d; best = s; } }
  return best ? {site: best, km: bd} : null;
}
const TLV_CLS = {ajans: 'b-calc', bilim: 'b-model', yok: 'b-obs'};
function testsHTML(sel, compact = false) {
  const list = regionTestSites(sel), lv = G.meta.test_levels || {};
  const withTests = list.filter(x => x.site.tests && x.site.tests.length);
  let h = '';
  if (!list.length) {
    const nn = nearestTestSite(sel);
    const km = nn ? (Math.round(nn.km / 10) * 10 >= 1000 ? Math.round(nn.km / 100) * 100 : Math.round(nn.km / 10) * 10) : 0;
    h = tx(`<div class="empty" style="text-align:left">Bu bölgede veya hemen bitişiğinde, listemizdeki analog sahalarından hiçbiri yok; dolayısıyla kayıtlı bir test bilinmiyor.${nn ? ` En yakın test yapılmış saha: <b>${esc(nn.site.name)}</b> (${esc(nn.site.country)}), yaklaşık ${km} km uzakta · ${esc(lv[nn.site.test_level] || '')}.` : ''}</div>`,
      `<div class="empty" style="text-align:left">None of the analog sites in our list lies in or right next to this region, so no recorded test is known.${nn ? ` Nearest tested site: <b>${esc(nn.site.name)}</b> (${esc(nn.site.country)}), about ${km.toLocaleString(LOC())} km away · ${esc(lv[nn.site.test_level] || '')}.` : ''}</div>`);
  } else {
    h = list.map(({site: s, inside}) => `<div class="tst-site"><div class="tst-head"><b>${esc(s.name)}</b> <span class="muted small">${esc(s.country)} · ${inside ? tx('bölge içinde', 'inside the region') : tx('bölgenin hemen bitişiğinde', 'right next to the region')}</span> <span class="badge ${TLV_CLS[s.test_level] || 'b-obs'}">${esc(lv[s.test_level] || '')}</span></div>` +
      (s.tests && s.tests.length ? s.tests.slice(0, compact ? 2 : 9).map(t => `<div class="camp-item"><div class="y">${esc(t.y)}</div><div class="o">${esc(t.org)}</div><div class="w">${esc(t.what)}</div>${t.url ? `<a class="small" href="${esc(t.url)}" target="_blank" rel="noopener">${tx('kaynak', 'source')} ↗</a>` : ''}</div>`).join('') + (compact && s.tests.length > 2 ? `<p class="small muted">${tx(`+${s.tests.length - 2} kayıt daha (Uygun bölgeler ekranında)`, `+${s.tests.length - 2} more record${s.tests.length - 2 > 1 ? 's' : ''} (on the Suitable regions screen)`)}</p>` : '')
        : `<p class="small muted" style="margin:4px 0 0 4px">${tx('Bu sahada uzay ajansı veya kurum testi kaydı bulunamadı.', 'No space agency or institutional test record was found for this site.')}</p>`) + '</div>').join('');
  }
  return h + `<p class="small muted" style="margin-top:8px">${esc(G.meta.test_note || '')} ${tx(`Sahalar literatürden derlenen ${G.meta.sites.length} analog sahasıyla sınırlıdır; listede olmayan çalışmalar gösterilmez.`, `Sites are limited to the ${G.meta.sites.length} analog sites compiled from the literature; studies not on the list are not shown.`)}</p>`;
}
function testBadge(r) {
  const list = regionTestSites(r); if (!list.length) return '';
  const ag = list.filter(x => x.site.test_level === 'ajans').length, bl = list.filter(x => x.site.test_level === 'bilim').length;
  return ag ? `<span class="tst-chip ag">★ ${tx(`${ag} sahada ajans testi`, `agency tests at ${ag} site${ag > 1 ? 's' : ''}`)}</span>` : bl ? `<span class="tst-chip">${tx('bilimsel analog çalışması', 'scientific analog study')}</span>` : '';
}
/* mean of a field over selected cells */
function selMean(get) { const sel = S.sel; let s = 0, n = 0; for (const i of sel.cells) { const v = get(i); if (ok(v)) { s += v; n++; } } return n ? s / n : NaN; }
function selScore(get) { return selMean(i => cellScore(i, get).s); }
function selScoreRaw(get) {   // score ignoring hard filters (to show how far)
  return selMean(i => { let num = 0, den = 0; for (const p of activeParams()) { const c = S.crit[p.k], w = W[c.w]; let s;
    if (p.cat === 'lith') s = lithScore(Math.round(G.F.lith[i]) || 0, c.set); else if (p.cat === 'perma') { const T = get('T', i); s = ok(T) ? (c.mode === 'var' ? permaIndex(T) : 1 - permaIndex(T)) : NaN; } else s = rangeScore(p.k, get(p.k, i), c.lo, c.hi);
    if (Number.isNaN(s)) return NaN; num += w * s; den += w; } return den ? num / den : NaN; });
}

/* ================= FIT LABELS ================= */
function critText(p, c = S.crit[p.k]) {
  if (p.cat === 'lith') return c.set.map(x => G.meta.lith[x]).join(', ') || '—';
  if (p.cat === 'perma') return c.mode === 'var' ? tx('var', 'present') : c.mode === 'yok' ? tx('yok', 'absent') : '—';
  const u = p.u ? ' ' + p.u : '';
  if (c.lo != null && c.hi != null) return `${fmt(c.lo, p.d)}–${fmt(c.hi, p.d)}${u}`;
  if (c.lo != null) return `≥ ${fmt(c.lo, p.d)}${u}`;
  if (c.hi != null) return `≤ ${fmt(c.hi, p.d)}${u}`;
  return '—';
}
const fitClass = s => !ok(s) ? '' : s >= 0.999 ? 'ok' : s >= 0.5 ? 'near' : 'no';
const fitWord = s => !ok(s) ? '' : s >= 0.999 ? tx('✓ uyuyor', '✓ fits') : s >= 0.5 ? tx('~ yakın', '~ close') : tx('✗ uymuyor', '✗ does not fit');
function valText(p, i, get = baseGet) {
  if (p.cat === 'lith') return G.meta.lith[Math.round(G.F.lith[i]) || 0];
  if (p.cat === 'perma') { const pi = permaIndex(get('T', i)); return pi >= 0.999 ? tx('büyük olasılıkla var', 'likely present') : pi <= 0.001 ? tx('yok', 'absent') : tx('geçiş', 'transitional'); }
  return fmt(get(p.k, i), p.d) + (p.u ? ' ' + p.u : '');
}
function valTextMean(p, get = baseGet) {
  if (p.cat === 'lith') return G.meta.lith[mode(S.sel.cells.map(i => Math.round(G.F.lith[i]) || 0)) || 0];
  if (p.cat === 'perma') { const pi = selMean(i => permaIndex(get('T', i))); return pi >= 0.999 ? tx('büyük olasılıkla var', 'likely present') : pi <= 0.001 ? tx('yok', 'absent') : tx(`geçiş (%${fmt(pi * 100, 0)})`, `transitional (${fmt(pi * 100, 0)}%)`); }
  return fmt(selMean(i => get(p.k, i)), p.d) + (p.u ? ' ' + p.u : '');
}
function partMean(p, get = baseGet) { return selMean(i => cellScore(i, get, S.crit, false).parts[p.k]); }

/* ================= NAVIGATION ================= */
const STEPS = ['target', 'results', 'climate', 'report'];
function goStep(name) {
  if (name !== 'target' && Object.keys(S.errors).length) { toast(tx('Önce kırmızı işaretli değeri düzeltin.', 'First correct the value marked in red.')); name = 'target'; }
  if ((name === 'climate' || name === 'report') && !S.sel) { toast(tx('Önce bir bölge seçin.', 'Select a region first.')); name = 'results'; }
  if (name === 'results' && !activeParams().length) { toast(tx('En az bir koşul girin veya hazır senaryo seçin.', 'Enter at least one condition or choose a preset scenario.')); name = 'target'; }
  S.step = name;
  const idx = STEPS.indexOf(name);
  $$('#steps .step-btn').forEach(b => { const k = STEPS.indexOf(b.dataset.s); b.classList.toggle('on', b.dataset.s === name); b.classList.toggle('done', idx >= 0 && k < idx); b.setAttribute('aria-current', b.dataset.s === name ? 'step' : 'false'); });
  $$('.aux-btn').forEach(b => b.classList.toggle('on', b.dataset.s === name));
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + name));
  window.scrollTo({top: 0});
  render();
}
function render() {
  try { ({target: renderTarget, results: renderResults, climate: renderClimate, report: renderReport, method: renderMethod, sources: renderSources})[S.step](); }
  catch (e) { console.error(e); toast(tx('Görüntüleme hatası: ', 'Display error: ') + e.message); }
}

/* ================= 1 · TARGET ================= */
function renderPresets() {
  $('#presets').innerHTML = Object.entries(PRESETS).map(([k, p]) => `<button class="pchip ${S.preset === k ? 'on' : ''}" data-p="${k}" aria-pressed="${S.preset === k}"><span class="dot" style="background:${p.color}"></span>${p.label}</button>`).join('');
}
function applyPreset(k) {
  const p = PRESETS[k]; S.crit = blankCrit();
  for (const [key, c] of Object.entries(p.crit)) Object.assign(S.crit[key], {req: false}, JSON.parse(JSON.stringify(c)));
  S.noice = true; S.preset = k; S.errors = {}; S.sel = null;
}
function critRow(p) {
  const c = S.crit[p.k], off = W[c.w] === 0 && !c.req;
  const wseg = `<div class="wseg" role="radiogroup" aria-label="${tx(`${p.lab} önem`, `${p.lab} importance`)}">${WLAB.map(([v, l]) => `<button data-w="${v}" class="${c.w === v ? 'on' : ''}" aria-checked="${c.w === v}" role="radio">${l}</button>`).join('')}</div>`;
  let input;
  if (p.cat === 'lith') input = `<div class="lithchips">${LITH_OPTS.map(x => `<button class="chip ${c.set.includes(x) ? 'on' : ''}" data-l="${x}" aria-pressed="${c.set.includes(x)}">${G.meta.lith[x]}</button>`).join('')}</div>`;
  else if (p.cat === 'perma') input = `<div class="seg" data-perma>${[['onemsiz', tx('Önemsiz', 'Not important')], ['var', tx('Var', 'Present')], ['yok', tx('Yok', 'Absent')]].map(([v, l]) => `<button data-m="${v}" class="${c.mode === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  else input = `<div class="rng"><div class="numbox ${S.errors[p.k] ? 'err' : ''}"><input data-b="lo" inputmode="decimal" placeholder="${tx('en az', 'min')}" aria-label="${p.lab} ${tx('en az', 'min')}" value="${nfmt(c.lo)}">${p.u ? `<span class="u">${p.u}</span>` : ''}</div><span class="dash">–</span><div class="numbox ${S.errors[p.k] ? 'err' : ''}"><input data-b="hi" inputmode="decimal" placeholder="${tx('en çok', 'max')}" aria-label="${p.lab} ${tx('en çok', 'max')}" value="${nfmt(c.hi)}">${p.u ? `<span class="u">${p.u}</span>` : ''}</div></div>`;
  const head = `<div><div class="nm">${p.lab} <i class="info" tabindex="0" data-tip="${esc(p.tip)}">i</i></div><div class="ref">Mars: ${p.mars} · ${tx('Ay', 'Moon')}: ${p.moon}</div></div>`;
  if (p.cat === 'lith') return `<div class="crit lith ${off ? 'off' : ''}" data-k="${p.k}">${head}<div class="mid">${input}<div class="cw">${wseg}</div></div>
    <label class="req"><input type="checkbox" data-req ${c.req ? 'checked' : ''}> ${tx('zorunlu', 'required')}</label><div class="cerr"></div></div>`;
  return `<div class="crit ${off ? 'off' : ''}" data-k="${p.k}">
    ${head}
    ${input}
    <div class="cw">${wseg}</div>
    <label class="req"><input type="checkbox" data-req ${c.req ? 'checked' : ''}> ${tx('zorunlu', 'required')}</label>
    <div class="cerr ${S.errors[p.k] ? 'on' : ''}" role="alert">${esc(errText(S.errors[p.k]))}</div>
  </div>`;
}
function renderCritList() { $('#critList').innerHTML = PARAMS.map(critRow).join(''); $('#noice').checked = S.noice; }
function bindTarget() {
  $('#presets').onclick = e => { const b = e.target.closest('.pchip'); if (!b) return; applyPreset(b.dataset.p); renderPresets(); renderCritList(); recompute(); };
  $('#clearAll').onclick = () => { S.crit = blankCrit(); S.preset = null; S.errors = {}; S.sel = null; renderPresets(); renderCritList(); recompute(); };
  $('#noice').onchange = e => { S.noice = e.target.checked; S.preset = null; renderPresets(); recompute(); };
  const L = $('#critList');
  L.addEventListener('click', e => {
    const row = e.target.closest('.crit'); if (!row) return; const k = row.dataset.k, c = S.crit[k];
    const wb = e.target.closest('.wseg button'); if (wb) { c.w = wb.dataset.w; if (PK[k].cat === 'perma' && c.mode === 'onemsiz' && c.w !== 'kapali') c.mode = 'var'; changed(k); return; }
    const lb = e.target.closest('.lithchips .chip'); if (lb) { const x = +lb.dataset.l; c.set = c.set.includes(x) ? c.set.filter(y => y !== x) : [...c.set, x]; if (c.set.length && c.w === 'kapali') c.w = 'orta'; changed(k); return; }
    const mb = e.target.closest('[data-perma] button'); if (mb) { c.mode = mb.dataset.m; if (c.mode !== 'onemsiz' && c.w === 'kapali') c.w = 'orta'; if (c.mode === 'onemsiz') { c.w = 'kapali'; c.req = false; } changed(k); }
  });
  L.addEventListener('change', e => {
    const row = e.target.closest('.crit'); if (!row) return; const k = row.dataset.k, c = S.crit[k];
    if (e.target.matches('[data-req]')) { c.req = e.target.checked; if (c.req && c.w === 'kapali') c.w = 'orta'; changed(k); }
    if (e.target.matches('[data-b]') && !S.errors[k]) { const v = c[e.target.dataset.b]; e.target.value = nfmt(v); }
  });
  L.addEventListener('input', e => {
    if (!e.target.matches('[data-b]')) return;
    const row = e.target.closest('.crit'), k = row.dataset.k, p = PK[k], c = S.crit[k];
    const lo = parseNum(row.querySelector('[data-b=lo]').value), hi = parseNum(row.querySelector('[data-b=hi]').value);
    let err = null;
    if (Number.isNaN(lo) || Number.isNaN(hi)) err = () => tx('Sayı bekleniyor. Ondalık için virgül veya nokta kullanın (ör. 0,05).', 'Number expected. Use a dot or comma for decimals (e.g. 0.05).');
    else if ([lo, hi].some(v => v != null && (v < p.lim[0] || v > p.lim[1]))) err = () => tx(`${p.lab} için geçerli aralık ${fmt(p.lim[0], 0)}–${fmt(p.lim[1], 0)}${p.u ? ' ' + p.u : ''}. Dünya'daki değerler bu aralığın dışına çıkmaz.`, `Valid range for ${p.lab.toLowerCase()}: ${fmt(p.lim[0], 0)} to ${fmt(p.lim[1], 0)}${p.u ? ' ' + p.u : ''}. Values on Earth do not fall outside this range.`);
    else if (lo != null && hi != null && lo > hi) err = () => tx(`"En az" (${fmt(lo, p.d)}) değeri "en çok" (${fmt(hi, p.d)}) değerinden büyük olamaz.`, `The "min" value (${fmt(lo, p.d)}) cannot be greater than the "max" value (${fmt(hi, p.d)}).`);
    const errNow = !!err;
    if (err) S.errors[k] = err; else delete S.errors[k];
    row.querySelectorAll('.numbox').forEach(b => b.classList.toggle('err', errNow));
    const eb = row.querySelector('.cerr'); eb.textContent = errText(err); eb.classList.toggle('on', errNow);
    if (errNow) { renderSummary(); return; }
    c.lo = lo; c.hi = hi;
    if ((lo != null || hi != null) && c.w === 'kapali') { c.w = 'orta'; row.querySelectorAll('.wseg button').forEach(b => { b.classList.toggle('on', b.dataset.w === 'orta'); }); row.classList.remove('off'); }
    S.preset = null; renderPresets(); debounceRecompute();
  });
  function changed(k) { S.preset = null; renderPresets(); const row = $(`.crit[data-k="${k}"]`); row.outerHTML = critRow(PK[k]); recompute(); }
}
let _rt = 0; function debounceRecompute() { clearTimeout(_rt); _rt = setTimeout(recompute, 180); }
function recompute() { computeAll(); if (S.step === 'target') renderSummary(); else render(); }
function renderTarget() { renderPresets(); renderCritList(); renderSummary(); }
function renderSummary() {
  const act = activeParams();
  $('#sumSub').textContent = S.preset ? `${tx('Senaryo', 'Scenario')}: ${PRESETS[S.preset].label}` : act.length ? tx('Özel koşullar', 'Custom conditions') : tx('Henüz koşul yok', 'No conditions yet');
  $('#sumCells').textContent = act.length ? S.eligible.toLocaleString(LOC()) : '—';
  $('#sumRegions').textContent = act.length ? S.regions.length.toLocaleString(LOC()) : '—';
  $('#sumCrit').innerHTML = act.length ? act.map(p => { const c = S.crit[p.k]; return `<div class="row"><span class="k">${p.lab}${c.req ? ` · <b>${tx('zorunlu', 'required')}</b>` : ''}</span><span class="v">${esc(critText(p))} · ${WLAB.find(x => x[0] === c.w)[1].toLowerCase()}</span></div>`; }).join('') : `<div class="empty">${tx('Soldan hazır bir senaryo seçin veya en az bir parametreye hedef aralık girin.', 'Choose a preset scenario on the left or enter a target range for at least one parameter.')}</div>`;
  const warns = [];
  if (Object.keys(S.errors).length) warns.push(['err', tx('Hatalı değer var; düzeltilene kadar sonuçlar son geçerli değerlerle hesaplanır.', 'There is an invalid value; until it is corrected, results are calculated with the last valid values.')]);
  if (act.length && S.eligible === 0) warns.push(['warn', tx('Hiçbir hücre tüm zorunlu koşulları karşılamıyor. Bir zorunlu işaretini kaldırın veya aralığı genişletin.', 'No cell meets all required conditions. Untick a "required" box or widen a range.')]);
  if (act.length && !act.some(p => W[S.crit[p.k].w] > 0)) warns.push(['warn', tx('Tüm koşulların önemi "Kapalı"; yalnızca zorunlu filtreler uygulanıyor.', 'All conditions have importance "Off"; only the required filters are applied.')]);
  $('#sumWarn').innerHTML = warns.map(([c, t]) => `<div class="alert ${c}">${ico('alert')}<span>${t}</span></div>`).join('');
  const b = S.regions[0];
  $('#sumBest').innerHTML = act.length && b ? `${tx('En uygun bölge', 'Best region')}: <b>${esc(b.name)}</b> (${esc(b.countries.join(', '))}) · ${tx('ortalama puan', 'mean score')} <span class="num">${fmt(b.mean * 100, 0)}</span>/100` : '';
}

/* ================= 2 · RESULTS ================= */
function renderResults() {
  const R = S.regions, act = activeParams();
  const full = R[0] && R[0].thr >= 0.999, thrTxt = fmt((R[0] ? R[0].thr : 0.7) * 100, 0);
  $('#resIntro').innerHTML = tx(`${S.eligible.toLocaleString(LOC())} hücre zorunlu koşulları karşılıyor. ${full ? 'Tam puan (100) alan' : `Puanı ${thrTxt} ve üzeri olan`} komşu hücreler <b>${R.length} bölge</b> halinde gruplandı. Puan, ${act.length} koşulun önem ağırlıklı ortalamasıdır (0–100).`,
    `${S.eligible.toLocaleString(LOC())} cells meet the required conditions. Neighbouring cells ${full ? 'with a full score (100)' : `scoring ${thrTxt} or more`} were grouped into <b>${R.length} region${R.length === 1 ? '' : 's'}</b>. The score is the importance-weighted mean of ${act.length} condition${act.length === 1 ? '' : 's'} (0–100).`);
  $$('#listTabs .tab').forEach(b => b.classList.toggle('on', b.dataset.t === S.listTab));
  if (S.listTab === 'regions') {
    $('#regList').innerHTML = R.length ? R.slice(0, 10).map((r, n) => regCard(r, n)).join('') + (R.length > 10 ? `<p class="small muted" style="margin-top:10px">${tx(`İlk 10 bölge gösteriliyor (toplam ${R.length}). Haritadan diğerlerine tıklayabilirsiniz.`, `Showing the first 10 regions (of ${R.length}). Click the map to see the others.`)}</p>` : '') : `<div class="empty">${tx('Koşullara uyan bölge bulunamadı. Zorunlu koşulları gevşetmeyi deneyin.', 'No region matches the conditions. Try relaxing the required conditions.')}</div>`;
  } else {
    const rows = G.meta.sites.map(s => ({s, v: s.cell != null ? S.score[s.cell] : NaN})).sort((a, b) => (Number.isNaN(b.v) ? -1 : b.v) - (Number.isNaN(a.v) ? -1 : a.v));
    $('#regList').innerHTML = rows.map(({s, v}) => `<button class="reg ${S.sel && S.sel.kind === 'site' && S.sel.site.id === s.id ? 'sel' : ''}" data-site="${s.id}"><div class="top"><div><div class="nm">${esc(s.name)}</div><div class="loc">${esc(s.country)} · ${s.tags.map(t => G.meta.site_tags[t]).join(', ')}</div></div><div class="sc">${Number.isNaN(v) ? `<span style="font-size:13px" class="muted">${tx('elendi', 'excluded')}</span>` : fmt(v * 100, 0)}<small>${Number.isNaN(v) ? whyOut(s.cell) : tx('puan', 'score')}</small></div></div></button>`).join('') + `<p class="small muted" style="margin-top:10px">${esc(G.meta.site_note)}</p>`;
  }
  renderDetail();
  M.draw();
}
function whyOut(i) {
  if (i == null) return tx('ızgara dışı', 'outside the grid');
  if (S.noice && G.F.icemask[i] >= 0.5) return tx('buz hücresi', 'ice cell');
  const r = cellScore(i, baseGet, S.crit, false); if (r.missing) return tx('veri yok', 'no data');
  const f = activeParams().find(p => S.crit[p.k].req && r.parts[p.k] < 0.999);
  return f ? `${tx('zorunlu', 'required')}: ${f.lab.toLowerCase()}` : '';
}
function fitChips(i, get = baseGet) {
  const r = cellScore(i, get, S.crit, false), act = activeParams();
  const okN = act.filter(p => r.parts[p.k] >= 0.999).length;
  const rest = act.filter(p => r.parts[p.k] < 0.999).map(p => `<span class="${fitClass(r.parts[p.k])}" title="${esc(p.lab)}: ${esc(valText(p, i, get))}">${fitClass(r.parts[p.k]) === 'near' ? '~' : '✗'} ${esc(p.lab.replace('Yıllık ', '').replace('Annual ', '').replace(' (P/PET)', '').replace(' oranı', '').replace(' fraction', '').toLowerCase())}</span>`).join('');
  return `<span class="ok">✓ ${okN}/${act.length} ${tx('koşul', act.length === 1 ? 'condition' : 'conditions')}</span>${rest}`;
}
function regCard(r, n) {
  const on = S.sel && S.sel.kind === 'region' && S.sel.best === r.best;
  return `<button class="reg ${on ? 'sel' : ''}" data-reg="${n}" aria-pressed="${on}"><div class="top"><span class="rank">${n + 1}</span><div><div class="nm">${esc(r.name)}</div><div class="loc">${esc(r.countries.join(', '))} · ≈ ${Math.round(r.area / 1000).toLocaleString(LOC())} ${tx('bin km²', 'thousand km²')}${r.parts > 1 ? ` (${r.parts} ${tx('parça', 'parts')})` : ''}${r.sites.length ? ` · <b>${esc(r.sites.map(s => s.name).join(', '))}</b>` : ''}</div></div><div class="sc">${fmt(r.mean * 100, 0)}<small>${tx('ort. puan', 'mean score')}</small></div></div><div class="fit">${fitChips(r.best)}${testBadge(r)}</div></button>`;
}
function renderDetail() {
  const sel = S.sel; const card = $('#detailCard');
  if (!sel) { card.classList.add('hide'); return; } card.classList.remove('hide');
  const i = sel.best;
  $('#detTitle').textContent = sel.name;
  $('#detSub').innerHTML = `${esc(sel.countries.join(', '))} · ${sizeText(sel)} · ${tx('en uygun nokta', 'best point')} ${fmt(G.lat[i], 2)}°, ${fmt(G.lon[i], 2)}° · ${tx('bölge puanı', 'region score')} <b class="num">${ok(sel.mean) ? fmt(sel.mean * 100, 0) : tx('elendi', 'excluded')}</b>/100`;
  const rows = activeParams().map(p => { const s = partMean(p); return `<tr><td>${p.lab}${S.crit[p.k].req ? ` <span class="badge b-cat">${tx('zorunlu', 'required')}</span>` : ''}</td><td class="num">${esc(critText(p))}</td><td class="num">${esc(valTextMean(p))}</td><td class="${fitClass(s)}">${fitWord(s)}</td><td class="num">${fmt(s * 100, 0)}</td></tr>`; }).join('');
  $('#detTable').innerHTML = `<table><thead><tr>${tx(['Parametre', 'Hedefiniz', 'Bölge değeri', 'Uyum', 'Puan'], ['Parameter', 'Your target', 'Region value', 'Fit', 'Score']).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  const notes = [];
  if (sel.kind !== 'region' && Number.isNaN(S.score[i])) notes.push(`${tx('Bu hücre elendi', 'This cell was excluded')}: ${whyOut(i)}.`);
  notes.push(tx('Değerler 1970–2000 iklimine ve ~55 km hücre ortalamalarına dayanır; saha ölçeğindeki koşullar farklı olabilir.', 'Values are based on the 1970–2000 climate and ~55 km cell averages; site-scale conditions may differ.'));
  $('#detNote').innerHTML = notes.map(esc).join(' ');
  $('#detTests').innerHTML = testsHTML(sel);
}
function bindResults() {
  $('#listTabs').onclick = e => { const b = e.target.closest('.tab'); if (!b) return; S.listTab = b.dataset.t; renderResults(); };
  $('#regList').onclick = e => {
    const b = e.target.closest('.reg'); if (!b) return;
    if (b.dataset.reg != null) S.sel = selRegion(S.regions[+b.dataset.reg]);
    else { const s = G.meta.sites.find(x => x.id === b.dataset.site); if (s && s.cell != null) S.sel = selCell(s.cell, s); }
    renderResults(); if (S.zoom) M.fit();
  };
  $('#zoomBtn').onclick = () => { S.zoom = !S.zoom; zoomLabel(); M.fit(); };
  $('#sitesBtn').onclick = () => { S.showSites = !S.showSites; $('#sitesBtn').setAttribute('aria-pressed', S.showSites); M.draw(); };
}

/* ---------------- map (heat raster + vectors, rendered on demand) ---------------- */
const M = (() => {
  const cv = $('#map'), ctx = cv.getContext('2d'), wrap = $('#mapWrap'), tip = $('#tip');
  const land = topojson.feature(LAND, LAND.objects.land), borders = topojson.mesh(COUNTRIES, COUNTRIES.objects.countries, (a, b) => a !== b);
  const off = document.createElement('canvas'), octx = off.getContext('2d');
  let W_ = 0, H_ = 0, proj = null, lookup = null, built = '';
  const ramp = d3.interpolateRgbBasis(['#F3EBDD', '#E9C9A8', '#D69468', '#B96D4B', '#7E3F27']);
  const RAMP = Array.from({length: 101}, (_, i) => { const c = d3.rgb(ramp(i / 100)); return [c.r, c.g, c.b]; });
  function setup() {
    const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return false;
    const key = `${w}x${h}|${S.zoom ? S.sel && S.sel.best : 'w'}`;
    if (key === built) return true;
    W_ = w; H_ = h; const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.zoom && S.sel) {
      let x0 = 180, x1 = -180, y0 = 90, y1 = -90; for (const i of S.sel.cells) { x0 = Math.min(x0, G.lon[i]); x1 = Math.max(x1, G.lon[i]); y0 = Math.min(y0, G.lat[i]); y1 = Math.max(y1, G.lat[i]); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, span = Math.max(14, x1 - x0 + 6, (y1 - y0 + 6) * 1.6);
      proj = d3.geoEquirectangular().rotate([-cx, 0]).fitExtent([[10, 10], [w - 10, h - 10]], {type: 'Feature', geometry: {type: 'Polygon', coordinates: [[[cx - span / 2, cy - span / 3.2], [cx + span / 2, cy - span / 3.2], [cx + span / 2, cy + span / 3.2], [cx - span / 2, cy + span / 3.2], [cx - span / 2, cy - span / 3.2]]]}});
    } else proj = d3.geoNaturalEarth1().fitExtent([[8, 50], [w - 8, h - 8]], {type: 'Sphere'});
    off.width = w; off.height = h; lookup = new Int32Array(w * h).fill(-2);
    const NC = G.meta.ncols;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ll = proj.invert([x + 0.5, y + 0.5]); if (!ll || !ok(ll[0]) || !ok(ll[1])) continue;
      if (!S.zoom) { const p2 = proj(ll); if (!p2 || Math.abs(p2[0] - x - 0.5) > 1 || Math.abs(p2[1] - y - 0.5) > 1) continue; }
      let lon = ((ll[0] + 180) % 360 + 360) % 360 - 180; const r = Math.floor((90 - ll[1]) / 0.5), k = Math.floor((lon + 180) / 0.5);
      if (r < 0 || r >= G.meta.nrows) continue;
      lookup[y * w + x] = G.pos[r * NC + Math.min(NC - 1, Math.max(0, k))];   // -1 ocean
    }
    built = key; return true;
  }
  function draw() {
    if (!G || S.step !== 'results' || !setup()) return;
    const w = W_, h = H_, img = octx.createImageData(w, h), d = img.data, sc = S.score;
    const selSet = S.sel ? new Uint8Array(G.n) : null; if (selSet) S.sel.cells.forEach(i => selSet[i] = 1);
    for (let p = 0; p < w * h; p++) {
      const i = lookup[p]; if (i === -2) continue; const o = p * 4;
      if (i === -1) { d[o] = 227; d[o + 1] = 236; d[o + 2] = 239; d[o + 3] = 255; continue; }
      const v = sc[i];
      if (Number.isNaN(v)) { d[o] = 220; d[o + 1] = 214; d[o + 2] = 203; }
      else { const c = RAMP[Math.round(v * 100)]; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; }
      d[o + 3] = 255;
      if (selSet && selSet[i]) {   // outline: neighbour pixel not in selection
        const x = p % w, y = (p / w) | 0;
        const nb = [x > 0 ? lookup[p - 1] : -3, x < w - 1 ? lookup[p + 1] : -3, y > 0 ? lookup[p - w] : -3, y < h - 1 ? lookup[p + w] : -3];
        if (nb.some(j => j < 0 || !selSet[j])) { d[o] = 48; d[o + 1] = 53; d[o + 2] = 47; }
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, w, h); ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, w, h);
    const path = d3.geoPath(proj, ctx);
    ctx.beginPath(); path(borders); ctx.strokeStyle = 'rgba(110,95,75,.35)'; ctx.lineWidth = .5; ctx.stroke();
    ctx.beginPath(); path(land); ctx.strokeStyle = 'rgba(110,95,75,.55)'; ctx.lineWidth = .6; ctx.stroke();
    if (!S.zoom) { ctx.beginPath(); path({type: 'Sphere'}); ctx.strokeStyle = '#CDBFAA'; ctx.lineWidth = 1; ctx.stroke(); }
    pts = [];
    if (S.showSites) for (const s of G.meta.sites) {
      const p = proj([s.lon, s.lat]); if (!p || p[0] < 0 || p[1] < 0 || p[0] > w || p[1] > h) continue;
      const isSel = S.sel && S.sel.sites.some(x => x.id === s.id);
      ctx.beginPath(); ctx.arc(p[0], p[1], isSel ? 5.5 : 4, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#30352F'; ctx.stroke();
      pts.push({x: p[0], y: p[1], site: s});
      if (isSel || S.zoom) label(s.name, p[0], p[1]);
    }
    S.regions.slice(0, 5).forEach((r, n) => { const p = proj([G.lon[r.best], G.lat[r.best]]); if (p) badge(n + 1, p[0], p[1], S.sel && S.sel.best === r.best); });
  }
  let pts = [];
  function badge(n, x, y, on) { ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fillStyle = on ? '#A45D3D' : '#FFFCF7'; ctx.fill(); ctx.strokeStyle = '#A45D3D'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.fillStyle = on ? '#fff' : '#9A5536'; ctx.font = '700 11px Inter,Segoe UI,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, x, y + .5); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'; }
  function label(t, x, y) { ctx.font = '600 12px Inter,Segoe UI,sans-serif'; const tw = ctx.measureText(t).width; let lx = x + 9, ly = y - 7; if (lx + tw + 8 > W_) lx = x - tw - 15; ctx.fillStyle = 'rgba(255,252,247,.95)'; ctx.fillRect(lx - 4, ly - 12, tw + 8, 17); ctx.fillStyle = '#30352F'; ctx.fillText(t, lx, ly); }
  function at(e) { const b = cv.getBoundingClientRect(), x = Math.floor(e.clientX - b.left), y = Math.floor(e.clientY - b.top); if (!lookup || x < 0 || y < 0 || x >= W_ || y >= H_) return {i: -2, x, y}; const site = pts.find(p => Math.hypot(p.x - x, p.y - y) < 7); return {i: lookup[y * W_ + x], x, y, site: site && site.site}; }
  cv.addEventListener('mousemove', e => {
    const {i, x, y, site} = at(e); if (i < 0 && !site) { tip.style.display = 'none'; cv.style.cursor = 'default'; return; }
    cv.style.cursor = 'pointer'; const j = site ? site.cell : i; const v = S.score[j];
    tip.innerHTML = `${site ? `<b>${esc(site.name)}</b><br>` : ''}<b>${esc(G.meta.regions[G.ridx[j]] || (G.cidx[j] >= 0 ? G.meta.countries[G.cidx[j]] : ''))}</b> <span class="muted small">${fmt(G.lat[j], 1)}°, ${fmt(G.lon[j], 1)}°</span><div class="num" style="margin-top:3px">${tx('Puan', 'Score')} ${Number.isNaN(v) ? tx('elendi', 'excluded') + ' (' + esc(whyOut(j)) + ')' : fmt(v * 100, 0)}</div><div class="small muted">${fmt(G.F.T[j], 1)} °C · ${fmt(G.F.P[j], 0)} mm · ${tx(`çıplak %${fmt(G.F.bare[j], 0)}`, `bare ${fmt(G.F.bare[j], 0)}%`)} · ${esc(G.meta.lith[Math.round(G.F.lith[j]) || 0])}</div>`;
    tip.style.display = 'block'; tip.style.left = Math.max(6, Math.min(x + 14, W_ - 240)) + 'px'; tip.style.top = Math.min(y + 14, H_ - 110) + 'px';
  });
  cv.addEventListener('mouseleave', () => tip.style.display = 'none');
  cv.addEventListener('click', e => { const {i, site} = at(e); if (site && site.cell != null) S.sel = selCell(site.cell, site); else if (i >= 0) S.sel = selCell(i); else return; renderResults(); if (S.zoom) fit(); });
  function fit() { built = ''; draw(); }
  if (window.ResizeObserver) new ResizeObserver(() => { built = ''; draw(); }).observe(wrap);
  function pixelOf(i) { setup(); const p = proj([G.lon[i], G.lat[i]]); return p ? [p[0], p[1]] : null; }
  return {draw, fit, pixelOf};
})();

/* ================= 3 · CLIMATE (ayrıntılı bölge iklim analizi) ================= */
const CL = {per: '2061-2080'};
const PLAB = {'2021-2040': '2021–2040', '2041-2060': '2041–2060', '2061-2080': '2061–2080'};
const XT = ['1970–2000', '2021–40', '2041–60', '2061–80'], XS = [0, 1, 2, 3];
const SCOL = {ssp245: '#5B84B1', ssp585: '#B96D4B'};
const EA = 60000, RGAS = 8.314;                       // silikat ayrışması görünür aktivasyon enerjisi (J/mol)
const erosR = P => P <= 850 ? 0.0483 * Math.pow(P, 1.61) : 587.8 - 1.219 * P + 0.004105 * P * P;   // Renard & Freimund 1994
const clamp01 = x => Math.max(0, Math.min(1, x));
/* region mean of a key at baseline (per=null) or future */
function rv(key, ssp = null, per = null) {
  if (!per) return selMean(i => G.F[key][i]);
  const f = G.F[`${ssp}_${per}:${key}`] || G.F[key]; return selMean(i => f[i]);
}
function rvPET(ssp = null, per = null) {   // PET = P / AI (hücre bazında), AI 10'da kesildiği için o hücreler atlanır
  const fp = per ? G.F[`${ssp}_${per}:P`] : G.F.P, fa = per ? G.F[`${ssp}_${per}:AI`] : G.F.AI;
  return selMean(i => (fa[i] > 0 && fa[i] < 9.99) ? fp[i] / fa[i] : NaN);
}
function rminmax(key, ssp = null, per = null) {
  const f = per ? G.F[`${ssp}_${per}:${key}`] : G.F[key]; let lo = Infinity, hi = -Infinity;
  for (const i of S.sel.cells) { const v = f[i]; if (ok(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  return [lo, hi];
}
const _glob = {};
function globalDT(ssp, per) {          // alan ağırlıklı küresel kara ortalaması ΔT (CMIP6 verisi olan hücreler)
  const k = ssp + per; if (_glob[k] != null) return _glob[k];
  const f = G.F[`${ssp}_${per}:T`]; let s = 0, w = 0;
  for (let i = 0; i < G.n; i++) { const v = f[i]; if (ok(v)) { s += (v - G.F.T[i]) * G.area[i]; w += G.area[i]; } }
  return (_glob[k] = s / w);
}
const unepClass = ai => !ok(ai) ? '—' : ai < 0.05 ? tx('hiper-kurak', 'hyper-arid') : ai < 0.2 ? tx('kurak', 'arid') : ai < 0.5 ? tx('yarı-kurak', 'semi-arid') : ai < 0.65 ? tx('kuru yarı-nemli', 'dry sub-humid') : tx('nemli', 'humid');
function soilRegime(T, AI, pi) {
  if (pi >= 0.5) return {k: 'kriyo', lab: tx('Kriyojenik (permafrost etkili)', 'Cryogenic (permafrost-affected)'), col: '#5B84B1', txt: tx('Donma-çözülme ve kriyoturbasyon baskın; desenli zemin, buz kamaları ve poligonlar oluşur. Kimyasal ayrışma çok yavaş, toprak profili zayıf gelişir.', 'Freeze–thaw and cryoturbation dominate; patterned ground, ice wedges and polygons form. Chemical weathering is very slow and the soil profile develops poorly.')};
  if (AI < 0.05) return {k: 'hiper', lab: tx('Hiper-kurak · tuz ve jips birikimi', 'Hyper-arid · salt and gypsum accumulation'), col: '#9A5536', txt: tx('Kimyasal ayrışma neredeyse durmuş. Yüzeyde nitrat, sülfat, klorür tuzları ve jips birikir; organik madde yok denecek kadar azdır. Mars regolitine en yakın toprak rejimi.', 'Chemical weathering has almost stopped. Nitrate, sulphate and chloride salts and gypsum accumulate at the surface; organic matter is almost absent. The soil regime closest to Martian regolith.')};
  if (AI < 0.2) return {k: 'kurak', lab: tx('Kurak · kalsit/jips, çöl kaplaması', 'Arid · calcite/gypsum, desert pavement'), col: '#B96D4B', txt: tx('Zayıf toprak gelişimi; kalsit ve jips horizonları, çöl kaplaması (desert pavement) ve kaya verniği. Yağış olayları seyrek ama etkili.', 'Weak soil development; calcite and gypsum horizons, desert pavement and rock varnish. Rain events are rare but effective.')};
  if (AI < 0.5) return {k: 'yari', lab: tx('Yarı-kurak · kalsik horizonlar', 'Semi-arid · calcic horizons'), col: '#A88A3D', txt: tx('Mevsimlik ıslanma ile karbonat birikimi; seyrek bitki örtüsü toprak gelişimini başlatır, analog değeri azalmaya başlar.', 'Carbonate accumulation through seasonal wetting; sparse vegetation starts soil development and the analog value begins to decline.')};
  if (AI < 0.65) return {k: 'kyn', lab: tx('Kuru yarı-nemli', 'Dry sub-humid'), col: '#76866C', txt: tx('Bitki örtüsü ve organik madde belirginleşir; yıkanma başlar. Gezegen analoğu olarak sınırlı.', 'Vegetation and organic matter become prominent; leaching begins. Of limited use as a planetary analog.')};
  return {k: 'nemli', lab: tx('Nemli · yıkanma ve kil oluşumu', 'Humid · leaching and clay formation'), col: '#56664D', txt: tx('Yoğun kimyasal ayrışma, kil mineralleri, organik toprak; kuru gezegen analoğu olarak uygun değil (sulu ayrışma analoğu olabilir).', 'Intense chemical weathering, clay minerals, organic soils; not suitable as a dry planetary analog (may serve as an aqueous-alteration analog).')};
}
const pct = (a, b) => ok(a) && ok(b) && b !== 0 ? (a / b - 1) * 100 : NaN;
const arrow = v => !ok(v) || Math.abs(v) < 0.5 ? '■' : v > 0 ? '▲' : '▼';
const dcls = v => !ok(v) || Math.abs(v) < 0.5 ? 'flat' : v > 0 ? 'up' : 'down';

function climData(s) {
  const pers = PERIODS;
  const T = [rv('T'), ...pers.map(p => rv('T', s, p))], P = [rv('P'), ...pers.map(p => rv('P', s, p))];
  const AI = [rv('AI'), ...pers.map(p => rv('AI', s, p))], FT = [rv('FT'), ...pers.map(p => rv('FT', s, p))], DTR = [rv('DTR'), ...pers.map(p => rv('DTR', s, p))];
  const PET = [rvPET(), ...pers.map(p => rvPET(s, p))];
  const Tlo = [T[0], ...pers.map(p => rv('Tlo', s, p))], Thi = [T[0], ...pers.map(p => rv('Thi', s, p))];
  const Plo = [P[0], ...pers.map(p => rv('Plo', s, p))], Phi = [P[0], ...pers.map(p => rv('Phi', s, p))];
  const PI = [selMean(i => permaIndex(G.F.T[i])), ...pers.map(p => selMean(i => { const v = G.F[`${s}_${p}:T`][i]; return ok(v) ? permaIndex(v) : NaN; }))];
  const SC = [selScoreRaw(baseGet), ...pers.map(p => selScoreRaw(futGet(s, p)))];
  return {T, P, AI, FT, DTR, PET, Tlo, Thi, Plo, Phi, PI, SC};
}
/* süreç göstergeleri: referansa göre oran (1 = değişim yok) */
function processes(d, j) {
  const T0 = d.T[0] + 273.15, T1 = d.T[j] + 273.15;
  const arr = Math.exp(EA / RGAS * (1 / T0 - 1 / T1));
  const pr = d.P[j] / d.P[0];
  const W = rv('W'), bare = rv('bare') / 100, elev = rv('elev'), ice = rv('ice');
  const wWater = clamp01(d.AI[0] / 0.5), wFrost = clamp01(d.FT[0] / 100), wWind = bare * clamp01(1 - d.AI[0] / 0.5);
  const rChem = arr * pr, rWater = erosR(d.P[j]) / erosR(d.P[0]), rFrost = d.FT[0] >= 1 ? d.FT[j] / d.FT[0] : NaN, rWind = d.AI[j] > 0 ? d.AI[0] / d.AI[j] : NaN;
  const wsum = wWater + (ok(rFrost) ? wFrost : 0) + (ok(rWind) ? wWind : 0);
  const rDeg = wsum > 0 ? (wWater * rWater + (ok(rFrost) ? wFrost * rFrost : 0) + (ok(rWind) ? wWind * rWind : 0)) / wsum : NaN;
  return {arr, pr, rChem, rWater, rFrost, rWind, rDeg, wWater, wFrost, wWind, W, bare, elev, ice};
}

function renderClimate() {
  const sel = S.sel, s = S.ssp, j = PERIODS.indexOf(CL.per) + 1;
  const d = climData(s), o = climData(s === 'ssp245' ? 'ssp585' : 'ssp245');
  $('#h-climate').textContent = `${tx('Gelecekteki iklim', 'Future climate')}: ${sel.name}`;
  $('#climSub').innerHTML = `${esc(sel.countries.join(', '))} · ${sizeText(sel)}. ${tx('Bu ekranda yalnızca seçtiğiniz bölgenin iklimi ve bu iklimin yüzey süreçlerine etkisi analiz edilir.', 'This screen analyses only the climate of the region you selected and its effect on surface processes.')}`;
  $$('#sspSel button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
  $$('#perSel button').forEach(b => b.classList.toggle('on', b.dataset.p === CL.per));
  $('#modelBadge').textContent = `${G.meta.models.length} ${tx('model', 'models')}: ${G.meta.models.join(', ')}`;
  const nMiss = sel.cells.filter(i => !ok(G.F[`${s}_2061-2080:T`][i])).length;
  $('#clMiss').innerHTML = nMiss ? `<div class="alert warn small" style="margin:12px 0 0">${ico('alert')}<span>${nMiss === sel.cells.length ? tx('Bu bölge için WorldClim CMIP6 gelecek verisi yok (ör. Antarktika). Yalnızca referans dönemi gösterilebilir.', 'There are no WorldClim CMIP6 future data for this region (e.g. Antarctica). Only the reference period can be shown.') : tx(`Bölgenin ${nMiss}/${sel.cells.length} hücresinde gelecek verisi yok; gelecek ortalamaları diğer hücrelerden hesaplandı.`, `${nMiss}/${sel.cells.length} cells of the region have no future data; future means were calculated from the other cells.`)}</span></div>` : '';
  renderProfile();
  renderSummaryCl(d, o, j, s);
  renderVars(d, o, j, s);
  renderProcesses(d, o, j, s);
  renderSoil(d, j, s);
  renderFit(s);
  renderMethodCl(d, j, s);
}

/* ---- bölge profili + konum haritası ---- */
function renderProfile() {
  const sel = S.sel, cells = sel.cells;
  const [elo, ehi] = rminmax('elev');
  const lc = new Map(); cells.forEach(i => { const L = Math.round(G.F.lith[i]) || 0; lc.set(L, (lc.get(L) || 0) + 1); });
  const lith = [...lc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([L, n]) => tx(`${G.meta.lith[L]} %${Math.round(n / cells.length * 100)}`, `${G.meta.lith[L]} ${Math.round(n / cells.length * 100)}%`)).join(', ');
  let la0 = 90, la1 = -90, lo0 = 180, lo1 = -180; cells.forEach(i => { la0 = Math.min(la0, G.lat[i]); la1 = Math.max(la1, G.lat[i]); lo0 = Math.min(lo0, G.lon[i]); lo1 = Math.max(lo1, G.lon[i]); });
  const items = tx([
    ['Konum', `${fmt(la0, 1)}° – ${fmt(la1, 1)}° enlem, ${fmt(lo0, 1)}° – ${fmt(lo1, 1)}° boylam`],
    ['Rakım', `ort. ${fmt(rv('elev'), 0)} m (${fmt(elo, 0)} – ${fmt(ehi, 0)} m)`],
    ['Bölgesel rölyef', `${fmt(rv('relief'), 0)} m (hücre içi yükseklik farkı)`],
    ['Çıplak yüzey', `%${fmt(rv('bare'), 0)} (MODIS 2023)`],
    ['Kalıcı kar/buz', `%${fmt(rv('ice'), 0)}`],
    ['Baskın kaya türü', lith],
    ['Rüzgâr (2 m)', `${fmt(rv('W'), 1)} m/s (gelecek projeksiyonu yok)`],
    ['Büyüklük', sel.kind === 'region' ? `${cells.length} hücre · ≈ ${Math.round(sel.area / 1000).toLocaleString(LOC())} bin km²` : 'tek hücre (~55 km)'],
    ['Bilinen analog sahası', sel.sites.length ? sel.sites.map(x => `${esc(x.name)} <span class="muted">(${esc(x.ref)})</span>`).join('<br>') : 'yok']
  ], [
    ['Location', `latitude ${fmt(la0, 1)}° – ${fmt(la1, 1)}°, longitude ${fmt(lo0, 1)}° – ${fmt(lo1, 1)}°`],
    ['Elevation', `mean ${fmt(rv('elev'), 0)} m (${fmt(elo, 0)} – ${fmt(ehi, 0)} m)`],
    ['Regional relief', `${fmt(rv('relief'), 0)} m (elevation range within cells)`],
    ['Bare surface', `${fmt(rv('bare'), 0)}% (MODIS 2023)`],
    ['Permanent snow/ice', `${fmt(rv('ice'), 0)}%`],
    ['Dominant rock type', lith],
    ['Wind (2 m)', `${fmt(rv('W'), 1)} m/s (no future projection)`],
    ['Size', sel.kind === 'region' ? `${cells.length} cells · ≈ ${Math.round(sel.area / 1000).toLocaleString(LOC())} thousand km²` : 'single cell (~55 km)'],
    ['Known analog site', sel.sites.length ? sel.sites.map(x => `${esc(x.name)} <span class="muted">(${esc(x.ref)})</span>`).join('<br>') : 'none']
  ]);
  $('#clProfile').innerHTML = items.map(([k, v]) => `<div class="cl-kv"><span>${k}</span><b>${v}</b></div>`).join('');
  $('#clTests').innerHTML = testsHTML(sel, true);
  drawLocator(la0, la1, lo0, lo1);
}
function drawLocator(la0, la1, lo0, lo1) {
  const cv = $('#clMap'), w = cv.parentElement.clientWidth || 360, h = 240, dpr = window.devicePixelRatio || 1;
  cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = (lo0 + lo1) / 2, cy = (la0 + la1) / 2, span = Math.max(12, (lo1 - lo0) * 1.8, (la1 - la0) * 2.6);
  const proj = d3.geoEquirectangular().rotate([-cx, 0]).fitExtent([[6, 6], [w - 6, h - 6]], {type: 'Feature', geometry: {type: 'Polygon', coordinates: [[[cx - span / 2, cy - span / 3], [cx + span / 2, cy - span / 3], [cx + span / 2, cy + span / 3], [cx - span / 2, cy + span / 3], [cx - span / 2, cy - span / 3]]]}});
  const path = d3.geoPath(proj, c), land = topojson.feature(LAND, LAND.objects.land), borders = topojson.mesh(COUNTRIES, COUNTRIES.objects.countries, (a, b) => a !== b);
  c.fillStyle = '#E3ECEF'; c.fillRect(0, 0, w, h);
  c.beginPath(); path(land); c.fillStyle = '#EFE7DA'; c.fill(); c.strokeStyle = '#CDBFAA'; c.lineWidth = .7; c.stroke();
  c.beginPath(); path(borders); c.strokeStyle = 'rgba(150,132,110,.45)'; c.lineWidth = .5; c.stroke();
  c.fillStyle = 'rgba(185,109,75,.75)';
  for (const i of S.sel.cells) { const a = proj([G.lon[i] - 0.25, G.lat[i] + 0.25]), b = proj([G.lon[i] + 0.25, G.lat[i] - 0.25]); if (a && b) c.fillRect(a[0], a[1], Math.max(1.2, b[0] - a[0]), Math.max(1.2, b[1] - a[1])); }
  for (const st of S.sel.sites) { const p = proj([st.lon, st.lat]); if (!p) continue; c.beginPath(); c.arc(p[0], p[1], 4.5, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#30352F'; c.stroke(); }
  c.fillStyle = '#686C63'; c.font = '11px Inter,Segoe UI,sans-serif'; c.fillText(tx('Seçili bölge (turuncu)', 'Selected region (orange)'), 8, h - 8);
}

/* ---- özet ---- */
function renderSummaryCl(d, o, j, s) {
  const dT = d.T[j] - d.T[0], gdt = globalDT(s, CL.per), dP = pct(d.P[j], d.P[0]), dPET = pct(d.PET[j], d.PET[0]);
  const reg0 = soilRegime(d.T[0], d.AI[0], d.PI[0]), reg1 = soilRegime(d.T[j], d.AI[j], d.PI[j]);
  const pr = processes(d, j), dsc = (d.SC[j] - d.SC[0]) * 100;
  const agreeP = d.Plo[j] > d.P[0] ? tx('üç model de artış gösteriyor', 'all three models show an increase') : d.Phi[j] < d.P[0] ? tx('üç model de azalış gösteriyor', 'all three models show a decrease') : tx('modeller yönde ayrışıyor', 'the models disagree on the direction');
  const big = [];
  const say = (r, up, down) => ok(r) && Math.abs(r - 1) >= 0.05 ? (r > 1 ? up : down) : null;
  [say(pr.rChem, d.AI[0] < 0.05 ? tx('kimyasal ayrışma göreli olarak hızlanıyor (ancak hiper-kurak koşulda mutlak hız çok düşük kalıyor)', 'chemical weathering speeds up in relative terms (but the absolute rate stays very low under hyper-arid conditions)') : tx('kimyasal ayrışma ve toprak oluşumu hızlanıyor', 'chemical weathering and soil formation speed up'), tx('kimyasal ayrışma yavaşlıyor', 'chemical weathering slows down')),
   say(pr.rFrost, tx('donma-çözülme ile kaya parçalanması artıyor', 'frost-driven rock breakdown increases'), tx('donma-çözülme ile kaya parçalanması azalıyor', 'frost-driven rock breakdown decreases')),
   say(pr.rWater, tx('yağışla su aşınması artıyor', 'water erosion by rainfall increases'), tx('yağışla su aşınması azalıyor', 'water erosion by rainfall decreases')),
   say(pr.rWind, tx('rüzgâr aşınması ve toz hareketi için koşullar güçleniyor', 'conditions for wind erosion and dust movement strengthen'), tx('rüzgâr aşınması için koşullar zayıflıyor', 'conditions for wind erosion weaken'))].forEach(x => x && big.push(x));
  $('#interp').innerHTML = LANG === 'en' ? `<p>Under ${SSP[s]}, in <b>${PLAB[CL.per]}</b> this region warms by <span class="v">${sgn(dT, 1)} °C</span> relative to the reference (1970–2000). That is <b>${fmt(dT / gdt, 2)} times</b> the global land mean for the same period (${sgn(gdt, 1)} °C). Annual precipitation changes by <span class="v">${sgn(dP, 0)} %</span> (${agreeP}); because temperature rises, evaporative demand (PET) changes by <span class="v">${sgn(dPET, 0)} %</span> and the aridity index goes from ${fmt(d.AI[0], 3)} to <span class="v">${fmt(d.AI[j], 3)}</span> (${unepClass(d.AI[0])} → ${unepClass(d.AI[j])}).</p>
    <p>In terms of surface processes: ${big.length ? big.join('; ') : 'no marked change (beyond ±5%) in process rates is expected'}. The soil formation regime ${reg1.k !== reg0.k ? `changes from <b>${reg0.lab}</b> to <b>${reg1.lab}</b>` : `remains <b>${reg0.lab}</b>`}. The suitability score for your target conditions goes from <span class="v">${fmt(d.SC[0] * 100, 0)} → ${fmt(d.SC[j] * 100, 0)}</span> (${Math.abs(dsc) < 2 ? 'practically unchanged' : dsc < 0 ? 'decreasing' : 'increasing'}); ${fmt(o.SC[j] * 100, 0)} under the other scenario.</p>` : `<p>${SSP[s]} senaryosunda <b>${PLAB[CL.per]}</b> döneminde bu bölge, referansa (1970–2000) göre <span class="v">${sgn(dT, 1)} °C</span> ısınıyor. Bu, aynı dönemde küresel kara ortalamasının (${sgn(gdt, 1)} °C) <b>${fmt(dT / gdt, 2)} katı</b>. Yıllık yağış <span class="v">${sgn(dP, 0)} %</span> değişiyor (${agreeP}); sıcaklık arttığı için buharlaşma talebi (PET) <span class="v">${sgn(dPET, 0)} %</span> artıyor ve kuraklık indeksi ${fmt(d.AI[0], 3)} → <span class="v">${fmt(d.AI[j], 3)}</span> oluyor (${unepClass(d.AI[0])} → ${unepClass(d.AI[j])}).</p>
    <p>Yüzey süreçleri açısından: ${big.length ? big.join('; ') : 'süreç hızlarında belirgin (±%5 üzeri) bir değişim beklenmiyor'}. Toprak oluşum rejimi <b>${reg0.lab}</b>${reg1.k !== reg0.k ? ` → <b>${reg1.lab}</b>` : ' olarak kalıyor'}. Hedef koşullarınıza uygunluk puanı <span class="v">${fmt(d.SC[0] * 100, 0)} → ${fmt(d.SC[j] * 100, 0)}</span> (${Math.abs(dsc) < 2 ? 'pratikte değişmiyor' : dsc < 0 ? 'azalıyor' : 'artıyor'}); diğer senaryoda ${fmt(o.SC[j] * 100, 0)}.</p>`;
}

/* ---- iklim değişkenleri: grafik + açıklama ---- */
function lineChart(id, key, d, o, s, unit, dec, title, opt = {}) {
  const tr = [];
  for (const [ss, dd] of [[s, d], [s === 'ssp245' ? 'ssp585' : 'ssp245', o]]) {
    const on = ss === s, col = SCOL[ss];
    if (opt.lo && opt.hi) tr.push({x: [1, 2, 3, 3, 2, 1], y: [...dd[opt.hi].slice(1), ...dd[opt.lo].slice(1).reverse()], fill: 'toself', fillcolor: hexA(col, on ? .18 : .07), line: {width: 0}, mode: 'none', hoverinfo: 'skip', showlegend: false, type: 'scatter'});
    tr.push({x: XS, y: dd[key], name: SSP[ss], mode: 'lines+markers' + (on ? '+text' : ''), text: on ? dd[key].map((v, k) => k ? fmt(v, dec) : '') : undefined, textposition: 'top center', textfont: {size: 11, color: col},
      line: {color: col, width: on ? 3 : 1.5, dash: on ? 'solid' : 'dot'}, marker: {size: on ? 8 : 5}, type: 'scatter', hovertemplate: `%{y:.${dec}f} ${unit}<extra>${SSP[ss]}</extra>`});
  }
  const shapes = (opt.bands || []).map(b => ({type: 'rect', xref: 'paper', x0: 0, x1: 1, y0: b[0], y1: b[1], fillcolor: b[2], line: {width: 0}, layer: 'below'}));
  const ymax = opt.yaxis && opt.yaxis.range ? opt.yaxis.range[1] : Infinity, ymin = opt.yaxis && opt.yaxis.range ? opt.yaxis.range[0] : -Infinity;
  const ann = (opt.bands || []).filter(b => b[3] && b[0] < ymax && b[1] > ymin).map(b => ({xref: 'paper', x: 1, xanchor: 'right', y: (Math.max(b[0], ymin) + Math.min(b[1], ymax)) / 2, text: b[3], showarrow: false, font: {size: 10, color: '#686C63'}}));
  P(id, tr, LY(title, Object.assign({margin: {l: 50, r: 12, t: 36, b: 40}, hovermode: 'x unified', legend: {orientation: 'h', y: -0.22, font: {size: 11}},
    xaxis: Object.assign(AXF(), {tickvals: XS, ticktext: XT, range: [-0.25, 3.35]}), yaxis: Object.assign(AXF(), {title: {text: unit, font: {size: 11}}}, opt.yaxis || {}), shapes, annotations: ann}, opt.layout || {})));
}
function renderVars(d, o, j, s) {
  const [tlo, thi] = rminmax('T', s, CL.per), [t0lo, t0hi] = rminmax('T');
  const dT = d.T[j] - d.T[0], dP = pct(d.P[j], d.P[0]), dPET = pct(d.PET[j], d.PET[0]);
  const lnAI = Math.log(d.AI[j] / d.AI[0]), lnP = Math.log(d.P[j] / d.P[0]), lnPET = Math.log(d.PET[j] / d.PET[0]);
  const shareP = ok(lnAI) && Math.abs(lnAI) > 1e-6 ? lnP / lnAI * 100 : NaN;
  const tmax0 = d.T[0] + d.DTR[0] / 2, tmax1 = d.T[j] + d.DTR[j] / 2;
  const blocks = [
    {id: 'plV_T', title: tx('Yıllık ortalama sıcaklık', 'Annual mean temperature'), key: 'T', unit: '°C', dec: 1, opt: {lo: 'Tlo', hi: 'Thi', bands: d.T.some(v => v < 2) ? [[-60, -3, 'rgba(91,132,177,.07)', tx('permafrost olası', 'permafrost likely')], [-3, 1, 'rgba(91,132,177,.03)', tx('geçiş', 'transition')]] : []},
     txt: LANG === 'en' ? `Reference regional mean <b>${fmt(d.T[0], 1)} °C</b> (${fmt(t0lo, 1)} – ${fmt(t0hi, 1)} °C across cells). In ${PLAB[CL.per]}: <b>${fmt(d.T[j], 1)} °C</b> (${sgn(dT, 1)} °C); three-model range ${fmt(d.Tlo[j], 1)} – ${fmt(d.Thi[j], 1)} °C. The warmest cell of the region reaches ${fmt(thi, 1)} °C. <span class="why">Why: the warming is the change computed by the CMIP6 models for this grid point; local warming being ${dT / globalDT(s, CL.per) > 1 ? 'larger' : 'smaller'} than the global land mean (ratio ${fmt(dT / globalDT(s, CL.per), 2)}) is linked to ${Math.abs(selMean(i => G.lat[i])) > 55 ? 'the snow–ice feedback at high latitudes' : 'continentality and humidity conditions'}.</span>` : `Referansta bölge ortalaması <b>${fmt(d.T[0], 1)} °C</b> (hücreler arası ${fmt(t0lo, 1)} – ${fmt(t0hi, 1)} °C). ${PLAB[CL.per]} döneminde <b>${fmt(d.T[j], 1)} °C</b> (${sgn(dT, 1)} °C); üç model aralığı ${fmt(d.Tlo[j], 1)} – ${fmt(d.Thi[j], 1)} °C. Bölgenin en sıcak hücresi ${fmt(thi, 1)} °C'ye çıkıyor. <span class="why">Neden: ısınma CMIP6 modellerinin bu ızgara noktası için hesapladığı değişimdir; yerel ısınmanın küresel kara ortalamasından ${dT / globalDT(s, CL.per) > 1 ? 'büyük' : 'küçük'} olması (oran ${fmt(dT / globalDT(s, CL.per), 2)}) ${Math.abs(selMean(i => G.lat[i])) > 55 ? 'yüksek enlemlerde kar-buz geri beslemesiyle' : 'karasallık ve nem koşullarıyla'} ilişkilidir.</span>`},
    {id: 'plV_P', title: tx('Yıllık yağış', 'Annual precipitation'), key: 'P', unit: 'mm', dec: 0, opt: {lo: 'Plo', hi: 'Phi', yaxis: {rangemode: 'tozero'}},
     txt: LANG === 'en' ? `Reference <b>${fmt(d.P[0], 0)} mm</b>, ${PLAB[CL.per]}: <b>${fmt(d.P[j], 0)} mm</b> (${sgn(dP, 0)} %; model range ${fmt(d.Plo[j], 0)} – ${fmt(d.Phi[j], 0)} mm). <span class="why">${d.Plo[j] > d.P[0] ? 'All three models show an increase; the direction is robust.' : d.Phi[j] < d.P[0] ? 'All three models show a decrease; the direction is robust.' : 'The models disagree on the direction of precipitation change; this is the most uncertain projection.'} ${d.P[0] < 100 ? 'In very arid regions, percentage changes amount to only a few millimetres in absolute terms.' : ''}</span>` : `Referans <b>${fmt(d.P[0], 0)} mm</b>, ${PLAB[CL.per]}: <b>${fmt(d.P[j], 0)} mm</b> (${sgn(dP, 0)} %; model aralığı ${fmt(d.Plo[j], 0)} – ${fmt(d.Phi[j], 0)} mm). <span class="why">${d.Plo[j] > d.P[0] ? 'Üç modelin üçü de artış veriyor; yön güvenilir.' : d.Phi[j] < d.P[0] ? 'Üç modelin üçü de azalış veriyor; yön güvenilir.' : 'Modeller yağışın yönünde anlaşmıyor; bu değer en belirsiz projeksiyondur.'} ${d.P[0] < 100 ? 'Çok kurak bölgelerde yüzde değişimler mutlak olarak birkaç milimetreye karşılık gelir.' : ''}</span>`},
    {id: 'plV_AI', title: tx('Kuraklık indeksi P/PET (UNEP)', 'Aridity index P/PET (UNEP)'), key: 'AI', unit: 'P/PET', dec: 3, opt: {bands: [[0, 0.05, 'rgba(154,85,54,.10)', unepClass(0.01)], [0.05, 0.2, 'rgba(185,109,75,.07)', unepClass(0.1)], [0.2, 0.5, 'rgba(168,138,61,.06)', unepClass(0.3)], [0.5, 0.65, 'rgba(118,134,108,.06)', unepClass(0.6)]], yaxis: {range: [0, (() => { const m = Math.max(...d.AI, ...o.AI); return m < 0.5 ? Math.max(0.06, m * 1.6) : Math.max(0.7, m * 1.15); })()]}},
     txt: LANG === 'en' ? `Aridity index ${fmt(d.AI[0], 3)} → <b>${fmt(d.AI[j], 3)}</b> (${unepClass(d.AI[0])} → <b>${unepClass(d.AI[j])}</b>). <span class="why">Why: in the P/PET ratio, precipitation changes by ${sgn(dP, 0)} % and evaporative demand (PET) by ${sgn(dPET, 0)} % (Hargreaves PET rises with temperature). ${ok(shareP) ? (Math.abs(shareP) > 100 ? 'All of the change in the index, and more, comes from precipitation, while evaporative demand acts in the opposite direction.' : `About ${fmt(Math.abs(shareP), 0)}% of the change in the index comes from precipitation and the rest from evaporative demand.`) : ''} Scale: below 0.05 hyper-arid, 0.05–0.2 arid, 0.2–0.5 semi-arid.</span>` : `Kuraklık indeksi ${fmt(d.AI[0], 3)} → <b>${fmt(d.AI[j], 3)}</b> (${unepClass(d.AI[0])} → <b>${unepClass(d.AI[j])}</b>). <span class="why">Neden: P/PET oranında yağış ${sgn(dP, 0)} %, buharlaşma talebi PET ${sgn(dPET, 0)} % değişiyor (Hargreaves PET, sıcaklıkla birlikte artar). ${ok(shareP) ? `İndeksteki değişimin ${Math.abs(shareP) > 100 ? 'tamamı ve fazlası' : `yaklaşık %${fmt(Math.abs(shareP), 0)}'i`} yağıştan, ${Math.abs(shareP) > 100 ? 'buharlaşma ise ters yönde etkiliyor' : `kalanı buharlaşma talebinden`} kaynaklanıyor.` : ''} Ölçek: 0,05 altı hiper-kurak, 0,05–0,2 kurak, 0,2–0,5 yarı-kurak.</span>`},
    {id: 'plV_FT', title: tx('Donma-çözülme günü', 'Freeze–thaw days'), key: 'FT', unit: tx('gün/yıl', 'days/yr'), dec: 0, opt: {yaxis: {rangemode: 'tozero'}},
     txt: LANG === 'en' ? `Number of days with both freezing and thawing: ${fmt(d.FT[0], 0)} → <b>${fmt(d.FT[j], 0)}</b> days/yr. <span class="why">Why: this number depends on how often temperatures move around 0 °C. ${d.FT[0] < 1 ? 'The region is already too warm for frost; warming does not change this.' : d.T[0] < -5 && d.FT[j] > d.FT[0] ? 'In a very cold region, warming brings more days close to the 0 °C threshold, so the number of cycles increases.' : 'Warming lifts temperatures above the 0 °C threshold, so the number of cycles decreases.'} Approximated from monthly normals (±${fmt(G.meta.ft_cal_rmse, 0)} days).</span>` : `Hem donma hem çözülmenin yaşandığı gün sayısı ${fmt(d.FT[0], 0)} → <b>${fmt(d.FT[j], 0)}</b> gün/yıl. <span class="why">Neden: bu sayı sıcaklıkların 0 °C çevresinde ne kadar sık dolaştığına bağlıdır. ${d.FT[0] < 1 ? 'Bölge zaten donmanın görülmediği kadar sıcak; ısınma bunu değiştirmez.' : d.T[0] < -5 && d.FT[j] > d.FT[0] ? 'Çok soğuk bölgede ısınma, daha fazla günü 0 °C eşiğine yaklaştırdığı için döngü sayısı artıyor.' : 'Isınma, sıcaklıkları 0 °C eşiğinin üzerine taşıdığı için döngü sayısı azalıyor.'} Aylık normallerden yaklaşık hesaplanır (±${fmt(G.meta.ft_cal_rmse, 0)} gün).</span>`},
    {id: 'plV_PI', title: tx('Permafrost göstergesi', 'Permafrost indicator'), key: 'PI', unit: '0–1', dec: 2, opt: {yaxis: {range: [-0.05, 1.08]}},
     txt: LANG === 'en' ? `Indicator ${fmt(d.PI[0], 2)} → <b>${fmt(d.PI[j], 2)}</b> (1 = likely continuous permafrost, 0 = none). <span class="why">Why: derived linearly so that it is 1 below an annual mean of −3 °C and 0 above +1 °C. ${d.PI[0] > 0.05 && d.PI[j] < d.PI[0] - 0.05 ? 'Warming brings the region closer to the permafrost limit: the active layer thickens, ground ice is lost, and thermokarst subsidence and landslides increase.' : d.PI[0] <= 0.05 ? 'The region is already too warm for permafrost.' : 'The region keeps its permafrost condition in this period.'} Not a measured permafrost map.</span>` : `Gösterge ${fmt(d.PI[0], 2)} → <b>${fmt(d.PI[j], 2)}</b> (1 = büyük olasılıkla sürekli permafrost, 0 = yok). <span class="why">Neden: yıllık ortalama sıcaklık −3 °C altında 1, +1 °C üstünde 0 olacak şekilde doğrusal türetilir. ${d.PI[0] > 0.05 && d.PI[j] < d.PI[0] - 0.05 ? 'Isınma bölgeyi permafrost sınırına yaklaştırıyor: aktif tabaka kalınlaşır, zemin buzu kaybolur, termokarst çökmeleri ve heyelanlar artar.' : d.PI[0] <= 0.05 ? 'Bölge permafrost için zaten fazla sıcak.' : 'Bölge bu dönemde permafrost koşulunu koruyor.'} Ölçülmüş permafrost haritası değildir.</span>`},
    {id: 'plV_DTR', title: tx('Gün içi sıcaklık farkı ve günlük en yüksek', 'Diurnal temperature range and daily maximum'), key: 'DTR', unit: '°C', dec: 1, opt: {},
     txt: LANG === 'en' ? `Diurnal range ${fmt(d.DTR[0], 1)} → <b>${fmt(d.DTR[j], 1)} °C</b>; annual mean daily maximum temperature roughly ${fmt(tmax0, 1)} → <b>${fmt(tmax1, 1)} °C</b> (T + range/2). <span class="why">Why: in CMIP6, night-time temperatures warm slightly faster than daytime ones, so the range narrows slightly in most places. A wide diurnal range is a distinctive feature of Mars (≈ 70–90 °C); narrowing reduces rock breakdown driven by thermal stress (insolation weathering).</span>` : `Gün içi fark ${fmt(d.DTR[0], 1)} → <b>${fmt(d.DTR[j], 1)} °C</b>; yıl ortalaması günlük en yüksek sıcaklık yaklaşık ${fmt(tmax0, 1)} → <b>${fmt(tmax1, 1)} °C</b> (T + fark/2). <span class="why">Neden: CMIP6'da gece sıcaklıkları gündüzden biraz daha hızlı ısındığı için fark çoğu yerde hafifçe daralır. Geniş gün içi fark Mars'ın belirgin özelliğidir (≈ 70–90 °C); daralma termal stres kaynaklı kaya parçalanmasını (insolasyon ayrışması) azaltır.</span>`}
  ];
  $('#clVars').innerHTML = blocks.map(b => `<div class="cl-var"><div id="${b.id}" class="cl-plot"></div><p class="cl-txt">${b.txt}</p></div>`).join('');
  for (const b of blocks) lineChart(b.id, b.key, d, o, s, b.unit, b.dec, b.title, b.opt);
}

/* ---- yüzey süreçleri ---- */
function renderProcesses(d, o, j, s) {
  const pr = processes(d, j), po = processes(o, j);
  const F = (r) => ok(r) ? (r - 1) * 100 : NaN;
  const items = [
    {k: 'chem', lab: tx('Kimyasal ayrışma ve toprak oluşumu', 'Chemical weathering and soil formation'), r: pr.rChem, ro: po.rChem, icon: '<svg class="ic" viewBox="0 0 24 24" style="width:20px;height:20px"><path d="M9.5 2.5h5M10 2.5v6L4.5 19a1.8 1.8 0 0 0 1.6 2.5h11.8a1.8 1.8 0 0 0 1.6-2.5L14 8.5v-6"/><path d="M7 15h10"/></svg>',
     how: tx(`Oran = exp[Eₐ/R·(1/T₀ − 1/T₁)] × (P₁/P₀); Eₐ ≈ 60 kJ/mol (silikat ayrışması için literatür aralığı 50–75; White & Blum 1995). Sıcaklık etkisi ×${fmt(pr.arr, 2)}, yağış etkisi ×${fmt(pr.pr, 2)}.`, `Ratio = exp[Eₐ/R·(1/T₀ − 1/T₁)] × (P₁/P₀); Eₐ ≈ 60 kJ/mol (literature range for silicate weathering 50–75; White & Blum 1995). Temperature effect ×${fmt(pr.arr, 2)}, precipitation effect ×${fmt(pr.pr, 2)}.`),
     mean: LANG === 'en' ? (d.AI[0] < 0.05 ? 'Because the region is hyper-arid, absolute chemical weathering is already very low; even if the ratio is large, soil formation remains very slow even over several thousand years. Salt crusts and gypsum are preserved, which is favourable for a Mars regolith analog.' : pr.rChem > 1.05 ? 'Warmer and/or wetter conditions accelerate mineral dissolution, clay formation and soil-profile development. Fresh basaltic/volcanic surfaces age faster, which weakens the "fresh regolith" analog.' : pr.rChem < 0.95 ? 'Drying outweighs the temperature effect; chemical weathering slows down and the surface stays "fresh" for longer.' : 'No marked change in the rate of chemical weathering.') : d.AI[0] < 0.05 ? 'Bölge hiper-kurak olduğu için mutlak kimyasal ayrışma zaten çok düşüktür; oran büyük çıksa bile toprak oluşumu birkaç bin yıllık ölçekte bile çok yavaş kalır. Tuz kabukları ve jips korunur; bu, Mars regolit analoğu için olumludur.' : pr.rChem > 1.05 ? 'Daha sıcak ve/veya nemli koşullar mineral çözünmesini, kil oluşumunu ve toprak profilinin gelişimini hızlandırır. Taze bazaltik/volkanik yüzeyler daha hızlı yaşlanır; bu, "taze regolit" analoğunu zayıflatır.' : pr.rChem < 0.95 ? 'Kuruma, sıcaklık etkisini bastırıyor; kimyasal ayrışma yavaşlar ve yüzey daha uzun süre "taze" kalır.' : 'Kimyasal ayrışma hızında belirgin değişim yok.'},
    {k: 'frost', lab: tx('Donma-çözülme ile kaya parçalanması', 'Frost-driven rock breakdown'), r: pr.rFrost, ro: po.rFrost, icon: '<svg class="ic" viewBox="0 0 24 24" style="width:20px;height:20px"><path d="M12 2v20M4 6.5l16 11M20 6.5l-16 11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/></svg>',
     how: tx(`Oran = FT₁/FT₀ (donma-çözülme günü). Fiziksel ayrışma, kayadaki suyun donup genleşmesiyle oluşur; nem yoksa etkisi sınırlıdır (bölgede P/PET ${fmt(d.AI[0], 3)}).`, `Ratio = FT₁/FT₀ (freeze–thaw days). Physical weathering occurs when water in rock freezes and expands; without moisture the effect is limited (regional P/PET ${fmt(d.AI[0], 3)}).`),
     mean: LANG === 'en' ? (!ok(pr.rFrost) ? 'There is no freeze–thaw in the region, so this process is not active.' : pr.rFrost < 0.95 ? 'Fewer cycles: frost shattering of rock walls and talus production decrease; periglacial forms such as patterned ground and solifluction weaken. The Mars periglacial analog value declines.' : pr.rFrost > 1.05 ? 'More cycles: rock breakdown, talus production and cryoturbation increase; crater walls and cliffs retreat faster.' : 'The number of cycles is largely maintained.') : !ok(pr.rFrost) ? 'Bölgede donma-çözülme olmadığı için bu süreç etkin değil.' : pr.rFrost < 0.95 ? 'Daha az döngü: kaya duvarlarında don kırılması ve moloz (talus) üretimi azalır; desenli zemin ve soliflüksiyon gibi periglasiyal şekiller zayıflar. Mars periglasiyal analog değeri düşer.' : pr.rFrost > 1.05 ? 'Daha fazla döngü: kaya parçalanması, moloz üretimi ve kriyoturbasyon artar; krater duvarları ve kayalıklar daha hızlı geriler.' : 'Döngü sayısı büyük ölçüde korunuyor.'},
    {k: 'water', lab: tx('Su aşınması (yağış erozivitesi)', 'Water erosion (rainfall erosivity)'), r: pr.rWater, ro: po.rWater, icon: '<svg class="ic" viewBox="0 0 24 24" style="width:20px;height:20px"><path d="M12 3s6.5 7.2 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.2 12 3 12 3z"/></svg>',
     how: tx(`Oran = R(P₁)/R(P₀); R = 0,0483·P^1,61 (P ≤ 850 mm), daha yüksek yağışta ikinci derece ilişki (Renard & Freimund 1994). Erozivite yağışla doğrusaldan hızlı artar.`, `Ratio = R(P₁)/R(P₀); R = 0.0483·P^1.61 (P ≤ 850 mm), a quadratic relation at higher precipitation (Renard & Freimund 1994). Erosivity increases faster than linearly with precipitation.`),
     mean: LANG === 'en' ? (pr.rWater > 1.05 ? 'More erosive rainfall: gully and channel formation, slope wash and sediment transport onto crater floors accelerate. The effect is larger on bare surfaces (' + fmt(pr.bare * 100, 0) + '%).' : pr.rWater < 0.95 ? 'Less erosive rainfall: fluvial erosion weakens, and surface forms and desert pavement are better preserved.' : 'No marked change in rainfall erosivity.') : pr.rWater > 1.05 ? 'Daha erozif yağış: oyuntu ve dere yatağı oluşumu, yamaç yıkanması ve krater tabanlarına tortu taşınması hızlanır. Çıplak yüzeyde (%' + fmt(pr.bare * 100, 0) + ') etki daha büyüktür.' : pr.rWater < 0.95 ? 'Daha az erozif yağış: akarsu aşınması zayıflar, yüzey şekilleri ve çöl kaplaması daha iyi korunur.' : 'Yağış erozivitesinde belirgin değişim yok.'},
    {k: 'wind', lab: tx('Rüzgâr aşınması ve toz', 'Wind erosion and dust'), r: pr.rWind, ro: po.rWind, icon: '<svg class="ic" viewBox="0 0 24 24" style="width:20px;height:20px"><path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7"/></svg>',
     how: tx(`Oran = AI₀/AI₁. Lancaster (1988) kum hareketliliği indeksi M = (rüzgâr) / (P/PET) ile orantılıdır; rüzgâr verisi gelecekte sabit tutulduğu için değişim yalnızca kuraklıktan gelir. Bölge rüzgârı ${fmt(pr.W, 1)} m/s.`, `Ratio = AI₀/AI₁. Proportional to the Lancaster (1988) sand mobility index M = (wind) / (P/PET); since wind is held constant in the future, the change comes from aridity alone. Regional wind ${fmt(pr.W, 1)} m/s.`),
     mean: LANG === 'en' ? (pr.rWind > 1.05 ? 'A drier surface with less binding moisture and vegetation: sand and dust movement, deflation and dune activity increase. Dust load on equipment rises; the analog for Martian aeolian processes strengthens.' : pr.rWind < 0.95 ? 'A wetter surface binds sand; wind erosion and dust movement weaken.' : 'No marked change in conditions for wind erosion.') : pr.rWind > 1.05 ? 'Daha kurak yüzey, daha az bağlayıcı nem ve bitki: kum ve toz hareketi, deflasyon ve kumul aktivitesi artar. Ekipman için toz yükü yükselir; Mars eolian süreçleri analoğu güçlenir.' : pr.rWind < 0.95 ? 'Daha nemli yüzey kumu bağlar; rüzgâr aşınması ve toz hareketi zayıflar.' : 'Rüzgâr aşınması koşullarında belirgin değişim yok.'},
    {k: 'deg', lab: tx('Krater ve yer şekli bozunma hızı', 'Crater and landform degradation rate'), r: pr.rDeg, ro: po.rDeg, icon: '<svg class="ic" viewBox="0 0 24 24" style="width:20px;height:20px"><path d="M2.5 20.5l7-12 4 6.5 2.5-3.5 5.5 9z"/><path d="M8 11.5l1.5 1.5 1.5-1.5"/></svg>',
     how: tx(`Yukarıdaki süreçlerin, bölgedeki bugünkü önemlerine göre ağırlıklı ortalaması: su ağırlığı ${fmt(pr.wWater, 2)} (P/PET), donma ağırlığı ${fmt(pr.wFrost, 2)} (FT), rüzgâr ağırlığı ${fmt(pr.wWind, 2)} (çıplaklık × kuruluk). Deneysel bileşik göstergedir.`, `Weighted mean of the processes above according to their present importance in the region: water weight ${fmt(pr.wWater, 2)} (P/PET), frost weight ${fmt(pr.wFrost, 2)} (FT), wind weight ${fmt(pr.wWind, 2)} (bareness × dryness). An experimental composite indicator.`),
     mean: LANG === 'en' ? (pr.rDeg > 1.05 ? 'Crater rims and ejecta blankets erode faster and crater floors fill faster; small, young impact scars are erased in a geologically shorter time. The region weakens over time as a "well-preserved landform" analog.' : pr.rDeg < 0.95 ? 'Landforms degrade more slowly; craters, lava flows and channel traces are preserved longer. This is favourable for a morphology analog.' : 'No marked change in the landform degradation rate is expected; existing surface forms are preserved at a similar rate.') : pr.rDeg > 1.05 ? 'Krater kenarları ve ejekta örtüleri daha hızlı aşınır, krater tabanları daha hızlı dolar; küçük ve genç çarpma izleri jeolojik olarak daha kısa sürede silinir. Bölge "iyi korunmuş yer şekli" analoğu olarak zamanla zayıflar.' : pr.rDeg < 0.95 ? 'Yer şekilleri daha yavaş bozunur; kraterler, lav akıntıları ve kanal izleri daha uzun korunur. Bu, morfoloji analoğu için olumludur.' : 'Yer şekillerinin bozunma hızında belirgin değişim beklenmiyor; mevcut yüzey şekilleri benzer hızda korunur.'}
  ];
  const rows = items.filter(x => ok(x.r));
  P('plProc', [
    {y: rows.map(x => x.lab), x: rows.map(x => F(x.r)), type: 'bar', orientation: 'h', name: `${SSP[s]} · ${PLAB[CL.per]}`, marker: {color: rows.map(x => F(x.r) >= 0 ? '#B96D4B' : '#5B84B1')}, text: rows.map(x => `${sgn(F(x.r), 0)} %`), textposition: 'outside', cliponaxis: false, hovertemplate: '%{y}: %{x:+.1f} %<extra></extra>'},
    {y: rows.map(x => x.lab), x: rows.map(x => F(x.ro)), type: 'scatter', mode: 'markers', name: `${s === 'ssp245' ? 'SSP5-8.5' : 'SSP2-4.5'} (${tx('karşılaştırma', 'comparison')})`, marker: {symbol: 'line-ns-open', size: 18, color: '#30352F', line: {width: 2.5, color: '#30352F'}}, hovertemplate: `%{y}: %{x:+.1f} %<extra>${tx('diğer senaryo', 'other scenario')}</extra>`}],
    LY(`${tx('Süreç hızlarının referansa göre değişimi (%)', 'Change in process rates relative to the reference (%)')} · ${PLAB[CL.per]}`, {margin: {l: 230, r: 50, t: 40, b: 46}, hovermode: 'closest', legend: {orientation: 'h', y: -0.18}, xaxis: Object.assign(AXF(), {zeroline: true, zerolinecolor: '#30352F', zerolinewidth: 1.5, ticksuffix: ' %'}), yaxis: Object.assign(AXF(), {autorange: 'reversed'})}));
  $('#clProc').innerHTML = items.map(x => `<div class="cl-proc"><div class="cl-ph"><span class="cl-ic" aria-hidden="true">${x.icon}</span><b>${x.lab}</b><span class="cl-chg ${dcls(F(x.r))}">${ok(x.r) ? `${arrow(F(x.r))} ${sgn(F(x.r), 0)} %` : tx('etkin değil', 'not active')}</span></div><p>${x.mean}</p><details><summary>${tx('Nasıl hesaplandı?', 'How was this calculated?')}</summary><p class="small muted">${x.how}</p></details></div>`).join('');
}

/* ---- toprak oluşum rejimi zaman çizelgesi ---- */
function renderSoil(d, j, s) {
  const regs = XS.map(k => soilRegime(d.T[k], d.AI[k], d.PI[k]));
  $('#clSoil').innerHTML = `<div class="cl-timeline">${regs.map((r, k) => `<div class="cl-step ${k === j ? 'cur' : ''}" style="--c:${r.col}"><div class="cl-yr">${XT[k]}</div><div class="cl-reg">${r.lab}</div><div class="small muted">T ${fmt(d.T[k], 1)} °C · P/PET ${fmt(d.AI[k], 3)}${d.PI[k] > 0.05 ? ` · permafrost ${fmt(d.PI[k], 2)}` : ''}</div></div>`).join('<div class="cl-arr">→</div>')}</div>
    <p class="cl-txt"><b>${regs[j].lab}:</b> ${regs[j].txt}${regs[j].k !== regs[0].k ? tx(` Referans dönemindeki rejim (${regs[0].lab.toLowerCase()}) ${XT[j]} döneminde değişiyor; bu, yüzeyde biriken mineral topluluğunu ve toprak profilini uzun vadede değiştirir.`, ` The reference-period regime (${regs[0].lab.toLowerCase()}) changes in ${XT[j]}; this alters the mineral assemblage accumulating at the surface and the soil profile in the long term.`) : tx(' Rejim bu senaryoda değişmiyor; yüzey mineralojisi ve toprak tipi büyük ölçüde korunur.', ' The regime does not change under this scenario; surface mineralogy and soil type are largely preserved.')}</p>
    <p class="small muted">${tx('Sınıflandırma: permafrost göstergesi ≥ 0,5 ise kriyojenik; aksi halde UNEP kuraklık sınıfına göre (P/PET). Pedolojik genelleme olup saha toprak etüdü değildir. Toprak profillerinin gelişimi yüzyıllar–binyıllar sürer; burada gösterilen, iklimin yönlendirdiği eğilimdir.', 'Classification: cryogenic if the permafrost indicator is ≥ 0.5; otherwise by UNEP aridity class (P/PET). A pedological generalisation, not a field soil survey. Soil profiles take centuries to millennia to develop; what is shown here is the climate-driven tendency.')}</p>`;
}

/* ---- hedef koşullara uyum ---- */
function renderFit(s) {
  const act = activeParams(), climP = act.filter(p => p.fut), statP = act.filter(p => !p.fut);
  const gs = [baseGet, ...PERIODS.map(per => futGet(s, per))];
  const rows = climP.map(p => `<tr><td>${p.lab}</td><td class="num">${esc(critText(p))}</td>${gs.map(g => { const sc = partMean(p, g); return `<td class="num ${fitClass(sc)}">${esc(valTextMean(p, g))}</td>`; }).join('')}</tr>`).join('') +
    statP.map(p => `<tr><td>${p.lab} <span class="badge b-obs">${tx('sabit', 'constant')}</span></td><td class="num">${esc(critText(p))}</td><td class="num ${fitClass(partMean(p))}" colspan="4">${esc(valTextMean(p))} · ${tx('gelecek verisi yok', 'no future data')}</td></tr>`).join('') +
    `<tr><td><b>${tx('Uygunluk puanı', 'Suitability score')}</b></td><td></td>${gs.map(g => `<td class="num"><b>${fmt(selScoreRaw(g) * 100, 0)}</b></td>`).join('')}</tr>`;
  $('#futTable').innerHTML = `<table class="futtable"><thead><tr><th>${tx('Parametre', 'Parameter')}</th><th class="r">${tx('Hedefiniz', 'Your target')}</th><th class="r">1970–2000</th>${PERIODS.map(p => `<th class="r">${PLAB[p]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><p class="small muted" style="margin-top:6px">${tx('Yeşil: hedef aralıkta · sarı: yakın · kırmızı: uzak. Bölge ortalamalarıdır.', 'Green: within the target range · yellow: close · red: far. Regional averages.')}</p>`;
  const tr = [];
  for (const ss of ['ssp245', 'ssp585']) {
    const y = gs.map((_, k) => k ? selScoreRaw(futGet(ss, PERIODS[k - 1])) * 100 : selScoreRaw(baseGet) * 100);
    tr.push({x: XS, y, name: SSP[ss], mode: 'lines+markers+text', text: y.map((v, k) => k && ss === s ? fmt(v, 0) : ''), textposition: 'top center', line: {color: SCOL[ss], width: ss === s ? 3 : 1.5, dash: ss === s ? 'solid' : 'dot'}, marker: {size: 8}, type: 'scatter', hovertemplate: '%{y:.0f}<extra>' + SSP[ss] + '</extra>'});
  }
  P('plScore', tr, LY(tx('Hedef koşullarınıza uygunluk puanı (0–100)', 'Suitability score for your target conditions (0–100)'), {yaxis: Object.assign(AXF(), {range: [0, 108]}), xaxis: Object.assign(AXF(), {tickvals: XS, ticktext: XT, range: [-0.25, 3.35]}), legend: {orientation: 'h', y: -0.2}}));
}

/* ---- yöntem ve güven ---- */
function renderMethodCl(d, j, s) {
  const agreeT = d.Tlo[j] > d.T[0] ? tx('üç model de ısınma', 'all three models: warming') : tx('modeller ayrışıyor', 'models disagree');
  const agreeP = d.Plo[j] > d.P[0] ? tx('üç model de artış', 'all three models: increase') : d.Phi[j] < d.P[0] ? tx('üç model de azalış', 'all three models: decrease') : tx('modeller ayrışıyor', 'models disagree');
  const conf = (good) => good ? `<span class="badge b-calc">${tx('yüksek', 'high')}</span>` : `<span class="badge b-exp">${tx('düşük', 'low')}</span>`;
  $('#clMethod').innerHTML = LANG === 'en' ? `
  <div class="tablewrap"><table><thead><tr><th>Component</th><th>How it was produced</th><th>Confidence in this region</th></tr></thead><tbody>
  <tr><td>Temperature</td><td>WorldClim CMIP6 downscaled BIO1; mean of ${G.meta.models.join(', ')}. Model range ${fmt(d.Tlo[j], 1)} – ${fmt(d.Thi[j], 1)} °C.</td><td>${conf(d.Tlo[j] > d.T[0])} ${agreeT}</td></tr>
  <tr><td>Precipitation</td><td>BIO12 from the same three models; range ${fmt(d.Plo[j], 0)} – ${fmt(d.Phi[j], 0)} mm.</td><td>${conf(d.Plo[j] > d.P[0] || d.Phi[j] < d.P[0])} ${agreeP}</td></tr>
  <tr><td>Aridity index</td><td>The temperature change was added to the monthly normals and precipitation scaled by its ratio; P/PET with Hargreaves PET (delta method).</td><td>${conf(d.Plo[j] > d.P[0] || d.Phi[j] < d.P[0])} depends on precipitation confidence</td></tr>
  <tr><td>Freeze–thaw</td><td>From monthly Tmin/Tmax, assuming daily variability σ = ${fmt(G.meta.ft_sigma, 0)} °C; RMSE ≈ ${fmt(G.meta.ft_cal_rmse, 0)} days/yr against daily data at 14 points.</td><td><span class="badge b-exp">approximate</span></td></tr>
  <tr><td>Process indicators</td><td>Relative ratios calculated from literature relations (Arrhenius weathering, Renard & Freimund erosivity, Lancaster mobility); not absolute rates.</td><td><span class="badge b-exp">experimental</span></td></tr>
  <tr><td>Held constant</td><td>Wind, bare surface, permanent ice, rock type and elevation are assumed not to change in the future.</td><td><span class="badge b-obs">assumption</span></td></tr>
  </tbody></table></div>
  <p class="small muted" style="margin-top:8px">The reference period is 1970–2000; today's climate is already warmer than that (2021–2040 is the closest projection). Period values are 20-year averages, not the weather of a single year. Scenarios are for comparison, not probabilities.</p>` : `
  <div class="tablewrap"><table><thead><tr><th>Bileşen</th><th>Nasıl üretildi</th><th>Bu bölgede güven</th></tr></thead><tbody>
  <tr><td>Sıcaklık</td><td>WorldClim CMIP6 ölçek küçültülmüş BIO1; ${G.meta.models.join(', ')} ortalaması. Model aralığı ${fmt(d.Tlo[j], 1)} – ${fmt(d.Thi[j], 1)} °C.</td><td>${conf(d.Tlo[j] > d.T[0])} ${agreeT}</td></tr>
  <tr><td>Yağış</td><td>BIO12 aynı üç modelden; aralık ${fmt(d.Plo[j], 0)} – ${fmt(d.Phi[j], 0)} mm.</td><td>${conf(d.Plo[j] > d.P[0] || d.Phi[j] < d.P[0])} ${agreeP}</td></tr>
  <tr><td>Kuraklık indeksi</td><td>Aylık normallere sıcaklık değişimi eklenip yağış oranla ölçeklendi; Hargreaves PET ile P/PET (delta yöntemi).</td><td>${conf(d.Plo[j] > d.P[0] || d.Phi[j] < d.P[0])} yağış güvenine bağlı</td></tr>
  <tr><td>Donma-çözülme</td><td>Aylık Tmin/Tmax'tan, günlük değişkenlik σ = ${fmt(G.meta.ft_sigma, 0)} °C varsayımıyla; 14 noktada günlük veriye göre RMSE ≈ ${fmt(G.meta.ft_cal_rmse, 0)} gün/yıl.</td><td><span class="badge b-exp">yaklaşık</span></td></tr>
  <tr><td>Süreç göstergeleri</td><td>Literatür ilişkileriyle (Arrhenius ayrışma, Renard & Freimund erozivite, Lancaster hareketlilik) hesaplanan göreli oranlar; mutlak hız değil.</td><td><span class="badge b-exp">deneysel</span></td></tr>
  <tr><td>Sabit tutulanlar</td><td>Rüzgâr, çıplak yüzey, kalıcı buz, kaya türü, rakım gelecekte değişmez kabul edildi.</td><td><span class="badge b-obs">varsayım</span></td></tr>
  </tbody></table></div>
  <p class="small muted" style="margin-top:8px">Referans dönemi 1970–2000'dir; günümüz iklimi bu dönemden zaten daha sıcaktır (2021–2040 en yakın projeksiyon). Dönem değerleri 20 yıllık ortalamalardır, tek bir yılın havası değildir. Senaryolar olasılık değil, karşılaştırma içindir.</p>`;
}
function bindClimate() {
  $('#sspSel').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.ssp = b.dataset.s; renderClimate(); };
  $('#perSel').onclick = e => { const b = e.target.closest('button'); if (!b) return; CL.per = b.dataset.p; renderClimate(); };
}

/* ================= PLOT HELPERS ================= */
const AXF = () => ({gridcolor: '#EDE6DA', zerolinecolor: '#D6CBBB', linecolor: '#D6CBBB', tickfont: {size: 11.5, color: '#686C63'}, automargin: true});
function LY(title, extra = {}) {
  return Object.assign({paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', separators: tx(',.', '.,'), font: {family: 'Inter,-apple-system,Segoe UI,Roboto,sans-serif', color: '#30352F', size: 12.5},
    margin: {l: 52, r: 14, t: 40, b: 46}, title: {text: title, font: {size: 14}, x: .01, xanchor: 'left'}, xaxis: AXF(), yaxis: AXF(), legend: {orientation: 'h', y: -0.2},
    hovermode: 'x unified', hoverlabel: {bgcolor: '#FFFCF7', bordercolor: '#D6CBBB', font: {color: '#30352F'}}}, extra);
}
const P = (id, d, l) => Plotly.react(id, d, l, {displayModeBar: false, responsive: true});
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

/* ================= 4 · REPORT ================= */
function renderReport() {
  const sel = S.sel, act = activeParams(), s = S.ssp, R = S.regions;
  const gF = PERIODS.map(per => futGet(s, per)), sc0 = selScoreRaw(baseGet), scs = gF.map(selScoreRaw);
  const gO = PERIODS.map(per => futGet(s === 'ssp245' ? 'ssp585' : 'ssp245', per)), sco = gO.map(selScoreRaw);
  const T0 = selMean(i => G.F.T[i]), P0 = selMean(i => G.F.P[i]);
  $('#report').innerHTML = LANG === 'en' ? `
  <div class="meta"><span>ANALOGATLAS · ANALOG REGION REPORT</span><span>${new Date().toLocaleDateString(LOC(), {day: '2-digit', month: 'long', year: 'numeric'})}</span></div>
  <h1>Earth analog regions for ${S.preset ? esc(PRESETS[S.preset].label) + ' conditions' : 'custom conditions'}</h1>
  <h2>Summary</h2>
  <div class="box"><p>Based on the ${act.length} condition${act.length === 1 ? '' : 's'} entered, ${S.eligible.toLocaleString(LOC())} cells (0.5°) met the required conditions and ${R.length} suitable region${R.length === 1 ? ' was' : 's were'} found. The region examined is <b>${esc(sel.name)}</b> (${esc(sel.countries.join(', '))}), with a suitability score of <b>${fmt(sc0 * 100, 0)}/100</b>.</p>
  <p>Under ${SSP[s]}, in 2061–2080 the regional mean temperature changes by ${sgn(selMean(i => gF[2]('T', i)) - T0, 1)} °C and precipitation by ${sgn((selMean(i => gF[2]('P', i)) / P0 - 1) * 100, 0)} %; the suitability score becomes ${fmt(scs[2] * 100, 0)} (${s === 'ssp245' ? 'SSP5-8.5' : 'SSP2-4.5'}: ${fmt(sco[2] * 100, 0)}). These are scenario projections based on three climate models, not forecasts.</p></div>
  <h2>1. Search conditions</h2>
  <table><thead><tr><th>Parameter</th><th>Target</th><th>Importance</th><th>Required</th></tr></thead><tbody>${act.map(p => `<tr><td>${p.lab}</td><td>${esc(critText(p))}</td><td>${WLAB.find(x => x[0] === S.crit[p.k].w)[1]}</td><td>${S.crit[p.k].req ? 'yes' : '—'}</td></tr>`).join('')}<tr><td>Permanent ice cover</td><td colspan="3">${S.noice ? 'excluded' : 'included'}</td></tr></tbody></table>
  <h2>2. Best regions</h2>
  <table><thead><tr><th>Rank</th><th>Region</th><th>Country</th><th>Area (thousand km²)</th><th>Mean score</th><th>Known site</th></tr></thead><tbody>${R.slice(0, 10).map((r, n) => `<tr><td>${n + 1}</td><td>${esc(r.name)}</td><td>${esc(r.countries.join(', '))}</td><td class="num">${Math.round(r.area / 1000).toLocaleString(LOC())}</td><td class="num">${fmt(r.mean * 100, 0)}</td><td>${esc(r.sites.map(x => x.name).join(', ') || '—')}</td></tr>`).join('')}</tbody></table>
  <h2>3. Region examined: ${esc(sel.name)}</h2>
  <p>${sel.kind === 'region' ? `${sel.cells.length} cells, ≈ ${Math.round(sel.area / 1000).toLocaleString(LOC())} thousand km²` : 'Single cell (~55 km)'}; best point ${fmt(G.lat[sel.best], 2)}°, ${fmt(G.lon[sel.best], 2)}°.${sel.sites.length ? ' Known analog sites: ' + esc(sel.sites.map(x => `${x.name} (${x.ref})`).join('; ')) + '.' : ''}</p>
  <table><thead><tr><th>Parameter</th><th>Target</th><th>Region value</th><th>Fit</th></tr></thead><tbody>${act.map(p => { const v = partMean(p); return `<tr><td>${p.lab}</td><td>${esc(critText(p))}</td><td>${esc(valTextMean(p))}</td><td>${fitWord(v)}</td></tr>`; }).join('')}</tbody></table>
  <h3>Earlier tests in this region</h3>${(() => { const L = regionTestSites(sel); if (!L.length) { const nn = nearestTestSite(sel); return `<p>None of the analog sites in the list lies in or next to the region; no recorded test is known.${nn ? ` Nearest tested site: ${esc(nn.site.name)} (about ${(Math.round(nn.km / 10) * 10).toLocaleString(LOC())} km).` : ''}</p>`; } return '<ul>' + L.map(({site: s}) => `<li><b>${esc(s.name)}</b> (${esc((G.meta.test_levels || {})[s.test_level] || '')})${s.tests.length ? ': ' + s.tests.map(t => `${esc(t.y)} · ${esc(t.org)}: ${esc(t.what)} <span style="color:#686C63">(${esc(t.url)})</span>`).join('; ') : ''}</li>`).join('') + '</ul>'; })()}
  <h2>4. Future climate (${SSP[s]})</h2>
  <table><thead><tr><th>Parameter</th><th>1970–2000</th>${PERIODS.map(p => `<th>${p.replace('-', '–')}</th>`).join('')}</tr></thead><tbody>${act.filter(p => p.fut).map(p => `<tr><td>${p.lab}</td>${[baseGet, ...gF].map(g => `<td>${esc(valTextMean(p, g))}</td>`).join('')}</tr>`).join('')}<tr><td><b>Suitability score</b></td>${[sc0, ...scs].map(v => `<td><b>${fmt(v * 100, 0)}</b></td>`).join('')}</tr></tbody></table>
  <h2>5. Data sources</h2>
  <ul><li>Climate (reference): WorldClim v2.1, 1970–2000, 10′ → 0.5° (Fick & Hijmans 2017).</li><li>Climate (future): WorldClim CMIP6 downscaled products; ${G.meta.models.join(', ')}; SSP2-4.5 and SSP5-8.5; 2021–2040, 2041–2060, 2061–2080.</li><li>Bare surface and ice: MODIS MCD12 IGBP land cover 2023 (via NASA GIBS).</li><li>Rock type: GLiM 0.5° (Hartmann & Moosdorf 2012, PANGAEA).</li><li>Elevation: WorldClim 10′ elevation data. Country and region names: Natural Earth 1:50m.</li><li>Analog sites: ${G.meta.sites.length} sites compiled from the literature (approximate coordinates).</li></ul>
  <h2>6. Method</h2>
  <p>For each parameter the score is 1 if the cell value lies within the target range; outside it, the score decreases in a Gaussian way with distance from the limit (tolerances: temperature 3 °C, diurnal range 2 °C, freeze–thaw 20 days, wind 1 m/s, bare surface 10 points, elevation 500 m, relief 300 m; precipitation and aridity index 0.5 on a log scale). The total score is the importance-weighted mean (low 1, medium 2, high 3); cells that do not fully meet a required condition are excluded. For the future periods, temperature, precipitation and diurnal range come directly from the CMIP6 products, while the aridity index and freeze–thaw days are calculated from changes applied to the monthly normals with the delta method.</p>
  <h2>7. Limitations</h2>
  <ul><li>Resolution ~55 km: this is a <b>regional pre-screening</b>, not site selection. Small lava fields, ice-free valleys or salt flats may be lost in the cell average.</li><li>WorldClim relies on interpolation in desert and polar regions where stations are sparse.</li><li>Freeze–thaw days are approximated from monthly normals (RMSE ≈ ${fmt(G.meta.ft_cal_rmse, 0)} days/yr against daily data at 14 points).</li><li>Permafrost is a temperature-based indicator, not a measured map.</li><li>Bare surface, wind, rock type and elevation are assumed constant in the future.</li><li>Future projections are the mean of three models; the range shown covers only these three models.</li></ul>
  <p class="small" style="color:#686C63;margin-top:16px">Created with AnalogAtlas. Results are intended to support research planning.</p>` : `
  <div class="meta"><span>ANALOGATLAS · ANALOG BÖLGE RAPORU</span><span>${new Date().toLocaleDateString(LOC(), {day: '2-digit', month: 'long', year: 'numeric'})}</span></div>
  <h1>${S.preset ? esc(PRESETS[S.preset].label) + ' koşulları' : 'Özel koşullar'} için Dünya analog bölgeleri</h1>
  <h2>Özet</h2>
  <div class="box"><p>Girilen ${act.length} koşula göre ${S.eligible.toLocaleString(LOC())} hücre (0,5°) zorunlu koşulları karşıladı ve ${R.length} uygun bölge bulundu. İncelenen bölge <b>${esc(sel.name)}</b> (${esc(sel.countries.join(', '))}), uygunluk puanı <b>${fmt(sc0 * 100, 0)}/100</b>.</p>
  <p>${SSP[s]} senaryosunda 2061–2080 döneminde bölge ortalaması sıcaklık ${sgn(selMean(i => gF[2]('T', i)) - T0, 1)} °C, yağış ${sgn((selMean(i => gF[2]('P', i)) / P0 - 1) * 100, 0)} % değişiyor; uygunluk puanı ${fmt(scs[2] * 100, 0)} oluyor (${s === 'ssp245' ? 'SSP5-8.5' : 'SSP2-4.5'}: ${fmt(sco[2] * 100, 0)}). Bunlar üç iklim modeline dayanan senaryo projeksiyonlarıdır, tahmin değildir.</p></div>
  <h2>1. Arama koşulları</h2>
  <table><thead><tr><th>Parametre</th><th>Hedef</th><th>Önem</th><th>Zorunlu</th></tr></thead><tbody>${act.map(p => `<tr><td>${p.lab}</td><td>${esc(critText(p))}</td><td>${WLAB.find(x => x[0] === S.crit[p.k].w)[1]}</td><td>${S.crit[p.k].req ? 'evet' : '—'}</td></tr>`).join('')}<tr><td>Kalıcı buz örtüsü</td><td colspan="3">${S.noice ? 'hariç tutuldu' : 'dahil'}</td></tr></tbody></table>
  <h2>2. En uygun bölgeler</h2>
  <table><thead><tr><th>Sıra</th><th>Bölge</th><th>Ülke</th><th>Alan (bin km²)</th><th>Ort. puan</th><th>Bilinen saha</th></tr></thead><tbody>${R.slice(0, 10).map((r, n) => `<tr><td>${n + 1}</td><td>${esc(r.name)}</td><td>${esc(r.countries.join(', '))}</td><td class="num">${Math.round(r.area / 1000).toLocaleString(LOC())}</td><td class="num">${fmt(r.mean * 100, 0)}</td><td>${esc(r.sites.map(x => x.name).join(', ') || '—')}</td></tr>`).join('')}</tbody></table>
  <h2>3. İncelenen bölge: ${esc(sel.name)}</h2>
  <p>${sel.kind === 'region' ? `${sel.cells.length} hücre, ≈ ${Math.round(sel.area / 1000).toLocaleString(LOC())} bin km²` : 'Tek hücre (~55 km)'}; en uygun nokta ${fmt(G.lat[sel.best], 2)}°, ${fmt(G.lon[sel.best], 2)}°.${sel.sites.length ? ' Bilinen analog sahaları: ' + esc(sel.sites.map(x => `${x.name} (${x.ref})`).join('; ')) + '.' : ''}</p>
  <table><thead><tr><th>Parametre</th><th>Hedef</th><th>Bölge değeri</th><th>Uyum</th></tr></thead><tbody>${act.map(p => { const v = partMean(p); return `<tr><td>${p.lab}</td><td>${esc(critText(p))}</td><td>${esc(valTextMean(p))}</td><td>${fitWord(v)}</td></tr>`; }).join('')}</tbody></table>
  <h3>Bu bölgede daha önce yapılan testler</h3>${(() => { const L = regionTestSites(sel); if (!L.length) { const nn = nearestTestSite(sel); return `<p>Bölgede veya bitişiğinde listedeki analog sahalarından hiçbiri yok; kayıtlı test bilinmiyor.${nn ? ` En yakın test yapılmış saha: ${esc(nn.site.name)} (yaklaşık ${Math.round(nn.km / 10) * 10} km).` : ''}</p>`; } return '<ul>' + L.map(({site: s}) => `<li><b>${esc(s.name)}</b> (${esc((G.meta.test_levels || {})[s.test_level] || '')})${s.tests.length ? ': ' + s.tests.map(t => `${esc(t.y)} · ${esc(t.org)}: ${esc(t.what)} <span style="color:#686C63">(${esc(t.url)})</span>`).join('; ') : ''}</li>`).join('') + '</ul>'; })()}
  <h2>4. Gelecek iklimi (${SSP[s]})</h2>
  <table><thead><tr><th>Parametre</th><th>1970–2000</th>${PERIODS.map(p => `<th>${p.replace('-', '–')}</th>`).join('')}</tr></thead><tbody>${act.filter(p => p.fut).map(p => `<tr><td>${p.lab}</td>${[baseGet, ...gF].map(g => `<td>${esc(valTextMean(p, g))}</td>`).join('')}</tr>`).join('')}<tr><td><b>Uygunluk puanı</b></td>${[sc0, ...scs].map(v => `<td><b>${fmt(v * 100, 0)}</b></td>`).join('')}</tr></tbody></table>
  <h2>5. Veri kaynakları</h2>
  <ul><li>İklim (referans): WorldClim v2.1, 1970–2000, 10′ → 0,5° (Fick & Hijmans 2017).</li><li>İklim (gelecek): WorldClim CMIP6 ölçek küçültülmüş ürünleri; ${G.meta.models.join(', ')}; SSP2-4.5 ve SSP5-8.5; 2021–2040, 2041–2060, 2061–2080.</li><li>Çıplak yüzey ve buz: MODIS MCD12 IGBP arazi örtüsü 2023 (NASA GIBS üzerinden).</li><li>Kaya türü: GLiM 0,5° (Hartmann & Moosdorf 2012, PANGAEA).</li><li>Rakım: WorldClim 10′ rakım verisi. Ülke ve bölge adları: Natural Earth 1:50m.</li><li>Analog sahaları: literatürden derlenmiş ${G.meta.sites.length} saha (yaklaşık koordinatlar).</li></ul>
  <h2>6. Yöntem</h2>
  <p>Her parametre için hücre değeri hedef aralığın içindeyse puan 1, dışındaysa sınıra uzaklıkla Gauss biçiminde azalır (toleranslar: sıcaklık 3 °C, gün içi fark 2 °C, donma-çözülme 20 gün, rüzgâr 1 m/s, çıplak yüzey 10 puan, rakım 500 m, rölyef 300 m; yağış ve kuraklık indeksi log ölçekte 0,5). Toplam puan önem ağırlıklı ortalamadır (düşük 1, orta 2, yüksek 3); zorunlu koşulu tam karşılamayan hücreler elenir. Gelecek dönemlerde sıcaklık, yağış ve gün içi fark doğrudan CMIP6 ürünlerinden; kuraklık indeksi ve donma-çözülme ise aylık normallere delta yöntemiyle uygulanmış değişimlerden hesaplanır.</p>
  <h2>7. Sınırlamalar</h2>
  <ul><li>Çözünürlük ~55 km: bu bir <b>bölgesel ön taramadır</b>, saha seçimi değildir. Küçük lav sahaları, buzsuz vadiler veya tuz düzlükleri hücre ortalamasında kaybolabilir.</li><li>WorldClim, istasyonun az olduğu çöl ve kutup bölgelerinde interpolasyona dayanır.</li><li>Donma-çözülme günleri aylık normallerden yaklaşık hesaplanmıştır (14 noktada günlük veriye göre RMSE ≈ ${fmt(G.meta.ft_cal_rmse, 0)} gün/yıl).</li><li>Permafrost, sıcaklığa dayalı bir göstergedir; ölçülmüş harita değildir.</li><li>Çıplak yüzey, rüzgâr, kaya türü ve rakım gelecekte sabit kabul edilir.</li><li>Gelecek projeksiyonları üç modelin ortalamasıdır; gösterilen aralık yalnızca bu üç modeli kapsar.</li></ul>
  <p class="small" style="color:#686C63;margin-top:16px">AnalogAtlas ile oluşturuldu. Sonuçlar araştırma planlamasına destek amaçlıdır.</p>`;
}

/* ================= METHOD & SOURCES ================= */
function renderMethod() {
  $('#methodBody').innerHTML = LANG === 'en' ? `
  <h3>Suitability score</h3>
  <p>For every cell and every active parameter: if the cell value is within the target range, <code>s = 1</code>; otherwise <code>s = exp(−(d/τ)²)</code>, where <code>d</code> is the distance to the nearest limit and <code>τ</code> the tolerance. For precipitation and the aridity index the distance is taken on a logarithmic scale (precipitation: ln(P+10), aridity: ln(AI+0.01); τ = 0.5, roughly a factor of 1.6).</p>
  <div class="formula">Total = Σ wᵢ·sᵢ / Σ wᵢ      w: low 1 · medium 2 · high 3
Tolerances τ: temperature 3 °C · diurnal range 2 °C · freeze–thaw 20 days · wind 1 m/s
              bare surface 10 points · elevation 500 m · relief 300 m
Rock type: selected class 1 · same main group 0.5 · unknown 0.3 · other 0
Permafrost indicator: π = clamp((1 − T)/4, 0, 1)   (T ≤ −3 °C → 1, T ≥ +1 °C → 0)
Required: cells with sᵢ ≠ 1 are excluded.  Ice excluded: MODIS snow/ice ≥ 50% or GLiM "ice/glacier".</div>
  <h3>Regions</h3>
  <p>Neighbouring cells (8-neighbourhood) whose score is above the threshold (at least 70 and the lower bound of the best 2% of suitable cells) are grouped into one region. Regions are sorted by mean score and, in case of a tie, by area. Names come from Natural Earth geographic region polygons and countries.</p>
  <h3>Data processing</h3>
  <ul><li>WorldClim 10′ rasters were aggregated to 0.5° with 3×3 averaging; relief is the difference between the highest and lowest elevation of the 10′ cells.</li>
  <li>Aridity index: P/PET with monthly Hargreaves PET (FAO-56 extraterrestrial radiation).</li>
  <li>Freeze–thaw days: P(Tmin &lt; 0)·P(Tmax &gt; 0)·days, assuming daily values are normally distributed with σ = ${fmt(G.meta.ft_sigma, 0)} °C around the monthly mean Tmin/Tmax. σ was chosen against NASA POWER daily counts at the 14 craters of the previous version (RMSE ≈ ${fmt(G.meta.ft_cal_rmse, 0)} days/yr, n = ${G.meta.ft_cal_n}). <span class="badge b-exp">approximate</span></li>
  <li>Future: BIO1 (temperature), BIO2 (diurnal range) and BIO12 (precipitation) directly; for aridity and freeze–thaw these changes were applied to the monthly normals (temperature additive, precipitation multiplicative).</li>
  <li>Bare surface: the MODIS IGBP 2023 class map (GIBS, 0.05°) was decoded into classes with the official colour table, and the share of the "barren" class in each 0.5° cell was taken.</li></ul>` : `
  <h3>Uygunluk puanı</h3>
  <p>Her hücre ve her etkin parametre için: hücre değeri hedef aralıkta ise <code>s = 1</code>; değilse <code>s = exp(−(d/τ)²)</code>, <code>d</code> en yakın sınıra uzaklık, <code>τ</code> tolerans. Yağış ve kuraklık indeksinde uzaklık logaritmik ölçekte alınır (yağış: ln(P+10), kuraklık: ln(AI+0,01); τ = 0,5, yaklaşık 1,6 kat).</p>
  <div class="formula">Toplam = Σ wᵢ·sᵢ / Σ wᵢ      w: düşük 1 · orta 2 · yüksek 3
Toleranslar τ: sıcaklık 3 °C · gün içi fark 2 °C · donma-çözülme 20 gün · rüzgâr 1 m/s
               çıplak yüzey 10 puan · rakım 500 m · rölyef 300 m
Kaya türü: seçilen sınıf 1 · aynı ana grup 0,5 · bilinmeyen 0,3 · diğer 0
Permafrost göstergesi: π = clamp((1 − T)/4, 0, 1)   (T ≤ −3 °C → 1, T ≥ +1 °C → 0)
Zorunlu: sᵢ = 1 olmayan hücre elenir.  Buz hariç: MODIS kar/buz ≥ %50 veya GLiM "buz/buzul".</div>
  <h3>Bölgeler</h3>
  <p>Puanı eşiğin üstündeki (en az 70 ve uygun hücrelerin en iyi %2'sinin alt sınırı) komşu hücreler (8-komşuluk) tek bölge olarak gruplanır. Bölgeler ortalama puana, eşitlikte alana göre sıralanır. Adlar Natural Earth coğrafi bölge poligonlarından ve ülkelerden gelir.</p>
  <h3>Veri işleme</h3>
  <ul><li>WorldClim 10′ rasterları 3×3 ortalamayla 0,5°'ye indirgendi; rölyef, 10′ hücrelerin en yüksek ve en düşük rakım farkıdır.</li>
  <li>Kuraklık indeksi: aylık Hargreaves PET (FAO-56 dünya dışı radyasyon) ile P/PET.</li>
  <li>Donma-çözülme günleri: aylık ortalama Tmin/Tmax çevresinde günlük değerlerin σ = ${fmt(G.meta.ft_sigma, 0)} °C normal dağıldığı varsayımıyla P(Tmin &lt; 0)·P(Tmax &gt; 0)·gün. σ, eski sürümdeki 14 kraterin NASA POWER günlük sayımlarına göre seçildi (RMSE ≈ ${fmt(G.meta.ft_cal_rmse, 0)} gün/yıl, n = ${G.meta.ft_cal_n}). <span class="badge b-exp">yaklaşık</span></li>
  <li>Gelecek: BIO1 (sıcaklık), BIO2 (gün içi fark), BIO12 (yağış) doğrudan; kuraklık ve donma-çözülme için bu değişimler aylık normallere uygulandı (sıcaklık toplamsal, yağış oransal).</li>
  <li>Çıplak yüzey: MODIS IGBP 2023 sınıf haritası (GIBS, 0,05°) resmî renk tablosuyla sınıflara çözüldü, 0,5° hücrede "çorak" sınıfının payı alındı.</li></ul>`;
  const rows = [];
  for (const [k, p] of Object.entries(PRESETS)) {
    if (!p.tag) continue;
    const crit = blankCrit(); for (const [key, c] of Object.entries(p.crit)) Object.assign(crit[key], {req: false}, JSON.parse(JSON.stringify(c)));
    const sc = new Float32Array(G.n), vals = []; for (let i = 0; i < G.n; i++) { sc[i] = cellScore(i, baseGet, crit, true).s; if (!Number.isNaN(sc[i])) vals.push(sc[i]); }
    for (const s of G.meta.sites.filter(x => x.tags.includes(p.tag))) {
      const v = s.cell != null ? sc[s.cell] : NaN, better = Number.isNaN(v) ? null : vals.filter(x => x > v + 1e-9).length / vals.length * 100;
      let why = ''; if (Number.isNaN(v)) { if (G.F.icemask[s.cell] >= 0.5) why = tx('hücre buz örtüsü olarak sınıflı', 'cell classified as ice cover'); else { const r = cellScore(s.cell, baseGet, crit, false); const f = activeParams(crit).find(q => crit[q.k].req && r.parts[q.k] < 0.999); why = f ? `${tx('zorunlu koşul', 'required condition')}: ${f.lab.toLowerCase()} (${valText(f, s.cell)})` : ''; } }
      rows.push(`<tr><td>${p.label}</td><td>${esc(s.name)}</td><td class="num">${Number.isNaN(v) ? '—' : fmt(v * 100, 0)}</td><td class="${better == null ? 'no' : better <= 10 ? 'ok' : better <= 30 ? 'near' : 'no'}">${better == null ? tx('elendi: ', 'excluded: ') + esc(why) : tx(`en iyi %${fmt(Math.max(better, 0.1), 1)} içinde`, `within the best ${fmt(Math.max(better, 0.1), 1)}%`)}</td></tr>`);
    }
  }
  $('#valTable').innerHTML = `<table class="vtable"><thead><tr>${tx(['Senaryo', 'Bilinen saha', 'Puan', 'Sonuç'], ['Scenario', 'Known site', 'Score', 'Result']).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table><p class="small muted" style="margin-top:8px">${tx('"En iyi %x içinde": sahadan daha yüksek puan alan uygun hücrelerin oranı. Elenen sahalar çoğunlukla 55 km hücrenin saha koşulunu temsil edememesinden kaynaklanır (ör. Kuru Vadiler hücresinin büyük kısmı buzul, küçük lav sahalarında MODIS bitki örtüsü görür).', '"Within the best x%": share of suitable cells scoring higher than the site. Excluded sites are mostly due to the 55 km cell not representing site conditions (e.g. most of the Dry Valleys cell is glacier; for small lava fields MODIS sees vegetation).')}</p>`;
}
function renderSources() {
  const card = (b, cls, t, rows) => `<div class="src"><span class="badge ${cls}">${b}</span><h3>${t}</h3><dl>${rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl></div>`;
  $('#srcGrid').innerHTML = (LANG === 'en' ? [
    card('Observation', 'b-obs', 'Reference climate', [['Source', 'WorldClim v2.1 (Fick & Hijmans 2017)'], ['Period', '1970–2000 monthly normals'], ['Variables', 'Tmin, Tmax, precipitation, wind, BIO1/2/12, elevation'], ['Processing', '10′ → 0.5°; PET, P/PET and freeze–thaw derived'], ['Status', 'Station interpolation; high uncertainty in deserts and polar regions']]),
    card('Model', 'b-model', 'Future climate (CMIP6)', [['Source', 'WorldClim CMIP6 downscaled products'], ['Models', esc(G.meta.models.join(', '))], ['Scenarios', 'SSP2-4.5, SSP5-8.5'], ['Periods', '2021–2040, 2041–2060, 2061–2080'], ['Status', 'Three-model mean and range; not a forecast']]),
    card('Satellite', 'b-obs', 'Bare surface and ice', [['Source', 'MODIS MCD12 IGBP annual land cover, 2023'], ['Access', 'NASA GIBS WMS, decoded into classes with the official colour table'], ['Processing', 'Share of barren and snow/ice in each 0.5° cell from 0.05° pixels'], ['Status', 'Classification product; lava fields are often classed as shrubland']]),
    card('Map', 'b-cat', 'Rock type', [['Source', 'GLiM (Hartmann & Moosdorf 2012), 0.5° grid, PANGAEA'], ['Content', 'Dominant rock class in the cell (16 classes)'], ['Status', 'Dominant class only; other rocks in the cell are not visible']]),
    card('Catalogue', 'b-calc', 'Known analog sites', [['Content', `${G.meta.sites.length} sites with analog-type tags`], ['Source', 'Literature (a reference for each site)'], ['Status', 'Approximate coordinates; values from the cell in which the site falls']]),
    card('Algorithm', 'b-calc', 'Suitability score', [['Computation', 'In the browser, for 95,000 cells on every change'], ['Validation', 'Tested to match its Python counterpart (tools/scoring.py) exactly'], ['Status', 'Relative score; depends on the target ranges']])
  ] : [
    card('Gözlem', 'b-obs', 'Referans iklim', [['Kaynak', 'WorldClim v2.1 (Fick & Hijmans 2017)'], ['Dönem', '1970–2000 aylık normaller'], ['Değişken', 'Tmin, Tmax, yağış, rüzgâr, BIO1/2/12, rakım'], ['İşlem', '10′ → 0,5°; PET, P/PET, donma-çözülme türetildi'], ['Durum', 'İstasyon interpolasyonu; çöl ve kutuplarda belirsizlik yüksek']]),
    card('Model', 'b-model', 'Gelecek iklimi (CMIP6)', [['Kaynak', 'WorldClim CMIP6 ölçek küçültülmüş ürünleri'], ['Modeller', esc(G.meta.models.join(', '))], ['Senaryo', 'SSP2-4.5, SSP5-8.5'], ['Dönem', '2021–2040, 2041–2060, 2061–2080'], ['Durum', 'Üç model ortalaması ve aralığı; tahmin değildir']]),
    card('Uydu', 'b-obs', 'Çıplak yüzey ve buz', [['Kaynak', 'MODIS MCD12 IGBP yıllık arazi örtüsü, 2023'], ['Erişim', 'NASA GIBS WMS, resmî renk tablosuyla sınıflara çözüldü'], ['İşlem', '0,05° piksellerden 0,5° hücrede çorak ve kar/buz payı'], ['Durum', 'Sınıflandırma ürünü; lav sahaları çoğu zaman çalılık sınıflanır']]),
    card('Harita', 'b-cat', 'Kaya türü', [['Kaynak', 'GLiM (Hartmann & Moosdorf 2012), 0,5° ızgara, PANGAEA'], ['İçerik', 'Hücrede baskın kaya sınıfı (16 sınıf)'], ['Durum', 'Baskın sınıf; hücredeki diğer kayalar görünmez']]),
    card('Katalog', 'b-calc', 'Bilinen analog sahaları', [['İçerik', `${G.meta.sites.length} saha, analog türü etiketleriyle`], ['Kaynak', 'Literatür (her sahada kaynak)'], ['Durum', 'Koordinatlar yaklaşık; değerler sahanın düştüğü hücreden']]),
    card('Algoritma', 'b-calc', 'Uygunluk puanı', [['Hesap', 'Tarayıcıda, her değişiklikte 95 bin hücre için'], ['Doğrulama', 'Python karşılığı (tools/scoring.py) ile birebir test edildi'], ['Durum', 'Göreceli puan; hedef aralıklara bağlıdır']])
  ]).join('');
  $('#srcMissing').innerHTML = LANG === 'en' ? `<div class="card-head"><div><h2>Not included in this version</h2></div></div><ul class="prose" style="margin-left:20px">
    <li><b>Site-scale data:</b> resolution is 0.5°; no measurements from the analog sites themselves.</li>
    <li><b>Measured permafrost map:</b> a temperature-based indicator is used.</li>
    <li><b>Daily climate data:</b> freeze–thaw is approximated from monthly normals.</li>
    <li><b>Changing surface in the future:</b> bare surface, ice and wind are held constant.</li>
    <li><b>Mars/Moon crater catalogues:</b> this version searches for regions, not craters; crater morphology is not used.</li></ul>` : `<div class="card-head"><div><h2>Bu sürümde bulunmayanlar</h2></div></div><ul class="prose" style="margin-left:20px">
    <li><b>Saha ölçeğinde veri:</b> Çözünürlük 0,5°; analog sahalarının kendi ölçümleri yok.</li>
    <li><b>Ölçülmüş permafrost haritası:</b> Sıcaklık tabanlı gösterge kullanılır.</li>
    <li><b>Günlük iklim verisi:</b> Donma-çözülme aylık normallerden yaklaşık hesaplanır.</li>
    <li><b>Gelecekte değişen yüzey:</b> Çıplak yüzey, buz ve rüzgâr sabit kabul edilir.</li>
    <li><b>Mars/Ay krater katalogları:</b> Bu sürüm krater değil bölge arar; krater morfolojisi kullanılmaz.</li></ul>`;
}

/* ================= INIT ================= */
function bindGlobal() {
  $('#steps').onclick = e => { const b = e.target.closest('.step-btn'); if (b) goStep(b.dataset.s); };
  $$('.aux-btn').forEach(b => b.onclick = () => goStep(b.dataset.s));
  document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) goStep(g.dataset.go); });
  $('#repPrint').onclick = () => { try { window.print(); } catch (e) { toast(tx('Yazdırma bu görünümde engelli; dosyayı tarayıcıda açın.', 'Printing is blocked in this view; open the file in a browser.')); } };
  $('#repCopy').onclick = async () => { const t = $('#report').innerText; try { await navigator.clipboard.writeText(t); toast(tx('Rapor metni panoya kopyalandı.', 'Report text copied to the clipboard.')); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(tx('Rapor metni panoya kopyalandı.', 'Report text copied to the clipboard.')); } catch (_) { toast(tx('Kopyalama engellendi.', 'Copying was blocked.')); } ta.remove(); } };
  window.addEventListener('beforeprint', () => { if (S.step !== 'report' && S.sel) renderReport(); });
  $('#langSw').onclick = e => { const b = e.target.closest('button[data-lang]'); if (b && b.dataset.lang !== LANG) { setLang(b.dataset.lang); render(); } };
}

/* ================= DİL DEĞİŞTİRME ================= */
/* Türkçe özgün metinler bir kez saklanır; İngilizce seçilince veri ve etiketler sözlükten yazılır, Türkçeye dönünce geri yüklenir. */
const TRDATA = {};
const sizeText = sel => sel.kind === 'region' ? tx(`${sel.cells.length} hücre, ≈ ${Math.round(sel.area / 1000).toLocaleString(LOC())} bin km²`, `${sel.cells.length} cells, ≈ ${Math.round(sel.area / 1000).toLocaleString(LOC())} thousand km²`) : tx('tek hücre (~55 km)', 'single cell (~55 km)');
const zoomLabel = () => { $('#zoomBtn span').textContent = S.zoom ? tx('Tüm dünya', 'Whole world') : tx('Seçime yakınlaş', 'Zoom to selection'); };
function captureTr() {
  if (TRDATA.meta) return;
  const m = G.meta;
  TRDATA.meta = {lith: m.lith, countries: m.countries, regions: m.regions, site_tags: m.site_tags, site_note: m.site_note, test_levels: m.test_levels, test_note: m.test_note};
  TRDATA.sites = m.sites.map(s => ({name: s.name, country: s.country, ref: s.ref, tests: (s.tests || []).map(t => ({y: t.y, org: t.org, what: t.what}))}));
  TRDATA.params = PARAMS.map(p => ({lab: p.lab, tip: p.tip, mars: p.mars, moon: p.moon, u: p.u}));
  TRDATA.wlab = WLAB.map(w => w[1]);
  TRDATA.presets = Object.fromEntries(Object.entries(PRESETS).map(([k, p]) => [k, p.label]));
}
function setLang(lang) {
  captureTr();
  LANG = lang === 'en' ? 'en' : 'tr';
  const en = LANG === 'en', E = (window.I18N && window.I18N.EN) || {}, N = (window.I18N && window.I18N.names) || {}, m = G.meta;
  const pick = (enVal, trVal) => en && enVal != null ? enVal : trVal;
  Object.assign(m, {
    lith: pick(E.lith, TRDATA.meta.lith), countries: pick(N.countries && N.countries.length === TRDATA.meta.countries.length ? N.countries : null, TRDATA.meta.countries),
    regions: pick(N.regions && N.regions.length === TRDATA.meta.regions.length ? N.regions : null, TRDATA.meta.regions), site_tags: pick(E.tags, TRDATA.meta.site_tags),
    site_note: pick(E.site_note, TRDATA.meta.site_note), test_levels: pick(E.test_levels, TRDATA.meta.test_levels), test_note: pick(E.test_note, TRDATA.meta.test_note)});
  m.sites.forEach((s, n) => {
    const t0 = TRDATA.sites[n], e = en && E.sites ? E.sites[s.id] : null;
    s.name = e ? e.name : t0.name; s.country = e ? e.country : t0.country; s.ref = e ? e.ref : t0.ref;
    (s.tests || []).forEach((t, k) => { const et = e && e.tests && e.tests[k]; Object.assign(t, et ? {y: et[0], org: et[1], what: et[2]} : t0.tests[k]); });
  });
  PARAMS.forEach((p, n) => Object.assign(p, TRDATA.params[n], en ? PARAMS_EN[p.k] : {}));
  WLAB.forEach((w, n) => { w[1] = en ? WLAB_EN[n] : TRDATA.wlab[n]; });
  for (const k in PRESETS) PRESETS[k].label = en ? PRESETS_EN[k] : TRDATA.presets[k];
  if (window.I18N) { window.I18N.applyStatic(LANG); window.I18N.save(LANG); }
  zoomLabel();
  if (S.score) computeAll();   // bölge adları seçili dilde yeniden oluşur (bölgeler aynı kalır)
}
(async () => {
  try {
    G = await decodeGrid();
    captureTr(); if (LANG === 'en') setLang('en');
    bindTarget(); bindResults(); bindClimate(); bindGlobal();
    applyPreset('mars_kurak'); computeAll();
    $('#loading').remove();
    goStep('target');
  } catch (e) {
    console.error(e);
    $('#loading').innerHTML = `<b style="color:var(--err-ink)">${tx('Uygulama başlatılamadı', 'The app could not be started')}</b><p class="small">${esc(e.message)}</p>`;
  }
  window.__CA = {S, M, get G() { return G; }, cellScore, baseGet, futGet, PRESETS, applyPreset, computeAll, activeParams, setLang, get LANG() { return LANG; }};
})();
})();

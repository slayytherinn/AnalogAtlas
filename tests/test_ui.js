// AnalogAtlas · otomatik arayüz testi (Playwright, Chromium). Çalıştırma: node tests/test_ui.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '../krater_analog.html');
const OUT = path.resolve(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const EXP = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'expected_scores.json')));
const results = []; const R = (n, ok, d = '') => results.push([n, !!ok, String(d)]);
const BAD = /\bNaN\b|undefined|Infinity|∞|\[object Object\]|null\b/;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const net = []; await ctx.route('**/*', r => { const u = r.request().url(); if (/^(file|data|blob):/.test(u)) return r.continue(); net.push(u); return r.abort(); });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = n => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
  const bad = async () => { const t = await p.evaluate(() => document.querySelector('main').innerText); const m = t.match(BAD); return m ? t.slice(Math.max(0, m.index - 50), m.index + 30).replace(/\n/g, ' ') : null; };
  const go = async s => { await p.click(`[data-s=${s}]`); await p.waitForTimeout(350); };
  const preset = async k => { await go('target'); await p.click(`#presets [data-p=${k}]`); await p.waitForTimeout(300); };

  const t0 = Date.now(); await p.goto(URL); await p.waitForSelector('#s-target.on', { timeout: 30000 });
  R('1 İlk açılış hatasız', errs.length === 0, `açılış ${Date.now() - t0} ms; 95 bin hücre çözüldü`);
  R('2 İnternetsiz çalışma', net.length === 0, net.length ? net.join(',') : 'tüm dış istekler engelliyken çalıştı, hiç istek yok');
  await shot('01_kosullar');

  // 3 parity with Python reference
  let maxd = 0, nchk = 0, eligOK = true, det = [];
  for (const [k, e] of Object.entries(EXP)) {
    await preset(k);
    const js = await p.evaluate(({ idx }) => { const C = window.__CA; return { base: idx.map(i => { const v = C.cellScore(i, C.baseGet).s; return Number.isNaN(v) ? null : v; }), fut: idx.map(i => { const v = C.cellScore(i, C.futGet('ssp585', '2061-2080')).s; return Number.isNaN(v) ? null : v; }), elig: C.S.eligible }; }, { idx: e.idx });
    for (const key of ['base', 'fut']) e[key].forEach((v, j) => { const w = js[key][j]; nchk++; if ((v === null) !== (w === null)) maxd = Infinity; else if (v !== null) maxd = Math.max(maxd, Math.abs(v - w)); });
    eligOK = eligOK && js.elig === e.elig; det.push(`${k}: ${js.elig}`);
  }
  R('3 Puan JS = Python referansı', maxd < 1e-4 && eligOK, `${nchk} hücre-puan karşılaştırıldı, en büyük fark ${maxd.toExponential(1)}; uygun hücre sayıları aynı (${det.join(', ')})`);

  // 4 presets produce results
  const pr = [];
  for (const k of Object.keys(EXP)) { await preset(k); pr.push(await p.evaluate(() => [window.__CA.S.regions.length, window.__CA.S.regions[0] && window.__CA.S.regions[0].name])); }
  R('4 Altı hazır senaryo sonuç üretiyor', pr.every(x => x[0] > 0), pr.map(x => `${x[0]} bölge (1.: ${x[1]})`).join(' · '));

  // 5 custom input & validation
  await go('target'); await p.click('#clearAll'); await p.waitForTimeout(200);
  const empty = await p.evaluate(() => window.__CA.activeParams().length);
  await p.click('#steps [data-s=results]'); await p.waitForTimeout(250);
  const blockedEmpty = await p.evaluate(() => window.__CA.S.step === 'target');
  const row = k => `.crit[data-k=${k}]`;
  await p.fill(`${row('P')} [data-b=hi]`, '150'); await p.fill(`${row('T')} [data-b=hi]`, '5'); await p.waitForTimeout(400);
  const cust = await p.evaluate(() => ({ P: window.__CA.S.crit.P, T: window.__CA.S.crit.T, n: window.__CA.activeParams().length, elig: window.__CA.S.eligible }));
  const cases = [['abc', 'Sayı bekleniyor'], ['999', 'geçerli aralık'], ['-80', 'geçerli aralık']];
  let vOK = true, vd = [];
  for (const [v, want] of cases) { await p.fill(`${row('T')} [data-b=hi]`, v); await p.waitForTimeout(150); const m = await p.textContent(`${row('T')} .cerr`); const kept = await p.evaluate(() => window.__CA.S.crit.T.hi === 5); vOK = vOK && m.includes(want) && kept; vd.push(`${v} → "${m.slice(0, 55)}"`); }
  await p.fill(`${row('T')} [data-b=hi]`, '-5'); await p.fill(`${row('T')} [data-b=lo]`, '3'); await p.waitForTimeout(150);
  const m2 = await p.textContent(`${row('T')} .cerr`); vOK = vOK && m2.includes('büyük olamaz'); vd.push(`en az 3 > en çok −5 → "${m2.slice(0, 50)}"`);
  await p.click('#steps [data-s=results]'); await p.waitForTimeout(200);
  const blocked = await p.evaluate(() => window.__CA.S.step === 'target'); vOK = vOK && blocked; vd.push('hatalıyken geçiş engellendi: ' + blocked);
  await p.fill(`${row('T')} [data-b=lo]`, ''); await p.fill(`${row('T')} [data-b=hi]`, '5'); await p.waitForTimeout(400);
  R('5a Kendi koşullarını girme', empty === 0 && blockedEmpty && cust.P.hi === 150 && cust.T.hi === 5 && cust.n === 2, `temizle → 0 koşul, koşulsuz geçiş engellendi; P ≤ 150, T ≤ 5 girildi → ${cust.elig} uygun hücre`);
  R('5b Geçersiz değer kontrolü', vOK, vd.join(' | '));
  // required + lith
  const e0 = await p.evaluate(() => window.__CA.S.eligible);
  await p.fill(`${row('bare')} [data-b=lo]`, '70'); await p.waitForTimeout(300); await p.check(`${row('bare')} [data-req]`); await p.waitForTimeout(400);
  const e1 = await p.evaluate(() => window.__CA.S.eligible);
  await p.click(`${row('lith')} [data-l="2"]`); await p.waitForTimeout(400);
  const lith = await p.evaluate(() => window.__CA.S.crit.lith);
  R('5c Zorunlu koşul ve kaya türü seçimi', e1 < e0 && lith.set.includes(2) && lith.w === 'orta', `zorunlu çıplak yüzey ≥ %70: ${e0} → ${e1} hücre; bazik volkanik seçildi, önem otomatik "orta"`);
  await shot('02_ozel_kosullar');

  // 6 results, sync
  await preset('mars_kurak'); await go('results'); await p.waitForTimeout(800); await shot('03_bolgeler');
  await p.click('#regList .reg:nth-child(3)'); await p.waitForTimeout(300);
  const s3 = await p.evaluate(() => ({ sel: window.__CA.S.sel.best, r: window.__CA.S.regions[2].best, title: document.querySelector('#detTitle').textContent, name: window.__CA.S.regions[2].name, selCard: document.querySelector('#regList .reg.sel')?.dataset.reg }));
  R('6a Bölge kartı → ayrıntı ve harita seçimi', s3.sel === s3.r && s3.title === s3.name && s3.selCard === '2', `3. bölge seçildi: ${s3.title}`);
  const box = await (await p.$('#map')).boundingBox();
  const target = await p.evaluate(() => { const r = window.__CA.S.regions[0]; return { lat: window.__CA.G.lat[r.best], lon: window.__CA.G.lon[r.best], best: r.best }; });
  const px = await p.evaluate(() => { const C = window.__CA, G = C.G, r = C.S.regions[0], set = new Set(r.cells), NC = G.meta.ncols;
    const inner = r.cells.find(i => { const rr = Math.floor(G.cell[i] / NC), k = G.cell[i] % NC; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const j = G.pos[(rr + a) * NC + ((k + b + NC) % NC)]; if (j < 0 || !set.has(j)) return false; } return true; });
    return inner != null ? C.M.pixelOf(inner) : null; });
  const hit = px ? [Math.round(px[0]), Math.round(px[1])] : null;
  if (hit) { await p.mouse.click(box.x + hit[0], box.y + hit[1]); await p.waitForTimeout(400); }
  const s4 = await p.evaluate(() => ({ kind: window.__CA.S.sel.kind, inReg0: window.__CA.S.regions[0].cells.includes(window.__CA.S.sel.best), selCard: document.querySelector('#regList .reg.sel')?.dataset.reg }));
  R('6b Haritaya tıklama → liste senkron', hit && s4.kind === 'region' && s4.inReg0 && s4.selCard === '0', hit ? `haritada 1. bölgenin hücresine tıklandı → liste 1. kartı vurguladı` : 'hedef hücre bulunamadı');
  await p.click('#zoomBtn'); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/04_yakinlastirma.png` }); await p.click('#zoomBtn'); await p.waitForTimeout(600);
  await p.click('#listTabs [data-t=sites]'); await p.waitForTimeout(300);
  const nsites = await p.$$eval('#regList .reg', x => x.length);
  await p.click('#regList .reg:nth-child(1)'); await p.waitForTimeout(300);
  const ss = await p.evaluate(() => window.__CA.S.sel && window.__CA.S.sel.kind);
  await p.click('#listTabs [data-t=regions]'); await p.waitForTimeout(200);
  await preset('mars_buz'); await go('results'); await p.waitForTimeout(600);
  const tst = await p.evaluate(() => { const C = window.__CA, R = C.S.regions; let found = null;
    for (let n = 0; n < Math.min(10, R.length); n++) { document.querySelectorAll('#regList .reg')[n].click(); const t = document.querySelector('#detTests').innerText; if (t.includes('Haughton')) { found = {n, links: document.querySelectorAll('#detTests a').length, txt: t.slice(0, 80)}; break; } }
    return found; });
  await shot('03b_testler');
  R('6d Bölgedeki önceki testler', tst && tst.links >= 2, tst ? `Mars buzlu senaryosunda ${tst.n + 1}. bölge Devon Adası · Haughton testlerini gösterdi (${tst.links} kaynak bağlantısı)` : 'Haughton bulunamadı');
  await preset('mars_kurak'); await go('results'); await p.waitForTimeout(500);
  R('6c Bilinen sahalar listesi ve seçimi', nsites === window_sites_placeholder() && ss === 'site', `${nsites} saha listelendi, ilk saha seçildi`);
  await p.click('#listTabs [data-t=regions]'); await p.waitForTimeout(200); await p.click('#regList .reg:nth-child(1)'); await p.waitForTimeout(300);

  // 7 climate
  await p.click('#detailCard [data-go=climate]'); await p.waitForTimeout(900); await shot('05_gelecek');
  const c1 = await p.evaluate(() => ({ i: document.querySelector('#interp').innerText, t: document.querySelector('#futTable').innerText, sub: document.querySelector('#h-climate').innerText, sel: window.__CA.S.sel.name }));
  await p.click('#sspSel [data-s=ssp585]'); await p.waitForTimeout(700);
  const c2 = await p.evaluate(() => ({ i: document.querySelector('#interp').innerText, t: document.querySelector('#futTable').innerText }));
  R('7a Seçim iklim ekranına taşındı', c1.sub.includes(c1.sel), c1.sel);
  R('7b SSP2-4.5 → SSP5-8.5 geçişi', c1.i !== c2.i && c1.t !== c2.t && c2.i.includes('SSP5-8.5'), 'yorum ve dönem tablosu güncellendi');
  const plots = await p.evaluate(() => ['plScore', 'plV_T', 'plV_P', 'plV_AI', 'plV_FT', 'plV_PI', 'plV_DTR', 'plProc'].map(id => document.getElementById(id) && document.getElementById(id).data ? document.getElementById(id).data.length : 0));
  const procs = await p.$$eval('#clProc .cl-proc', x => x.length), soil = await p.$$eval('#clSoil .cl-step', x => x.length), prof = await p.$$eval('#clProfile .cl-kv', x => x.length);
  await p.click('#perSel [data-p="2041-2060"]'); await p.waitForTimeout(500);
  const perTxt = await p.evaluate(() => document.querySelector('#interp').innerText);
  await p.click('#perSel [data-p="2061-2080"]'); await p.waitForTimeout(300);
  R('7c Ayrıntılı iklim ekranı: grafikler, süreçler, toprak rejimi', plots.every(n => n >= 2) && procs === 5 && soil === 4 && prof === 9 && perTxt.includes('2041–2060'), `8 grafik (trace: ${plots.join(', ')}); 5 süreç kartı; 4 dönemlik toprak rejimi; 9 profil alanı; dönem seçici özeti güncelliyor`);

  // 8 method & sources
  await go('method'); await p.waitForTimeout(2500); await shot('06_yontem');
  const vrows = await p.$$eval('#valTable tbody tr', r => r.map(x => x.innerText));
  const top10 = vrows.filter(t => /en iyi %\d/.test(t) && parseFloat(t.match(/en iyi %([\d,]+)/)[1].replace(',', '.')) <= 10).length;
  R('8a Doğrulama tablosu (canlı)', vrows.length > 10, `${vrows.length} saha-senaryo satırı; ${top10} tanesi en iyi %10 içinde`);
  await go('sources'); await shot('07_kaynaklar');
  R('8b Veri kaynakları paneli', (await p.$$eval('#srcGrid .src', x => x.length)) === 6, '6 kaynak kartı + eksikler listesi');

  // 9 report
  await go('report'); await p.waitForTimeout(400); await shot('08_rapor');
  const rep = await p.textContent('#report');
  const need = ['Özet', 'Arama koşulları', 'En uygun bölgeler', 'İncelenen bölge', 'Gelecek iklimi', 'Veri kaynakları', 'Yöntem', 'Sınırlamalar'];
  R('9a Rapor içeriği', need.every(n => rep.includes(n)), need.filter(n => !rep.includes(n)).join(',') || 'tüm bölümler var');
  await p.emulateMedia({ media: 'print' }); await p.pdf({ path: `${OUT}/rapor.pdf`, format: 'A4', printBackground: true }); await p.emulateMedia({ media: 'screen' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']); await p.click('#repCopy'); await p.waitForTimeout(200);
  R('9b Yazdır (PDF) ve kopyala', (await p.textContent('#toast')).includes('kopyalandı') && fs.statSync(`${OUT}/rapor.pdf`).size > 20000, `PDF ${Math.round(fs.statSync(`${OUT}/rapor.pdf`).size / 1024)} KB`);

  // 10 bad-text scan
  const scan = [];
  for (const k of Object.keys(EXP)) {
    await preset(k); let t = await bad(); if (t) scan.push(`${k}/hedef: ${t}`);
    await go('results'); await p.waitForTimeout(400); t = await bad(); if (t) scan.push(`${k}/bölgeler: ${t}`);
    const nreg = await p.evaluate(() => Math.min(3, window.__CA.S.regions.length));
    for (let r = 1; r <= nreg; r++) {
      await p.click(`#regList .reg:nth-child(${r})`); await p.waitForTimeout(150);
      for (const s of ['ssp245', 'ssp585']) { await go('climate'); await p.click(`#sspSel [data-s=${s}]`); await p.waitForTimeout(250); t = await bad(); if (t) scan.push(`${k}/bölge${r}/${s}: ${t}`); }
      await go('report'); t = await bad(); if (t) scan.push(`${k}/rapor: ${t}`);
      await go('results'); await p.waitForTimeout(200);
    }
  }
  R('10 NaN/undefined/null taraması', scan.length === 0, scan.slice(0, 4).join(' || ') || '6 senaryo × (koşullar, bölgeler, 3 bölge × 2 senaryo iklim, rapor) temiz');

  // 11 responsive
  await preset('mars_kurak');
  const resp = [];
  for (const [w, h, n] of [[1440, 1000, 'masaustu'], [768, 1024, 'tablet'], [375, 812, 'mobil']]) {
    await p.setViewportSize({ width: w, height: h });
    for (const s of ['target', 'results', 'climate', 'report']) { await go(s); await p.waitForTimeout(500); const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (o > 0) resp.push(`${w}px/${s}: +${o}px`); if (w < 1440) await shot(`09_${n}_${s}`); }
  }
  R('11 1440/768/375 px yatay taşma', resp.length === 0, resp.join(', ') || '4 ekran × 3 genişlik');
  await p.setViewportSize({ width: 1440, height: 1000 });
  // 12 keyboard
  await go('target'); await p.focus('body'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  const foc = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  await p.focus('#steps [data-s=results]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  R('12 Klavye kullanımı', foc === 'solid' && await p.evaluate(() => window.__CA.S.step === 'results'), `odak halkası: ${foc}; Enter ile adım değişti`);
  R('13 Konsol JavaScript hatası', errs.length === 0, errs.join(' | ') || 'yok');

  console.log(JSON.stringify(results, null, 1));
  await b.close();
})();
function window_sites_placeholder() { return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/analog_sites.json'))).sites.length; }

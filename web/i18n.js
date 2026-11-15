/* AnalogAtlas · dil seçeneği (Türkçe / English)
   Türkçe metinler kaynakta (template.html, app.js) olduğu gibi durur; burada yalnızca İngilizce karşılıklar var.
   - static: data-i18n / data-i18n-title / data-i18n-aria / data-i18n-tip öznitelikli sabit arayüz öğeleri
   - lith, sites, tags…: gömülü verideki Türkçe adların İngilizcesi (ülke ve bölge adları window.I18N_NAMES'tan gelir)
   Seçim tarayıcıda hatırlanır; ?lang=en veya ?lang=tr adres parametresi de kullanılabilir. */
window.I18N = (() => {
  const KEY = 'analogatlas_lang';
  const SVG = id => `<svg class="ic"><use href="#i-${id}"/></svg>`;
  const EN = {
    title: 'AnalogAtlas · Earth regions resembling Mars and Moon conditions',
    static: {
      brandAria: 'AnalogAtlas home',
      tagline: 'Earth regions resembling Mars and Moon conditions',
      navAria: 'Analysis steps',
      step1: 'Target<span class="long"> conditions</span>',
      step2: 'Suitable<span class="long"> regions</span>',
      step3: 'Future<span class="long"> climate</span>',
      step4: 'Report',
      srcTitle: 'Data sources', srcLbl: 'Data sources',
      methTitle: 'Method and validation', methLbl: 'Method',
      loading: '<b>Loading data…</b><p class="muted small">Unpacking the 95,000-cell global grid.</p>',
      tgtH1: 'Which conditions are you looking for?',
      tgtP: 'Enter target values that are achievable on Earth for a site resembling Mars or the Moon. The system scans Earth\'s land surface in 0.5° (~55 km) cells and finds the regions that best match these targets.',
      quick: 'Quick start <i class="info" tabindex="0" data-tip="Fills the form with a ready-made scenario. You can then change any value.">i</i>',
      critHead: '<span>Parameter</span><span>Target range (min – max)</span><span>Importance</span><span>Required</span>',
      noiceLbl: '<b>Exclude permanent ice cover.</b> Cells dominated by the MODIS snow/ice class or the GLiM glacier class are not searched. Recommended; otherwise the Antarctic and Greenland ice sheets come out on top.',
      clearAll: 'Clear all',
      sumH: 'Search summary', sumCellsLbl: 'suitable cells', sumRegLbl: 'regions',
      showRegions: SVG('search') + 'Show suitable regions',
      resH1: 'Suitable regions',
      backTarget: SVG('back') + 'Change conditions',
      mapAria: 'Suitability map. Regions can also be selected from the list.',
      mapHelp: 'Click a location to inspect it',
      sitesBtn: SVG('pin') + 'Known sites',
      legend: '<b style="color:var(--text)">Suitability</b><div class="ramp"></div><div style="display:flex;justify-content:space-between" class="num"><span>0</span><span>100</span></div><div class="row"><span class="dot" style="background:#DCD6CB"></span>Fails a required condition / ice</div><div class="row"><span class="dot" style="background:#fff;border:2px solid #30352F"></span>Known analog site</div>',
      tabRegions: 'Best regions', tabSites: 'Known analog sites',
      toClimate: SVG('chart') + 'Explore this region\'s future climate',
      testsLbl: 'Earlier tests in this region',
      climBack: SVG('back') + 'Back to regions',
      climRegionHead: '<h2>Region</h2><div class="sub">Analysed area and surface properties held constant</div>',
      clMapAria: 'Location of the selected region',
      sspLbl: 'Emission scenario <i class="info" tabindex="0" data-tip="IPCC AR6 Shared Socioeconomic Pathways. SSP2-4.5 intermediate, SSP5-8.5 very high emissions. A scenario for comparison, not a probability.">i</i>',
      ssp245btn: 'SSP2-4.5 · intermediate', ssp585btn: 'SSP5-8.5 · high',
      perLbl: 'Analysis period <i class="info" tabindex="0" data-tip="20-year period used in the summary and process analysis. Charts show all periods. The 2061–2080 period includes the year 2076.">i</i>',
      sumHead: '<h2>Summary</h2>',
      varsHead: '<h2>How is the climate changing?</h2><div class="sub">Each chart shows the reference period (1970–2000) and three future periods. Thick line: selected scenario; dotted line: the other scenario; shading: range of the three climate models (temperature and precipitation only).</div>',
      procHead: '<h2>What does this change alter at the surface?</h2><div class="sub">Relative change, compared with the reference, in the rates of soil formation, rock breakdown, erosion and landform preservation. An indicator of direction and magnitude, not an absolute rate.</div>',
      expBadge: 'experimental indicator',
      soilHead: '<h2>Soil formation regime</h2><div class="sub">Climate-driven soil and surface mineralogy regime, by period</div>',
      fitHead: '<h2>Fit to your target conditions</h2><div class="sub">Are your search conditions still met in this region in the future?</div>',
      methClHead: '<h2>How was the projection made, and how reliable is it?</h2>',
      toReport: SVG('doc') + 'Create report',
      repHead: '<h1 id="h-report">Report</h1><p>Search conditions, regions found and climate projection in one document.</p>',
      repCopy: SVG('copy') + 'Copy text',
      repPrint: SVG('print') + 'Print / save as PDF',
      methHead: '<h1 id="h-method">Method and validation</h1><p>How is the score calculated, how were the data processed, and can the system find known analog sites?</p>',
      valHead: '<h2>Validation: do known sites rank near the top?</h2><div class="sub">Each preset scenario was run, and the score of the known sites of that scenario type and their rank among suitable cells were calculated (live, in this browser).</div>',
      srcHead: '<h1 id="h-sources">Data sources</h1><p>The app works offline: the data below were downloaded in advance, processed onto the 0.5° grid and embedded in this file.</p>'
    },
    lith: ['unknown', 'unconsolidated sediments', 'basic volcanic', 'siliciclastic sedimentary', 'basic plutonic', 'mixed sedimentary', 'carbonate', 'acid volcanic', 'metamorphic', 'acid plutonic', 'intermediate volcanic', 'water', 'pyroclastic', 'intermediate plutonic', 'evaporite', 'no data', 'ice/glacier'],
    tags: {mars_kurak: 'Mars · arid/regolith', mars_buz: 'Mars · icy/periglacial', mars_volkanik: 'Mars · volcanic', mars_sulu: 'Mars · aqueous/evaporite/hydrothermal', ay: 'Moon · volcanic/regolith', krater: 'Impact crater', egitim: 'Astronaut/field training'},
    test_levels: {ajans: 'Space agency test / training', bilim: 'Scientific analog research', yok: 'No recorded test found'},
    test_note: 'Test history compiled from a web survey in November 2026; every record is given with a source link. "Not found" does not mean no test was ever carried out.',
    site_note: 'Sites used as planetary analogs in the literature. Coordinates are approximate (±0.1–0.3°) centre points; parameter values are taken from the 0.5° grid cell in which the site falls, not from site measurements.',
    /* site id → {name, country, ref, tests: [[year, organisation, what], …]} (test order as in data/analog_sites.json) */
    sites: {
      atacama_yungay: {name: 'Atacama Desert (Yungay)', country: 'Chile', ref: 'Navarro-González et al. 2003, Science', tests: [
        ['2003–2005', 'NASA ASTEP · Carnegie Mellon · SETI', 'Life in the Atacama (LITA): long-distance driving and life-detection tests with the autonomous rover Zoë.'],
        ['2016–2019', 'NASA Ames', 'ARADS: field trials of a rover-mounted drill, sample transfer and life-detection instruments for Mars.']]},
      pampa_joya: {name: 'Pampa de La Joya', country: 'Peru', ref: 'Valdivia-Silva et al. 2011', tests: [
        ['2004–2008', 'Valdivia-Silva et al. (with NASA Ames)', 'Climate and chemistry observations of Viking-like hyper-arid soils; multi-year study as a Mars soil analog.']]},
      mcmurdo_dry: {name: 'McMurdo Dry Valleys', country: 'Antarctica', ref: 'Marchant & Head 2007, Icarus', tests: [
        ['1960s–1970s', 'NASA (Viking preparation)', 'Research on microbial life in Dry Valley soils; provided input to the design of the Viking life experiments.']]},
      untersee: {name: 'Lake Untersee', country: 'Antarctica', ref: 'Andersen et al. 2011', tests: [
        ['2008–present', 'NASA astrobiology support · D. Andersen (SETI)', 'Biosignature and habitability research in the ice-covered lake and its sediments; regular field seasons.']]},
      devon_haughton: {name: 'Devon Island · Haughton', country: 'Canada', ref: 'Lee & Osinski 2005; Haughton-Mars Project', tests: [
        ['1997–', 'NASA Haughton-Mars Project · Mars Institute · SETI', 'Tests of a robotic arm, rovers, drills, camera/spectrometer/radar and field spacesuits for Mars; pressurised rover driving simulations.'],
        ['2010', 'NASA Ames (K10) · NASA JSC', 'HMP-2010: exploration scenarios with the K10 robots (lidar, ground-penetrating radar, spectrometer).'],
        ['2013', 'Canadian Space Agency · Western Univ.', 'Geology field training of astronaut Jeremy Hansen.']]},
      axel_heiberg: {name: 'Axel Heiberg Island', country: 'Canada', ref: 'Andersen et al. 2002', tests: [
        ['2010', 'McGill Univ. · Canadian Space Agency support', 'Methane-consuming bacteria at the Lost Hammer spring; an analog of possible cold springs on Mars.']]},
      svalbard_bockfjorden: {name: 'Svalbard · Bockfjorden (AMASE)', country: 'Norway', ref: 'Steele et al. 2007 (AMASE)', tests: [
        ['2003–', 'AMASE (NASA · ESA · Carnegie)', 'Arctic Mars Analog Svalbard Expedition: field tests of Mars instruments and sampling protocols.'],
        ['2008', 'NASA / JPL (MSL team)', 'Field trial with prototypes of Curiosity\'s CheMin and SAM instruments.']]},
      iceland_askja: {name: 'Iceland · Askja', country: 'Iceland', ref: 'Apollo geology training 1965–67', tests: [
        ['1965, 1967', 'NASA · USGS', 'Geology training of Apollo astronauts in volcanic terrain.']]},
      iceland_holuhraun: {name: 'Iceland · Holuhraun', country: 'Iceland', ref: 'Voigt et al. 2017', tests: [
        ['2019', 'SAND-E (NASA PSTAR support)', 'Mars 2020 preparation: semi-autonomous navigation and exploration of sedimentary environments with a rover and a drone.']]},
      mauna_kea: {name: 'Hawaii · Mauna Kea (PISCES)', country: 'USA', ref: 'NASA ISRU field tests 2008–2012', tests: [
        ['2008, 2010, 2012', 'NASA · PISCES · CSA', 'In-situ resource utilisation (ISRU) field tests for the Moon; RESOLVE rover prototype.']]},
      hiseas: {name: 'Hawaii · Mauna Loa (HI-SEAS)', country: 'USA', ref: 'HI-SEAS habitat studies', tests: [
        ['2013–2018', 'Univ. of Hawaii · NASA funding', 'HI-SEAS I–VI: isolated Mars habitat missions of 4 to 12 months (nutrition, psychology, crew dynamics).']]},
      kau_desert: {name: 'Hawaii · Ka\'ū Desert', country: 'USA', ref: 'Seelos et al. 2010', tests: [
        ['2016–2017', 'NASA BASALT', 'Science-driven Mars EVA operations simulations on the Kīlauea lava fields.']]},
      mdrs: {name: 'Utah · MDRS (Hanksville)', country: 'USA', ref: 'Mars Society MDRS', tests: [
        ['2001–present', 'Mars Society', 'Mars Desert Research Station: hundreds of crew rotations, habitat and EVA simulations.']]},
      death_valley: {name: 'Death Valley', country: 'USA', ref: 'Baker et al. 2003', tests: [
        ['2012', 'NASA / JPL', 'Driving trials of the Curiosity test rover Scarecrow on the Mojave Dumont Dunes (in the region).'],
        ['various', 'NASA · National Park Service', 'Mars technology and remote-sensing tests in Death Valley.']]},
      black_point: {name: 'Arizona · Black Point Lava Flow (Desert RATS)', country: 'USA', ref: 'NASA Desert RATS 2008–2011', tests: [
        ['2008–2011', 'NASA Desert RATS', 'Moon/Mars surface operations simulations with the pressurised Space Exploration Vehicle (SEV), habitats and robots.']]},
      meteor_crater: {name: 'Arizona · Meteor Crater', country: 'USA', ref: 'Shoemaker 1963; Kring 2007', tests: [
        ['1960s–1972', 'NASA · USGS', 'Crater geology and sampling training for Apollo astronauts.'],
        ['2008–', 'Lunar and Planetary Institute', 'Field training supporting the Constellation and Artemis programmes.']]},
      craters_moon_id: {name: 'Idaho · Craters of the Moon', country: 'USA', ref: 'Hughes et al. 2019 (FINESSE)', tests: [
        ['1969', 'NASA', 'Volcanic geology training of the Apollo 14 astronauts.'],
        ['2016', 'NASA BASALT · FINESSE', 'Mars EVA simulations and research on volcanic processes.']]},
      pavilion: {name: 'Pavilion Lake', country: 'Canada', ref: 'Lim et al. 2011 (PLRP)', tests: [
        ['2004–2011', 'NASA · Canadian Space Agency', 'Pavilion Lake Research Project: exploration of microbialites with DeepWorker submersibles; astronaut operations trials.']]},
      rio_tinto: {name: 'Rio Tinto', country: 'Spain', ref: 'Fernández-Remolar et al. 2005', tests: [
        ['2003–2005', 'NASA · CAB (Spain)', 'MARTE: simulation of automated drilling and sample handling to search for subsurface life on Mars.']]},
      lanzarote: {name: 'Lanzarote (PANGAEA)', country: 'Spain', ref: 'ESA PANGAEA training', tests: [
        ['2016–present', 'ESA PANGAEA', 'Moon/Mars geology training for astronauts and engineers.']]},
      teide: {name: 'Tenerife · Teide', country: 'Spain', ref: 'ExoMars instrument tests', tests: [
        ['2010s', 'Univ. of Valladolid (ExoMars RLS team)', 'Raman spectroscopy studies on volcanic analog rocks.']]},
      dallol: {name: 'Danakil · Dallol', country: 'Ethiopia', ref: 'Cavalazzi et al. 2019', tests: [
        ['2016–2018', 'Europlanet', 'Multidisciplinary field campaigns in a hyper-acidic, saline hydrothermal environment (Mars and Titan analog).']]},
      namib: {name: 'Namib Desert (Gobabeb)', country: 'Namibia', ref: 'Warren-Rhodes et al. 2013', tests: []},
      pilbara: {name: 'Pilbara (Dresser)', country: 'Australia', ref: 'Van Kranendonk et al. 2008', tests: [
        ['2019', 'NASA · ESA · UNSW', 'Biosignature recognition training on stromatolites for the Mars 2020 and ExoMars science teams.']]},
      arkaroola: {name: 'Arkaroola', country: 'Australia', ref: 'Mars Society Australia', tests: [
        ['2009', 'NASA Spaceward Bound · Mars Society Australia', 'Mars analog field expedition with teachers and students.']]},
      qaidam: {name: 'Qaidam Basin', country: 'China', ref: 'Xiao et al. 2017', tests: [
        ['2017', 'Chinese Academy of Sciences · Haixi administration', 'A plan to build a Mars simulation base at Da Qaidam (Qinghai) was announced.']]},
      ladakh: {name: 'Ladakh · Tso Kar', country: 'India', ref: 'Pandey et al. 2020', tests: [
        ['2016', 'NASA Spaceward Bound India', 'Mars analog field expedition in Ladakh.'],
        ['2025', 'ISRO', 'HOPE analog mission: 10-day isolated habitat and human endurance simulation in the Tso Kar valley.']]},
      uyuni: {name: 'Salar de Uyuni', country: 'Bolivia', ref: 'Evaporite analog studies', tests: []},
      sudbury: {name: 'Sudbury', country: 'Canada', ref: 'Artemis geology training', tests: [
        ['1971', 'NASA', 'Impact crater geology training of the Apollo 16 astronauts.']]},
      ries: {name: 'Nördlinger Ries', country: 'Germany', ref: 'Apollo 14 and ESA training', tests: [
        ['1970', 'NASA', 'Impact crater geology training of the Apollo 14 astronauts.']]},
      lonar: {name: 'Lonar Crater', country: 'India', ref: 'Fredriksson 1973', tests: [
        ['2024', 'Univ. of Freiburg · IIT', 'A crater in basalt target rock, studied as an analog of Martian craters with double-layered ejecta.']]}
    }
  };

  const initial = (() => {
    try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'tr') return q; } catch (e) { /* yok */ }
    try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'tr'; } catch (e) { return 'tr'; }
  })();
  const save = lang => { try { localStorage.setItem(KEY, lang); } catch (e) { /* depolama kapalıysa yalnızca bu oturum */ } };

  /* sabit arayüz: Türkçe özgün içerik ilk çağrıda saklanır, İngilizce sözlükten yazılır */
  let trTitle = null;
  const ATTRS = [['data-i18n-title', 'title'], ['data-i18n-aria', 'aria-label'], ['data-i18n-tip', 'data-tip']];
  function applyStatic(lang) {
    if (trTitle == null) trTitle = document.title;
    document.title = lang === 'en' ? EN.title : trTitle;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (el.__tr == null) el.__tr = el.innerHTML;
      const en = EN.static[el.getAttribute('data-i18n')];
      el.innerHTML = lang === 'en' && en != null ? en : el.__tr;
    });
    for (const [a, attr] of ATTRS) document.querySelectorAll(`[${a}]`).forEach(el => {
      el.__trA = el.__trA || {}; if (el.__trA[attr] == null) el.__trA[attr] = el.getAttribute(attr) || '';
      const en = EN.static[el.getAttribute(a)];
      el.setAttribute(attr, lang === 'en' && en != null ? en : el.__trA[attr]);
    });
    document.querySelectorAll('#langSw button').forEach(b => { const on = b.dataset.lang === lang; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  }
  if (initial === 'en') applyStatic('en');   // yükleniyor mesajı da seçili dilde görünsün
  return {EN, initial, save, applyStatic, names: window.I18N_NAMES || {countries: [], regions: []}};
})();

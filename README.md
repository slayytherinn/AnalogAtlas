# AnalogAtlas

**Mars ve Ay koşullarına benzeyen Dünya bölgelerini bulan, çevrimdışı çalışan bir araştırma aracı.**
*An offline research tool that finds Earth regions resembling Mars and Moon conditions.*

🌐 **Canlı demo / Live demo:** https://slayytherinn.github.io/AnalogAtlas/krater_analog.html

---

## Nedir?

Uzay ajansları rover, astronot ekipmanı ve yaşam arama cihazlarını Atacama Çölü, Antarktika Kuru Vadileri, Devon Adası ve İzlanda gibi **gezegen analoğu** sahalarda test eder. AnalogAtlas bu sahaların seçimini nicel ve tekrarlanabilir hale getirir:

- Kullanıcı aradığı ortamın **koşullarını** girer: sıcaklık, yağış, kuraklık, gün içi sıcaklık farkı, donma-çözülme, permafrost, rüzgâr, çıplak yüzey, rakım, rölyef ve kaya türü.
- Sistem tüm Dünya karalarını **0,5°'lik (~55 km) 95.447 hücrede** tarar ve her hücreye 0–100 arası uygunluk puanı verir.
- Uygun hücreleri **bölgeler** halinde gruplar ve adlandırır.
- Seçilen bölgenin iklimini **CMIP6** senaryolarıyla (SSP2-4.5, SSP5-8.5) **2080'e kadar** gösterir ve hedef koşulların gelecekte de karşılanıp karşılanmadığını hesaplar.

## Hızlı başlangıç

**`krater_analog.html` dosyasını indirip çift tıklayın.** Kurulum ve internet gerekmez; tüm veri dosyanın içine gömülüdür. Güncel Chrome, Edge, Firefox veya Safari önerilir. Dosya yaklaşık 14,7 MB'tır ve 1–2 saniyede açılır.

Sağ üstteki **TR | EN** düğmesiyle arayüz dili Türkçe ve İngilizce arasında değiştirilebilir. Seçim tarayıcıda hatırlanır; adrese `?lang=en` veya `?lang=tr` eklenerek de dil seçilebilir.

## Kullanım: dört adım

| Adım | Ne yaparsınız | Ne alırsınız |
|---|---|---|
| **1 · Hedef koşullar** | Hazır bir senaryo seçin (Mars kurak, Mars buzlu, Mars volkanik, Mars evaporit, Ay regolit, Ay soğuk) veya her parametre için hedef aralık, önem ve "zorunlu" işareti girin. Her satırda Mars ve Ay referans değeri yazar. | Canlı arama özeti: kaç hücre ve bölge uyuyor, en uygun bölge. |
| **2 · Uygun bölgeler** | Haritada veya listede bir bölgeye tıklayın. "Bilinen analog sahaları" sekmesinde 31 literatür sahasının puanını görün. | Uygunluk haritası, en uygun 10 bölge, koşul koşul uyum tablosu ve bölgede daha önce yapılan saha testleri. |
| **3 · Gelecek iklimi** | Senaryo (SSP2-4.5 / SSP5-8.5) ve analiz dönemi (2021–40, 2041–60, 2061–80) seçin. | Bölge profili, gerekçeli özet, altı iklim değişkeni grafiği, yüzey süreçleri analizi, toprak oluşum rejimi ve hedef uyum tablosu. |
| **4 · Rapor** | Yazdırın, PDF olarak kaydedin veya metni kopyalayın. | Koşullar, bölgeler, iklim projeksiyonu, kaynaklar, yöntem ve sınırlamalar tek belgede. |

Sağ üstteki **Veri kaynakları** ve **Yöntem** ekranlarında her verinin kaynağı, puan formülü ve bilinen sahalarla canlı doğrulama tablosu yer alır.

## Yöntem (özet)

- **Uygunluk puanı:** Değer hedef aralıktaysa 1; dışındaysa Gauss cezasıyla azalır, `s = exp(−(d/τ)²)`. Yağış ve kuraklık indeksi logaritmik ölçekte karşılaştırılır. Toplam puan önem ağırlıklı ortalamadır (düşük 1, orta 2, yüksek 3). Zorunlu koşulu karşılamayan hücreler elenir.
- **Bölge bulma:** Uyarlanabilir eşiği geçen komşu hücreler 8-komşuluk bağlı bileşen analiziyle gruplanır.
- **Kuraklık indeksi:** P/PET; PET, FAO-56 dünya dışı radyasyonuyla Hargreaves yöntemiyle hesaplanır.
- **Donma-çözülme:** Aylık normallerden, günlük sıcaklıkların normal dağıldığı varsayımıyla (σ = 5 °C, NASA POWER günlük verisiyle kalibre edildi).
- **Gelecek iklimi:** WorldClim CMIP6 ürünleri (MRI-ESM2-0, MPI-ESM1-2-HR, IPSL-CM6A-LR); türetilen göstergeler için delta yöntemi; üç modelin ortalaması ve aralığı.
- **Yüzey süreçleri (deneysel):** Arrhenius kimyasal ayrışma, Renard & Freimund yağış erozivitesi, Lancaster kum hareketliliği; göreli oranlar olarak.

Ayrıntılar için `BILIMSEL_SINIRLAMALAR.md` dosyasına ve uygulamadaki **Yöntem** ekranına bakın.

## Veri kaynakları

| Veri | Kaynak |
|---|---|
| Referans iklim | WorldClim v2.1, 1970–2000 (Fick & Hijmans 2017) |
| Gelecek iklimi | WorldClim CMIP6 ölçek küçültülmüş ürünleri; 3 model × 2 senaryo × 3 dönem |
| Çıplak yüzey ve buz | MODIS MCD12 IGBP 2023 (NASA GIBS) |
| Kaya türü | GLiM 0,5° (Hartmann & Moosdorf 2012) |
| Rakım ve rölyef | WorldClim 10′ rakım |
| Ülke ve bölge adları | Natural Earth 1:50m (Türkçe ve İngilizce) |
| Analog sahaları | Literatürden derlenen 31 saha ve test geçmişleri |

## Klasör yapısı

```
krater_analog.html          Derlenmiş, çevrimdışı çalışan uygulama (bunu açın)
web/template.html, app.js   Arayüz kaynağı (CSS tasarım tokenları template'in başında)
web/i18n.js                 Dil seçeneği: İngilizce arayüz metinleri ve saha çevirileri
web/i18n_names.json         Dil seçeneği: İngilizce ülke ve bölge adları
web/grid.json               0,5° küresel ızgara (tools/build_grid.py üretir)
web/vendor/                 d3, topojson-client, plotly.js, world-atlas (yerel kopyalar)
data/analog_sites.json      31 bilinen analog sahası (literatür, yaklaşık koordinat)
data/presets.json           Hazır senaryolar (Python doğrulaması için; app.js ile aynı)
data/processed/             0,5°'ye indirgenmiş girdiler (ham veri olmadan yeniden üretim için)
tools/build_grid.py         Ham/işlenmiş veriler → web/grid.json
tools/make_i18n_names.py    Natural Earth → web/i18n_names.json (İngilizce adlar)
tools/reduce_cmip.py        WorldClim CMIP6 bioc GeoTIFF → 0,5° npz
tools/decode_landcover.py   GIBS MODIS IGBP PNG → çorak/buz payı
tools/scoring.py            Puan formülünün Python karşılığı (JavaScript ile birebir)
tools/make_expected.py      JS–Python eşitlik testi için beklenen değerler
tests/test_ui.js            Otomatik arayüz testi (Playwright)
legacy/model_v4.json        Eski krater sürümünün modeli; yalnızca donma-çözülme kalibrasyonunda kullanılır
build.py                    Her şeyi tek HTML dosyasında birleştirir
```

## Yeniden derleme

Yalnızca arayüzü değiştirdiyseniz:

```
python build.py
```

Izgarayı paketteki işlenmiş verilerden yeniden üretmek için (internet gerekmez):

```
pip install -r requirements.txt
python tools/build_grid.py /yok web/grid.json data/analog_sites.json
python tools/make_i18n_names.py
python build.py
```

Derleme deterministiktir: aynı girdiler bayt bayt aynı dosyaları üretir.

### Ham veriden baştan üretim (isteğe bağlı)

Aşağıdaki dosyaları indirip `raw/` klasörüne koyun ve `python tools/build_grid.py raw web/grid.json data/analog_sites.json` komutunu çalıştırın:

- WorldClim v2.1 10′: `wc2.1_10m_{bio,tmin,tmax,prec,wind,elev}.zip` → `raw/wc_bio/`, `raw/wc_tmin/` … klasörlerine açın (https://www.worldclim.org/data/worldclim21.html)
- WorldClim CMIP6 10′ `bioc` dosyaları: MRI-ESM2-0, MPI-ESM1-2-HR, IPSL-CM6A-LR × ssp245, ssp585 × 2021-2040, 2041-2060, 2061-2080 (https://www.worldclim.org/data/cmip6/cmip6_clim10m.html) → `python tools/reduce_cmip.py <klasör> raw/cmip05`
- GLiM 0,5°: https://doi.org/10.1594/PANGAEA.788537 → `raw/glim_wgs84_0point5deg.txt.asc`
- MODIS IGBP 2023 (GIBS) → `tools/decode_landcover.py` açıklamasındaki adresler → `raw/lc05.npz`
- Natural Earth 1:50m ülke ve coğrafi bölge GeoJSON'ları → `raw/ne_countries.geojson`, `raw/ne_regions.geojson`

## Testler

```
npm i playwright && npx playwright install chromium
python tools/make_expected.py
node tests/test_ui.js
```

22 otomatik test; internetsiz çalışma, JavaScript–Python puan eşitliği, hazır senaryolar, giriş doğrulama, harita ve liste etkileşimi, iklim ekranı, rapor, mobil görünüm, klavye kullanımı ve konsol hatalarını kapsar.

## Sınırlamalar

AnalogAtlas **bölgesel bir ön tarama aracıdır**, saha seçimi aracı değildir. 55 km çözünürlükte küçük lav sahaları, buzsuz vadiler veya tuz düzlükleri hücre ortalamasında kaybolabilir. Gelecek değerleri üç iklim modeline dayanan senaryo projeksiyonlarıdır, tahmin değildir. Puan göreceli bir ölçüdür: 100 puan "Mars'ın aynısı" değil, "girilen hedeflerin hepsi karşılandı" anlamına gelir. Tam liste için `BILIMSEL_SINIRLAMALAR.md` dosyasına bakın.

---

## English summary

AnalogAtlas scans all of Earth's land surface on a 0.5° (~55 km) grid of 95,447 cells and scores each cell against user-defined target conditions (temperature, precipitation, aridity, diurnal range, freeze–thaw, permafrost, wind, bare surface, elevation, relief, rock type). Suitable cells are grouped into named regions, and each region's climate is projected to 2080 under CMIP6 scenarios (SSP2-4.5, SSP5-8.5) to show whether the target conditions will still be met.

- **Run it:** download `krater_analog.html` and open it in a modern browser. No installation or internet connection required.
- **Language:** switch between Turkish and English with the **TR | EN** button (or add `?lang=en` to the URL).
- **Data:** WorldClim v2.1 and CMIP6, MODIS IGBP 2023, GLiM, Natural Earth, and 31 literature analog sites with their field-test history.
- **Method:** Gaussian-penalty weighted scoring, connected-component region grouping, Hargreaves PET aridity index, probabilistic freeze–thaw estimate, delta-method climate projection with a three-model ensemble.

This is a regional pre-screening tool, not a site-selection tool. Future values are scenario projections, not forecasts.

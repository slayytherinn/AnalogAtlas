# Test sonuçları · CraterAnalog Bölge sürümü

Tarih: 15 Kasım 2026 · Ortam: Linux, Chromium (Playwright, headless), Python 3.13
Testler, paket boş bir klasöre açılıp ızgara ve HTML yeniden üretildikten sonra orada çalıştırıldı.

## 1. Otomatik arayüz testi (`tests/test_ui.js`)

Sonuç: **28 / 28 başarılı.** Tüm dış ağ istekleri engelliyken çalıştırıldı. Canlı gözlem testleri (14a–14e) ayrı bir tarayıcı bağlamında, Open-Meteo ve NASA POWER adresleri sahte (mock) yanıtlarla taklit edilerek; test 15 ise 15 Kasım 2026'da gerçek API'lerden alınmış yıllık değerlerle (`tests/real_era5_merra2.json`) yapıldı.

| Sonuç | Test | Ayrıntı |
|---|---|---|
| ✅ | 1 İlk açılış hatasız | açılış 1618 ms; 95 bin hücre çözüldü |
| ✅ | 2 İnternetsiz çalışma | tüm dış istekler engelliyken çalıştı, hiç istek yok |
| ✅ | 3 Puan JS = Python referansı | 5880 hücre-puan karşılaştırıldı, en büyük fark 3.6e-8; uygun hücre sayıları aynı (mars_kurak: 6961, mars_buz: 15142, mars_volkanik: 3924, mars_sulu: 66774, ay_regolit: 66774, ay_soguk: 66774) |
| ✅ | 4 Altı hazır senaryo sonuç üretiyor | 6 bölge (1.: Tarım Havzası) · 23 bölge (1.: Kraliçe Elizabet Adaları) · 26 bölge (1.: Altiplano) · 66 bölge (1.: Sahra Atlas) · 83 bölge (1.: Isabela) · 26 bölge (1.: 77,8°, 91,8°) |
| ✅ | 5a Kendi koşullarını girme | temizle → 0 koşul, koşulsuz geçiş engellendi; P ≤ 150, T ≤ 5 girildi → 66774 uygun hücre |
| ✅ | 5b Geçersiz değer kontrolü | abc → "Sayı bekleniyor. Ondalık için virgül veya nokta kullanı" / 999 → "Yıllık ortalama sıcaklık için geçerli aralık -60–35 °C." / -80 → "Yıllık ortalama sıcaklık için geçerli aralık -60–35 °C." / en az 3 > en çok −5 → ""En az" (3,0) değeri "en çok" (-5,0) değerinden bü" / hatalıyken geçiş engellendi: true |
| ✅ | 5c Zorunlu koşul ve kaya türü seçimi | zorunlu çıplak yüzey ≥ %70: 66774 → 7461 hücre; bazik volkanik seçildi, önem otomatik "orta" |
| ✅ | 6a Bölge kartı → ayrıntı ve harita seçimi | 3. bölge seçildi: Atacama Çölü |
| ✅ | 6b Haritaya tıklama → liste senkron | haritada 1. bölgenin hücresine tıklandı → liste 1. kartı vurguladı |
| ✅ | 6d Bölgedeki önceki testler | Mars buzlu senaryosunda 1. bölge Devon Adası · Haughton testlerini gösterdi (4 kaynak bağlantısı) |
| ✅ | 6c Bilinen sahalar listesi ve seçimi | 31 saha listelendi, ilk saha seçildi |
| ✅ | 7a Seçim iklim ekranına taşındı | Tarım Havzası |
| ✅ | 7b SSP2-4.5 → SSP5-8.5 geçişi | yorum ve dönem tablosu güncellendi |
| ✅ | 7c Ayrıntılı iklim ekranı: grafikler, süreçler, toprak rejimi | 8 grafik (trace: 2, 4, 4, 2, 2, 2, 2, 2); 5 süreç kartı; 4 dönemlik toprak rejimi; 9 profil alanı; dönem seçici özeti güncelliyor |
| ✅ | 8a Doğrulama tablosu (canlı) | 39 saha-senaryo satırı; 12 tanesi en iyi %10 içinde |
| ✅ | 8b Veri kaynakları paneli | 7 kaynak kartı (canlı gözlem kartı dahil) + eksikler listesi |
| ✅ | 9a Rapor içeriği | tüm bölümler var |
| ✅ | 9b Yazdır (PDF) ve kopyala | PDF 125 KB |
| ✅ | 10 NaN/undefined/null taraması | 6 senaryo × (koşullar, bölgeler, 3 bölge × 2 senaryo iklim, rapor) temiz |
| ✅ | 11 1440/768/375 px yatay taşma | 4 ekran × 3 genişlik |
| ✅ | 12 Klavye kullanımı | odak halkası: solid; Enter ile adım değişti |
| ✅ | 13 Konsol JavaScript hatası | yok |
| ✅ | 14a Canlı gözlem: indirme, tablo, grafik, eğilim | açılışta istek yok (0); düğmeyle 2 istek (ERA5 + MERRA-2), yalnızca koordinat ve tarih parametreleri; 7 tablo satırı; grafik trace 5/4; sahte veride eğilim +0,30 °C/10 yıl doğru bulundu; kontrol uyumlu |
| ✅ | 14b Senaryo değişimi ve rapor | SSP değişince yeniden indirme yok, tablo güncellendi; rapora gözlem bölümü eklendi |
| ✅ | 14c Kaynak uyuşmazlığı ve yedek kaynak | MERRA-2 serisine 3 °C sıçrama eklenince uyarı çıktı; ERA5 kapalıyken MERRA-2 ile devam etti ve uyardı |
| ✅ | 14d İnternet yokken | anlaşılır hata ve "Tekrar dene"; iklim ekranının geri kalanı çalışıyor |
| ✅ | 14e Canlı bölüm: mobil ve metin taraması | 375 px taşma 0 px; NaN/undefined yok; JS hatası yok |
| ✅ | 15 Gerçek ERA5/MERRA-2 verisiyle görüntüleme | Tarım Havzası: eğilim +0,38 °C / 10 yıl, kontrol uyumlu · Kraliçe Elizabet Adaları: eğilim +0,50 °C / 10 yıl, kontrol uyuşmuyor |

## 2. Ek doğrulamalar

| Sonuç | Test | Ayrıntı |
|---|---|---|
| ✅ | `python build.py` | Sorunsuz; `krater_analog.html` 14,6 MB |
| ✅ | Izgaranın paketteki verilerden yeniden üretimi | `python tools/build_grid.py /yok web/grid.json data/analog_sites.json` → teslim edilen `grid.json` ile bayt bayt aynı; ardından `build.py` → teslim edilen HTML ile bayt bayt aynı |
| ✅ | Deterministik derleme | Art arda iki derleme aynı dosyaları üretiyor |
| ✅ | JS–Python puan eşitliği | 6 senaryo × 490 hücre × (bugün + 2061–80 SSP5-8.5); en büyük fark 10⁻⁷ mertebesinde |
| ✅ | Bilinen saha doğrulaması | Yöntem ekranında canlı: 39 saha–senaryo eşleşmesinin 12'si en iyi %10 içinde; elenenlerin nedeni tabloda yazıyor |
| ✅ | İklim ekranı güncellemesi izolasyonu | `app.js` ve `template.html` içinde iklim bölümü dışında satır farkı yok; `grid.json`, puanlama ve veri dosyaları değişmedi |
| ✅ | Ekran görüntüsü incelemesi | Tüm ekranlar incelendi; bulunan sorunlar (harita üstü öğelerin stilsiz kalması, liste ad tekrarı, kaya türü satırının dar sütunu, grafikte istenmeyen işaretçiler) düzeltildi |

## 3. Yapılamayan / sınırlı testler

- Yalnızca Chromium. Firefox, Safari ve Edge'de elle deneme yapılmadı. Uygulama `DecompressionStream` kullanır (Chrome 80+, Firefox 113+, Safari 16.4+); daha eski tarayıcılar açıklayıcı bir hata mesajı gösterir.
- Gerçek yazıcı diyaloğu değil, tarayıcının PDF çıktısı test edildi.
- Gerçek telefon/tablet ve ekran okuyucu testi yapılmadı. Harita tuvali klavyeyle seçilemez; aynı seçim bölge ve saha listelerinden klavyeyle yapılabilir.
- Gömülü iklim değerleri istasyon verisiyle bağımsız olarak karşılaştırılmadı.

## Canlı veri: gerçek API denemesi (15 Kasım 2026)

Uygulamanın kullandığı istek adresleri ve ayrıştırma kodu, kullanıcının bilgisayarındaki tarayıcıda başka bir siteden (çapraz kaynak) çalıştırıldı:

- **Open-Meteo (ERA5)** ve **NASA POWER (MERRA-2)** çapraz kaynak isteklerine yanıt veriyor; 1981–2025 günlük veri nokta başına ≈ 1,3 MB, 0,5–4,5 saniye.
- Tarım Havzası (41,25° K, 87,25° D): ERA5 1981–2000 → 2016–2025 **+1,1 °C** (eğilim +0,38 °C/10 yıl); CMIP6 beklentisi +1,1 °C (aralık +0,8 … +1,3) → model aralığında. MERRA-2 kontrolü uyumlu.
- Kraliçe Elizabet Adaları (83,25° K): ERA5 **+1,7 °C** (eğilim +0,50 °C/10 yıl); bu hücrede CMIP6 verisi yok, uygulama bunu belirtiyor. MERRA-2 farklı değişim verdiği için "iki kaynak uyuşmuyor" uyarısı çıkıyor.
- Denemede bulunan iki veri sorunu giderildi: Open-Meteo'nun varsayılan "best_match" serisinde 2017'deki model geçişi (rüzgâr, gün içi fark, yağışta sıçrama) → `models=era5` ile homojen seri; MERRA-2'nin Arktik'teki 2000'ler kayması → ERA5 ana kaynak, MERRA-2 kontrol.
- Open-Meteo dakikalık istek sınırı (HTTP 429) gerçek olarak gözlendi; uygulama bu durumda MERRA-2 ile devam edip uyarıyor.

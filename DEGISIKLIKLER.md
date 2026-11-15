# Yapılan değişiklikler · Bölge sürümü

Temel: CraterAnalog Cream Edition (krater tabanlı sürüm).

## Kavramsal değişiklik

- **Eski:** Kullanıcı Mars/Ay krateri ölçüsü girer → 14 Dünya krateri arasından en benzeri bulunur.
- **Yeni:** Kullanıcı aradığı **ortam koşullarını** Dünya ölçeğinde hedef aralıklar olarak girer → tüm Dünya karaları (95.447 hücre, 0,5°) taranır → uygun hücreler bölgelere gruplanır. Krater olma zorunluluğu kalktı.

## Veri

- Yeni küresel veri hattı (`tools/build_grid.py`): WorldClim v2.1 referans iklimi, üç modelli WorldClim CMIP6 projeksiyonu (2 senaryo × 3 dönem), MODIS IGBP çıplak yüzey ve buz payı, GLiM kaya türü, rakım ve rölyef, Natural Earth adları.
- Türetilen göstergeler: Hargreaves PET ile kuraklık indeksi, aylık normallerden donma-çözülme günleri (eski sürümün 14 noktalık günlük verisine kalibre), sıcaklık tabanlı permafrost göstergesi.
- 31 bilinen analog sahası (Atacama, Kuru Vadiler, Devon Adası, İzlanda, Rio Tinto, MDRS, Lanzarote, Qaidam, Dallol…) kaynaklarıyla eklendi.
- Veri, gzip + base64 ile HTML'e gömülür, tarayıcıda `DecompressionStream` ile açılır. Uygulama yine tamamen çevrimdışı.
- Derleme deterministik: aynı girdiler bayt bayt aynı `grid.json` ve HTML üretir.

## Arayüz

- **Ekran 1 · Hedef koşullar:** 6 hazır senaryo; her parametre için en az/en çok, önem (kapalı/düşük/orta/yüksek), zorunlu işareti ve Mars/Ay referans değeri; kaya türü çoklu seçim; permafrost var/yok; buz örtüsünü hariç tutma. Sağda canlı arama özeti.
- **Ekran 2 · Uygun bölgeler:** Uygunluk ısı haritası (bölge seçimi kontürle vurgulanır, yakınlaştırma), en uygun 10 bölge, bilinen sahalar sekmesi, seçili bölgenin koşul koşul uyum tablosu.
- **Ekran 3 · Gelecek iklimi:** Dinamik yorum (hangi koşulun kaybedildiğini/kazanıldığını söyler), dönem tablosu (hedefe uyum renkli, model aralıkları), uygunluk puanı ve sıcaklık/yağış grafikleri.
- **Ekran 4 · Rapor**, **Yöntem** (canlı doğrulama tablosu dahil) ve **Veri kaynakları** ekranları yeniden yazıldı.

## Kaldırılan tekrarlar ve gereksiz öğeler

- Üst bilgi çubuğu (seçimleri her ekranın kendi başlığı zaten gösteriyordu) kaldırıldı.
- "Adım 1/4" etiketleri (üst gezinme zaten gösteriyor) ve "nasıl çalışır" şeridi kaldırıldı.
- İklim ekranında aynı sayıları üç kez gösteren kart + tablo + yıl kartları üçlüsü tek tabloya indirildi.
- Bölge kartlarında tüm koşulları tek tek listeleyen etiketler yerine "✓ 6/6 koşul" ve yalnızca karşılanmayanlar gösteriliyor.
- Aynı adlı bölge parçaları (ör. Tarım Havzası'nın üç parçası) tek bölgede birleştirildi; listede ad tekrarı yok.
- Ana grafikteki çift açıklama ve iki yerde tekrarlanan geri düğmeleri kaldırıldı.
- Krater morfolojisi, erozyon (RUSLE/RWEQ) ve morfoloji ODE ekranları kapsam dışı kaldığı için çıkarıldı.

## Test sırasında bulunup düzeltilen hatalar

1. WorldClim yağış ve rakım rasterlarında "veri yok" değeri (−32768) maskelenmiyordu; ada hücrelerinde anlamsız değerler oluşuyordu.
2. CMIP6 verisi olmayan hücrelerde gelecek kuraklık indeksi 10 ("çok nemli") çıkıyordu; artık "veri yok".
3. Python referansı eksik değeri tam uyum sayıyordu, JavaScript sıfır; ikisi de artık eksik değeri "veri yok" olarak ele alıyor ve birebir aynı sonucu veriyor.
4. Hatalı giriş kutusu, CSS sınıf çakışması yüzünden görünmez oluyordu.
5. Bir alandan çıkınca form baştan çiziliyor ve bir sonraki alanın odağı kayboluyordu.
6. gzip başlığındaki zaman damgası derlemeyi deterministik olmaktan çıkarıyordu.

## Güncelleme · Ayrıntılı iklim ekranı (yalnızca 3. adım)

Projenin başka hiçbir yeri değiştirilmedi (veri, puanlama, diğer ekranlar ve rapor aynı). 3. ekran artık yalnızca seçilen bölgeyi ve iklimini ayrıntılı gösteriyor:

- **Bölge profili:** konum haritası, rakım aralığı, rölyef, çıplak yüzey, kar/buz, kaya türü dağılımı, rüzgâr, büyüklük, bölgedeki bilinen sahalar.
- **Senaryo ve analiz dönemi seçimi** (2021–40 / 2041–60 / 2061–80).
- **Gerekçeli özet:** yerel ısınmanın küresel kara ortalamasına oranı, yağışta model uyumu, kuraklık değişiminin yağış ve buharlaşma payına ayrıştırılması.
- **Altı iklim değişkeni** için ayrı grafik ve açıklama: sıcaklık (model aralığıyla), yağış (model aralığıyla), kuraklık indeksi (UNEP sınıf bantlarıyla), donma-çözülme, permafrost göstergesi, gün içi fark ve günlük en yüksek sıcaklık. Her birinde "neden" açıklaması.
- **Yüzey süreçleri analizi:** kimyasal ayrışma ve toprak oluşumu (Arrhenius, Eₐ ≈ 60 kJ/mol × yağış), donma-çözülme ile kaya parçalanması, su aşınması (Renard & Freimund 1994 erozivitesi), rüzgâr aşınması ve toz (Lancaster 1988 hareketlilik indeksi), krater ve yer şekli bozunma hızı (bileşik). Diverjan çubuk grafik, her süreç için yorum ve "Nasıl hesaplandı?" açıklaması. Deneysel gösterge olarak etiketli.
- **Toprak oluşum rejimi zaman çizelgesi:** kriyojenik / hiper-kurak / kurak / yarı-kurak / kuru yarı-nemli / nemli; dönemlere göre değişim ve yüzey mineralojisine etkisi.
- **Hedef koşullara uyum** tablosu ve puan grafiği.
- **Tahmin nasıl üretildi, ne kadar güvenilir?** tablosu: her bileşen için yöntem ve bu bölgedeki güven (model uyumuna göre).

## Güncelleme · Bölgede daha önce yapılan testler

Bulunan bölgede (veya hemen bitişiğindeki hücrelerde) bilinen bir analog saha varsa, orada daha önce yapılan saha testleri ve kampanyalar gösteriliyor:

- **Nerede:** sonuç ekranındaki bölge ayrıntısı (tam liste), iklim ekranındaki bölge kartı (kısa liste), rapor (3. bölüm) ve bölge kartındaki "★ ajans testi" / "bilimsel analog çalışması" etiketi.
- **İçerik:** yıl, kurum, ne test edildiği ve kaynağa bağlantı. Sahalar üç düzeyde etiketli: ajans testi (NASA/ESA/ISRO/CAS vb.), bilimsel analog çalışması, kayıtlı test bulunamadı.
- **Bölgede saha yoksa:** en yakın test yapılmış saha ve yaklaşık uzaklığı yazılıyor; uydurma test gösterilmiyor.
- **Veri:** `data/analog_sites.json` içindeki 31 sahaya `test_level` ve `tests` alanları eklendi; her kayıt Kasım 2026'da web kaynaklarıyla doğrulandı. Namib ve Uyuni için doğrulanmış ajans/kurum testi bulunamadığından "kayıtlı test bulunamadı" olarak işaretlendi.
- **Sınır:** yalnızca bu 31 saha taranıyor; bölgede listede olmayan başka çalışmalar olabilir (BILIMSEL_SINIRLAMALAR.md).
- Puanlama, ızgara verisi ve diğer ekranlar değişmedi. Yeni otomatik test 6d eklendi (Mars buzlu senaryosu → Haughton testleri görünüyor).

## Güncelleme · İsteğe bağlı canlı gözlem verisi

3. adıma **"Gözlem: son yıllarda gerçekte ne oldu?"** kartı eklendi. Uygulama yine internetsiz açılır ve çalışır; internet yalnızca bu karttaki **"Canlı veriyi getir"** düğmesine basılınca kullanılır.

- **Kaynaklar:** ana kaynak Open-Meteo üzerinden ECMWF ERA5 (`models=era5`); bağımsız kontrol NASA POWER (MERRA-2). Gönderilen tek bilgi en uygun hücrenin koordinatlarıdır.
- **Neden ERA5 ana kaynak ve neden `models=era5`:** Gerçek veriyle yapılan denemede MERRA-2'nin Kanada Arktiği'nde 2005–2007 civarında ≈ 3 °C'lik yapay bir kayma gösterdiği; Open-Meteo'nun varsayılan "best_match" seçeneğinin ise 2017'den sonra başka bir modele geçip rüzgâr, gün içi fark ve yağışta sıçrama yarattığı görüldü. Bu yüzden homojen ERA5 serisi seçildi ve iki kaynak birbirini kontrol edecek şekilde birlikte indiriliyor.
- **Gösterilenler:** yıllık sıcaklık ve yağış grafiği (gözlem, kontrol serisi, doğrusal eğilim ve model yolu ile aralığı), altı değişkenli karşılaştırma tablosu (1981–2000, son 10 yıl, gözlenen değişim, aynı süre için model beklentisi, karşılaştırma, bugün için tahmin ve hedefiniz), gerekçeli yorum, bugünkü tahmini uygunluk puanı, "Bu karşılaştırma nasıl yapıldı?" açıklaması.
- **Hata durumları:** ERA5 yoksa MERRA-2 ile devam edip uyarır; iki kaynak 0,5 °C'den fazla ayrışırsa uyarır; hiçbirine ulaşılamazsa "Tekrar dene" gösterir. Hücrede CMIP6 verisi yoksa (yüksek Arktik) model karşılaştırması yapılamadığını yazar.
- **Rapor ve kaynaklar:** veri getirildiyse rapora "Gözlemle karşılaştırma" bölümü ve kaynak satırı eklenir; Veri kaynakları ekranına canlı veri kartı eklendi, "internete bağlanmaz" ifadeleri düzeltildi.
- Puanlama, bölge bulma ve gömülü veri değişmedi. Yeni testler: 14a–14e (sahte sunucu yanıtlarıyla indirme, eğilim doğruluğu, senaryo değişimi, rapor, kaynak uyuşmazlığı, yedek kaynak, internetsiz durum, mobil) ve 15 (gerçek ERA5/MERRA-2 verisiyle görüntüleme).

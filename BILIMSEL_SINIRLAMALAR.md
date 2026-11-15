# Bilimsel sınırlamalar ve veri durumu

## Bu araç nedir, ne değildir

CraterAnalog **bölgesel bir ön tarama aracıdır**. Çözünürlük 0,5° (~55 km). Belirli bir kayalık, buzsuz vadi, küçük lav sahası veya tuz düzlüğü hücre ortalamasında kaybolabilir. Bulunan bölge, saha seçimi için başlangıç noktasıdır.

## Veri kategorileri

| Kategori | Kaynak | Durum |
|---|---|---|
| Referans iklim | WorldClim v2.1, 1970–2000 aylık normaller (Fick & Hijmans 2017) | İstasyon interpolasyonu; çöl ve kutuplarda istasyon az, belirsizlik yüksek |
| Gelecek iklimi | WorldClim CMIP6 ölçek küçültülmüş; MRI-ESM2-0, MPI-ESM1-2-HR, IPSL-CM6A-LR; SSP2-4.5, SSP5-8.5; 2021–40, 2041–60, 2061–80 | Üç model ortalaması; gösterilen aralık yalnızca bu üç modeli kapsar. Senaryo projeksiyonu, tahmin değil |
| Çıplak yüzey, buz | MODIS MCD12 IGBP 2023, NASA GIBS üzerinden renk tablosuyla çözülmüş | Sınıflandırma ürünü; lav sahaları ve seyrek bitkili alanlar çoğu zaman "çalılık" sınıflanır |
| Kaya türü | GLiM 0,5° (Hartmann & Moosdorf 2012) | Hücrede yalnızca baskın sınıf; küçük adalarda çoğu zaman "bilinmiyor" |
| Rakım, rölyef | WorldClim 10′ rakım | Rölyef, 10′ hücrelerin en yüksek–en düşük farkıdır; eğim değildir |
| Analog sahaları | Literatürden 31 saha | Koordinatlar yaklaşık; değerler sahanın düştüğü hücreden, saha ölçümü değil |
| Uygunluk puanı | Tarayıcıda hesaplanır | Göreceli; girilen hedef aralıklara ve önem ağırlıklarına bağlıdır |

## Sınırlamalar

1. **Ölçek.** 55 km hücreler saha koşulunu temsil etmeyebilir. Doğrulamada McMurdo Kuru Vadileri hücresinin büyük kısmı buzul olduğu için "buz" sayıldı; Hawaii Mauna Kea hücresi rüzgâraltı ıslak yamaçları içerdiği için yağış 1978 mm çıktı.
2. **Interpolasyon.** WorldClim, istasyonun az olduğu Atacama, Sahra, Tibet ve Antarktika gibi tam da analog açısından önemli yerlerde belirsizdir.
3. **Donma-çözülme yaklaşık.** Günlük veri yerine aylık normallerden, günlük sıcaklıkların σ = 5 °C normal dağıldığı varsayımıyla hesaplanır. 14 noktada NASA POWER günlük sayımlarına göre RMSE ≈ 18 gün/yıl (farklı dönemler: 1970–2000'e karşı 2011–2024).
4. **Permafrost göstergesi.** Yıllık ortalama sıcaklıktan türetilir (≤ −3 °C var, ≥ +1 °C yok). Ölçülmüş permafrost haritası değildir; yüksek dağ permafrostunu ve toprak ısıl özelliklerini hesaba katmaz.
5. **Kuraklık indeksi.** Hargreaves PET aylık sıcaklık ve dünya dışı radyasyondan hesaplanır; Penman-Monteith'e göre basittir. Kutup bölgelerinde PET çok küçük olduğundan P/PET yüksek çıkar ve kuraklığı iyi temsil etmez.
6. **Sabit kabul edilenler.** Çıplak yüzey, kalıcı buz, rüzgâr, kaya türü ve rakım gelecekte değişmez kabul edilir. Buzul erimesi ve bitki örtüsü değişimi modellenmez.
7. **Gelecekte eksik hücreler.** WorldClim CMIP6, karaların yaklaşık %6'sında (Antarktika ve bazı kıyı/ada hücreleri) değer içermez. Bu hücrelerde gelecek puanı hesaplanmaz ve arayüzde belirtilir.
8. **Delta yöntemi.** Gelecek kuraklık indeksi ve donma-çözülme, yıllık sıcaklık/gün içi fark değişiminin ve yağış oranının tüm aylara eşit uygulanmasıyla hesaplanır; mevsimsel değişim desenleri kaybolur.
9. **Referans dönemi eski.** 1970–2000; günümüz (2020'ler) iklimi zaten daha sıcaktır. 2021–2040 dönemi bugüne en yakın projeksiyondur.
10. **Puan göreceli.** 100 puan, girilen hedef aralıkların hepsinin karşılandığı anlamına gelir; Mars veya Ay'a "%100 benzer" demek değildir. Toleranslar uzman yargısıyla seçilmiştir, kalibre edilmemiştir.
11. **Bölge adları.** Natural Earth 1:50m coğrafi bölge poligonlarından gelir; bazı adlar geniş veya kaba olabilir (ör. Qaidam Havzası "Gobi Çölü" poligonuna düşer).
12. **Kapsam dışı.** Krater morfolojisi, Mars/Ay krater katalogları, erozyon (RUSLE/RWEQ) ve morfoloji ODE'si bu sürümde kullanılmaz. Eski krater sürümünün modeli `legacy/` klasöründe yalnızca kalibrasyon için tutulur.
13. **Bağımsız doğrulama.** Gömülü iklim değerleri bu projede istasyon verisiyle karşılaştırılmamıştır. Sistemin doğrulaması, bilinen analog sahalarının uygun senaryolarda üst sıralara çıkıp çıkmadığına dayanır (Yöntem ekranı).
14. **Süreç göstergeleri (iklim ekranı).** Kimyasal ayrışma, donma-çözülme, su ve rüzgâr aşınması ile yer şekli bozunması için verilen yüzdeler, literatürdeki genel ilişkilerden türetilmiş **göreli** değişimlerdir; sahaya özgü kalibrasyonu yoktur ve mutlak hız vermez. Kimyasal ayrışmada akış yerine yağış kullanılır; rüzgâr gelecekte sabit tutulduğu için rüzgâr aşınması yalnızca kuraklık değişimini yansıtır. Toprak rejimi sınıflaması iklime dayalı bir genellemedir, toprak etüdü değildir.

15. **Önceki test listesi eksiksiz değildir.** Yalnızca uygulamadaki 31 bilinen analog sahanın test geçmişi gösterilir (Kasım 2026 web taramasıyla derlendi, her kayıtta kaynak bağlantısı var). Bulunan bölgede listede olmayan başka saha çalışmaları yapılmış olabilir; "kayıtlı test bulunamadı" ifadesi test yapılmadığı anlamına gelmez.

16. **Canlı gözlem karşılaştırması (isteğe bağlı).** ERA5 ve MERRA-2 yeniden analizdir, istasyon ölçümü değildir; hiper-kurak bölgelerde yağış, dağlık alanlarda sıcaklık belirsizliği yüksektir ve iki kaynak arasında mutlak fark olabilir (bu yüzden "bugün için tahmin" delta yöntemiyle hesaplanır). Yalnızca en uygun hücrenin merkezi temsil edilir. Model beklentisi, 2021–2040 değişiminin gözlem süresine doğrusal ölçeklenmesidir; ısınma tam doğrusal değildir. "Uyumlu" kararı kaba bir toleransla verilir, istatistiksel test değildir; tek bir on yılın yağışı doğal değişkenlikten güçlü etkilenir. Open-Meteo ücretsiz servisinin dakikalık istek sınırı vardır.

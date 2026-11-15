"""KRATER ANALOG arayüzünü tek, çevrimdışı çalışan HTML dosyasında birleştirir.
Kullanım:  python build.py   ->  krater_analog.html  (önce: python tools/build_grid.py)
Kütüphaneler web/vendor/ klasöründen okunur (yoksa vendor/node_modules/ denenir)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
CANDS = {
    "d3": ["web/vendor/d3.min.js", "vendor/node_modules/d3/dist/d3.min.js"],
    "topo": ["web/vendor/topojson-client.min.js", "vendor/node_modules/topojson-client/dist/topojson-client.min.js"],
    "plotly": ["web/vendor/plotly.min.js", "vendor/node_modules/plotly.js-dist-min/plotly.min.js"],
    "land": ["web/vendor/land-50m.json", "vendor/node_modules/world-atlas/land-50m.json"],
    "countries": ["web/vendor/countries-50m.json", "vendor/node_modules/world-atlas/countries-50m.json"],
}
def read(key):
    for p in CANDS[key]:
        if os.path.exists(p):
            return open(p, encoding="utf-8").read()
    sys.exit(f"HATA: {key} bulunamadı. Aranan: {CANDS[key]}")
def app_js():
    """app.js tek bir IIFE'dir."""
    return open("web/app.js", encoding="utf-8").read()
t = open("web/template.html", encoding="utf-8").read()
rep = {
    "/*__D3__*/": read("d3"),
    "/*__TOPO__*/": read("topo"),
    "/*__PLOTLY__*/": read("plotly"),
    "/*__LAND__*/": read("land"),
    "/*__COUNTRIES__*/": read("countries"),
    "/*__GRID__*/": open("web/grid.json", encoding="utf-8").read(),
    "/*__I18N_NAMES__*/": open("web/i18n_names.json", encoding="utf-8").read(),   # dil seçeneği: İngilizce ülke/bölge adları
    "/*__I18N__*/": open("web/i18n.js", encoding="utf-8").read(),                 # dil seçeneği: İngilizce metinler
    "/*__APP__*/": app_js(),
}
for k, v in rep.items():
    if k not in t:
        sys.exit(f"HATA: şablonda {k} yer tutucusu yok")
    t = t.replace(k, v.replace("</script", "<\\/script").replace("�", "\\uFFFD"))
open("krater_analog.html", "w", encoding="utf-8").write(t)
print(f"krater_analog.html oluşturuldu ({len(t) / 1e6:.1f} MB)")

"""İngilizce ülke ve bölge adları (dil seçeneği için).
web/grid.json içindeki meta.countries / meta.regions dizileriyle aynı sırada İngilizce adları
data/processed/ne_*.geojson dosyalarından üretir → web/i18n_names.json
Sıra tools/build_grid.py ile birebir aynıdır; hizalama burada kontrol edilir.
Kullanım:  python tools/make_i18n_names.py"""
import json, os, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(HERE)
RCLS = {'Desert', 'Plateau', 'Range/mtn', 'Basin', 'Plain', 'Valley', 'Tundra', 'Island', 'Island group', 'Pen/cape', 'Peninsula', 'Lowland', 'Foothills', 'Gorge', 'Depression', 'Delta', 'Wetlands', 'Geoarea'}

def nice(s):
    s = (s or '').strip()
    return s if not s.isupper() else ' '.join(w.capitalize() for w in s.lower().split())

meta = json.load(open('web/grid.json', encoding='utf-8'))['meta']
cf = json.load(open('data/processed/ne_countries.geojson', encoding='utf-8'))['features']
rf = [f for f in json.load(open('data/processed/ne_regions.geojson', encoding='utf-8'))['features'] if f['properties'].get('FEATURECLA') in RCLS]
c_tr = [f['properties'].get('NAME_TR') or f['properties'].get('NAME') for f in cf]
r_tr = [nice(f['properties'].get('NAME_TR') or f['properties'].get('NAME')) for f in rf]
if c_tr != meta['countries'] or r_tr != meta['regions']:
    sys.exit('HATA: ad dizileri grid.json ile hizalı değil')
c_en = [f['properties'].get('NAME_EN') or f['properties'].get('NAME') for f in cf]
r_en = [nice(f['properties'].get('NAME_EN') or f['properties'].get('NAME')) for f in rf]
json.dump({'countries': c_en, 'regions': r_en}, open('web/i18n_names.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'web/i18n_names.json: {len(c_en)} ülke, {len(r_en)} bölge')

"""
AnalogAtlas · Bölge veri hattı
Ham veriler (raw/) → 0,5° küresel ızgara (web/grid.json)

Girdiler (README'deki "Veri indirme" bölümüne bakın):
  raw/wc_bio, wc_tmin, wc_tmax, wc_prec, wc_wind, wc_elev  WorldClim v2.1, 10', 1970–2000
  raw/cmip05/*.npz        reduce_cmip.py çıktısı (WorldClim CMIP6 bioc → 0,5°)
  raw/glim_wgs84_0point5deg.txt.asc   GLiM 0,5° (Hartmann & Moosdorf 2012)
  raw/lc05.npz            decode_landcover.py çıktısı (MODIS MCD12 IGBP 2023, GIBS)
  raw/ne_*.geojson        Natural Earth 1:50m ülkeler ve coğrafi bölgeler
  data/analog_sites.json  Literatürden derlenmiş analog sahaları
"""
import json, glob, os, gzip, base64, math, sys
import numpy as np, rasterio
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
from scipy.stats import norm

RAW = sys.argv[1] if len(sys.argv) > 1 else 'raw'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'web/grid.json'
SITES = sys.argv[3] if len(sys.argv) > 3 else 'data/analog_sites.json'
NR, NC = 360, 720
MDAYS = np.array([31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])
MIDDOY = np.array([15, 46, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344])
SIGMA_FT = None  # set by calibration below

def rd(path):
    with rasterio.open(path) as r:
        x = r.read(1, masked=True).astype(np.float64).filled(np.nan)
    x[x < -1e30] = np.nan
    return x

def agg(a, f=np.nanmean):
    with np.errstate(invalid='ignore'), __import__('warnings').catch_warnings():
        __import__('warnings').simplefilter('ignore')
        return f(a.reshape(NR, 3, NC, 3), axis=(1, 3))

lat = 89.75 - 0.5 * np.arange(NR)           # cell centres, row 0 = north
lon = -179.75 + 0.5 * np.arange(NC)

# ---------- baseline climate (WorldClim 1970–2000) ----------
CACHE = os.path.join(os.path.dirname(SITES), 'processed', 'baseline05.npz')
if os.path.exists(f'{RAW}/wc_bio/wc2.1_10m_bio_1.tif'):
    bio = {b: agg(rd(f'{RAW}/wc_bio/wc2.1_10m_bio_{b}.tif')) for b in (1, 2, 12)}
    mon = {v: np.stack([agg(rd(f'{RAW}/wc_{v}/wc2.1_10m_{v}_{m:02d}.tif')) for m in range(1, 13)]) for v in ('tmin', 'tmax', 'prec', 'wind')}
    elev10 = rd(f'{RAW}/wc_elev/wc2.1_10m_elev.tif')
    elev = agg(elev10)
    relief = agg(elev10, np.nanmax) - agg(elev10, np.nanmin)
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    np.savez_compressed(CACHE, bio1=bio[1], bio2=bio[2], bio12=bio[12], elev=elev, relief=relief, **{v: mon[v] for v in mon})
    print('ham WorldClim okundu, önbellek yazıldı:', CACHE)
else:
    z = np.load(CACHE); bio = {1: z['bio1'], 2: z['bio2'], 12: z['bio12']}
    mon = {v: z[v] for v in ('tmin', 'tmax', 'prec', 'wind')}; elev, relief = z['elev'], z['relief']
    print('ham WorldClim yok; önbellek kullanıldı:', CACHE)
land = np.isfinite(bio[1]) & np.isfinite(mon['prec']).all(0)

# extraterrestrial radiation Ra (FAO-56 eq. 21), mm/day
def ra_mm(latdeg):
    phi = np.radians(latdeg)[:, None]
    J = MIDDOY[None, :]
    dr = 1 + 0.033 * np.cos(2 * np.pi / 365 * J)
    dec = 0.409 * np.sin(2 * np.pi / 365 * J - 1.39)
    ws = np.arccos(np.clip(-np.tan(phi) * np.tan(dec), -1, 1))
    Ra = 24 * 60 / np.pi * 0.0820 * dr * (ws * np.sin(phi) * np.sin(dec) + np.cos(phi) * np.cos(dec) * np.sin(ws))
    return 0.408 * np.maximum(Ra, 0)       # (NR, 12)
RA = ra_mm(lat).T[:, :, None]               # (12, NR, 1)

def pet_hargreaves(tmin, tmax):
    tmean = (tmin + tmax) / 2
    dtr = np.maximum(tmax - tmin, 0)
    pet = 0.0023 * RA * np.maximum(tmean + 17.8, 0) * np.sqrt(dtr) * MDAYS[:, None, None]
    return pet.sum(0)

def ft_days(tmin, tmax, sigma):
    """Monthly-normal approximation of freeze–thaw days (daily Tmax>0 and Tmin<0)."""
    p = norm.cdf(-tmin / sigma) * norm.cdf(tmax / sigma)
    return (p * MDAYS[:, None, None]).sum(0)

def climate_set(tmin, tmax, prec, sigma):
    P = prec.sum(0); PET = pet_hargreaves(tmin, tmax)
    AI = np.where(PET > 1, P / np.maximum(PET, 1), 10.0)
    return P, np.minimum(AI, 10.0), ft_days(tmin, tmax, sigma)

# ---------- calibrate FT sigma against NASA POWER daily counts at 14 craters ----------
cal = []
try:
    import csv
    Mold = json.load(open(os.path.join(os.path.dirname(SITES), '..', 'legacy', 'model_v4.json')))
    for c in Mold['craters']:
        r = int((89.75 - c['lat']) / 0.5 + 0.5); k = int((c['lon'] + 179.75) / 0.5 + 0.5)
        r = min(max(r, 0), NR - 1); k = min(max(k, 0), NC - 1)
        cal.append((r, k, c['base']['FT'], c['name']))
except Exception as e:
    print('kalibrasyon verisi yok:', e)
best = (3.0, None)
if cal:
    res = []
    for s in (2, 3, 4, 5, 6, 7, 8, 10):
        f = ft_days(mon['tmin'], mon['tmax'], s)
        err = [f[r, k] - o for r, k, o, _ in cal if np.isfinite(f[r, k])]
        res.append((float(np.sqrt(np.mean(np.square(err)))), s))
    rmse, s = min(res)
    best = (s, rmse)
    print('FT σ kalibrasyonu (RMSE gün/yıl):', [(s_, round(r_, 1)) for r_, s_ in res], '→ σ =', s)
SIGMA_FT = best[0]

Pb, AIb, FTb = climate_set(mon['tmin'], mon['tmax'], mon['prec'], SIGMA_FT)
Tb, DTRb = bio[1], bio[2]
Wb = mon['wind'].mean(0)

# ---------- future (WorldClim CMIP6 bioc, delta applied to monthly normals for AI and FT) ----------
fut = {}
models = sorted({os.path.basename(f).split('_')[0] for f in glob.glob(f'{RAW}/cmip05/*.npz') or glob.glob(os.path.join(os.path.dirname(SITES), 'processed', 'cmip05', '*.npz'))})
for ssp in ('ssp245', 'ssp585'):
    for per in ('2021-2040', '2041-2060', '2061-2080'):
        acc = {k: [] for k in ('T', 'P', 'DTR', 'AI', 'FT')}
        for m in models:
            f = f'{RAW}/cmip05/{m}_{ssp}_{per}.npz'
            if not os.path.exists(f): f = os.path.join(os.path.dirname(SITES), 'processed', 'cmip05', f'{m}_{ssp}_{per}.npz')
            if not os.path.exists(f): continue
            d = np.load(f)
            dT = d['T'] - Tb; dD = d['DTR'] - DTRb
            ratio = np.where(Pb > 1, d['P'] / np.maximum(Pb, 1), 1.0)
            ratio = np.clip(ratio, 0, 5)
            tmin = mon['tmin'] + dT - dD / 2; tmax = mon['tmax'] + dT + dD / 2
            prec = mon['prec'] * ratio
            P, AI, FT = climate_set(tmin, tmax, prec, SIGMA_FT)
            acc['T'].append(d['T']); acc['P'].append(d['P']); acc['DTR'].append(d['DTR']); acc['AI'].append(AI); acc['FT'].append(FT)
        n = len(acc['T'])
        key = f'{ssp}_{per}'
        fut[key] = {k: np.nanmean(np.stack(v), 0) for k, v in acc.items()}
        fut[key]['Tlo'] = np.nanmin(np.stack(acc['T']), 0); fut[key]['Thi'] = np.nanmax(np.stack(acc['T']), 0)
        fut[key]['Plo'] = np.nanmin(np.stack(acc['P']), 0); fut[key]['Phi'] = np.nanmax(np.stack(acc['P']), 0)
        miss = ~np.isfinite(fut[key]['T'])          # WorldClim CMIP6 has no value here (e.g. Antarctica)
        for kk in ('P', 'DTR', 'AI', 'FT', 'Tlo', 'Thi', 'Plo', 'Phi'): fut[key][kk] = np.where(miss, np.nan, fut[key][kk])
        fut[key]['n'] = n
        print(key, 'model sayısı', n, 'küresel ort. ΔT', round(float(np.nanmean((fut[key]['T'] - Tb)[land])), 2))

# ---------- surface, lithology ----------
lc = np.load(f'{RAW}/lc05.npz' if os.path.exists(f'{RAW}/lc05.npz') else os.path.join(os.path.dirname(SITES), 'processed', 'lc05.npz'))
barren = np.nan_to_num(lc['barren'], nan=0.0); ice = np.nan_to_num(lc['ice'], nan=0.0)
glim = np.loadtxt(f'{RAW}/glim_wgs84_0point5deg.txt.asc' if os.path.exists(f'{RAW}/glim_wgs84_0point5deg.txt.asc') else os.path.join(os.path.dirname(SITES), 'processed', 'glim_wgs84_0point5deg.txt.asc'), skiprows=6)    # row 0 = north
glim[glim < 0] = 0
# a cell is "ice" if MODIS snow/ice ≥ 50 % or GLiM majority is ice/glacier (16)
icemask = (ice >= 0.5) | (glim == 16)

# ---------- names (Natural Earth) ----------
idx = np.argwhere(land)
pts = [Point(float(lon[k]), float(lat[r])) for r, k in idx]
def load_polys(path, cls_ok=None):
    feats = json.load(open(path))['features']; geoms, props = [], []
    for f in feats:
        p = f['properties']
        if cls_ok and p.get('FEATURECLA') not in cls_ok: continue
        g = shape(f['geometry'])
        if not g.is_valid: g = g.buffer(0)
        geoms.append(g); props.append(p)
    return geoms, props
cg, cp = load_polys((f'{RAW}/ne_countries.geojson' if os.path.exists(f'{RAW}/ne_countries.geojson') else os.path.join(os.path.dirname(SITES), 'processed', 'ne_countries.geojson')))
ctree = STRtree(cg)
countries = [p.get('NAME_TR') or p.get('NAME') for p in cp]
cidx = np.zeros(len(pts), np.int16) - 1
for i, pt in enumerate(pts):
    hits = ctree.query(pt, predicate='intersects')
    if len(hits): cidx[i] = int(hits[0])
    else:
        j = ctree.nearest(pt)
        if cg[j].distance(pt) < 1.5: cidx[i] = int(j)
RCLS = ['Desert', 'Plateau', 'Range/mtn', 'Basin', 'Plain', 'Valley', 'Tundra', 'Island', 'Island group', 'Pen/cape', 'Peninsula', 'Lowland', 'Foothills', 'Gorge', 'Depression', 'Delta', 'Wetlands', 'Geoarea']
rg, rp = load_polys((f'{RAW}/ne_regions.geojson' if os.path.exists(f'{RAW}/ne_regions.geojson') else os.path.join(os.path.dirname(SITES), 'processed', 'ne_regions.geojson')), set(RCLS))
rtree = STRtree(rg)
def nice(s):
    s = (s or '').strip()
    return s if not s.isupper() else ' '.join(w.capitalize() for w in s.lower().split())
regions = [nice(p.get('NAME_TR') or p.get('NAME')) for p in rp]
ridx = np.zeros(len(pts), np.int16) - 1
for i, pt in enumerate(pts):
    hits = [int(h) for h in rtree.query(pt, predicate='intersects')]
    if hits: ridx[i] = min(hits, key=lambda h: rg[h].area)
glim_names = ['bilinmiyor', 'gevşek tortul', 'bazik volkanik', 'silisiklastik tortul', 'bazik plütonik', 'karışık tortul', 'karbonat', 'asidik volkanik', 'metamorfik', 'asidik plütonik', 'orta volkanik', 'su', 'piroklastik', 'orta plütonik', 'evaporit', 'veri yok', 'buz/buzul']

# ---------- pack ----------
R_, K_ = idx[:, 0], idx[:, 1]
def col(a): return a[R_, K_]
fields = []          # (key, int16 array, scale)
def add(key, arr, scale):
    v = np.nan_to_num(col(arr).astype(np.float64), nan=-32768 / scale) * scale
    fields.append((key, np.clip(np.round(v), -32768, 32767).astype('<i2'), scale))
add('T', Tb, 10); add('DTR', DTRb, 10); add('P', Pb, 1); add('AI', AIb, 1000); add('FT', FTb, 1)
add('W', Wb, 10); add('elev', elev, 1); add('relief', relief, 1)
add('bare', barren * 100, 10); add('ice', ice * 100, 10); add('icemask', icemask.astype(float), 1)
add('lith', glim, 1)
for key, d in fut.items():
    for k in ('T', 'P', 'DTR', 'AI', 'FT', 'Tlo', 'Thi', 'Plo', 'Phi'):
        add(f'{key}:{k}', d[k], {'T': 10, 'Tlo': 10, 'Thi': 10, 'DTR': 10, 'P': 1, 'Plo': 1, 'Phi': 1, 'AI': 1000, 'FT': 1}[k])
cell = (R_ * NC + K_).astype('<i4')
blob = cell.tobytes() + cidx.astype('<i2').tobytes() + ridx.astype('<i2').tobytes() + b''.join(a.tobytes() for _, a, _ in fields)
gz = gzip.compress(blob, 9, mtime=0)

# ---------- analog sites → cells ----------
S = json.load(open(SITES))
cellpos = {int(c): i for i, c in enumerate(cell)}
for s in S['sites']:
    r = int(round((89.75 - s['lat']) / 0.5)); k = int(round((s['lon'] + 179.75) / 0.5))
    best_i, best_d = None, 9e9
    for dr in range(-2, 3):
        for dk in range(-2, 3):
            rr, kk = r + dr, (k + dk) % NC
            if 0 <= rr < NR and rr * NC + kk in cellpos:
                dd = (lat[rr] - s['lat']) ** 2 + ((lon[kk] - s['lon']) * math.cos(math.radians(s['lat']))) ** 2
                if dd < best_d: best_i, best_d = cellpos[rr * NC + kk], dd
    s['cell'] = best_i
    if best_i is None: print('UYARI: saha ızgaraya düşmedi', s['id'])

meta = {
    'version': 'region-1.0', 'res': 0.5, 'nrows': NR, 'ncols': NC, 'n': int(len(cell)),
    'fields': [{'key': k, 'scale': sc} for k, _, sc in fields],
    'countries': countries, 'regions': regions, 'lith': glim_names,
    'models': models, 'scenarios': ['ssp245', 'ssp585'], 'periods': ['2021-2040', '2041-2060', '2061-2080'],
    'ft_sigma': SIGMA_FT, 'ft_cal_rmse': best[1], 'ft_cal_n': len(cal),
    'baseline': 'WorldClim v2.1, 1970–2000',
    'sites': S['sites'], 'site_tags': S['tags'], 'site_note': S['_note'], 'test_levels': S.get('test_levels', {}), 'test_note': S.get('test_note', ''),
}
json.dump({'meta': meta, 'b64': base64.b64encode(gz).decode()}, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'hücre: {len(cell)}, alan: {len(fields)}, ham {len(blob)/1e6:.1f} MB → gzip {len(gz)/1e6:.1f} MB → {os.path.getsize(OUT)/1e6:.1f} MB')

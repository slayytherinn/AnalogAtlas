"""MODIS MCD12 IGBP sınıf haritasını (GIBS PNG + resmî renk tablosu) 0,5° çorak / kar-buz payına çevirir.
Kullanım: python tools/decode_landcover.py gibs_igbp_2023_7200x3600.png gibs_igbp_colormap.xml data/processed/lc05.npz
PNG: https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual&STYLES=&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=7200&HEIGHT=3600&FORMAT=image/png&TIME=2023-01-01
Renk tablosu: https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_IGBP_Land_Cover_Type.xml"""
import sys, re, numpy as np
from PIL import Image
im = np.array(Image.open(sys.argv[1]).convert('RGBA')); xml = open(sys.argv[2]).read()
cm = {tuple(map(int, m[0].split(','))): int(m[1]) for m in re.findall(r'rgb="([^"]*)"[^/]*sourceValue="(\d+)"', xml)}
cm[(134, 202, 227)] = 17   # su (yalnızca lejantta)
rgb = im[..., :3].astype(np.int32); key = (rgb[..., 0] << 16) | (rgb[..., 1] << 8) | rgb[..., 2]
cls = np.zeros(key.shape, np.uint8)
for (r, g, b), v in cm.items(): cls[key == ((r << 16) | (g << 8) | b)] = v
frac = lambda m: m.reshape(360, 10, 720, 10).mean(axis=(1, 3))
land = (im[..., 3] > 0) & (cls > 0) & (cls != 17)
L = frac(land); B = frac(land & (cls == 16)); I = frac(land & (cls == 15))
with np.errstate(invalid='ignore'):
    np.savez_compressed(sys.argv[3], land=L, barren=np.where(L > 0, B / L, np.nan), ice=np.where(L > 0, I / L, np.nan))
print('ok', (L > 0.5).sum(), 'kara hücresi')

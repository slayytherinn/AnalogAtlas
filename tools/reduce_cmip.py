"""Reduce WorldClim CMIP6 bioc GeoTIFFs (10') to 0.5° arrays of BIO1, BIO2, BIO6, BIO12."""
import sys, glob, os, numpy as np, rasterio
out = sys.argv[2]; os.makedirs(out, exist_ok=True)
def agg(a):  # 1080x2160 -> 360x720 nanmean of 3x3
    a = a.reshape(360, 3, 720, 3)
    with np.errstate(invalid='ignore'):
        return np.nanmean(a, axis=(1, 3)).astype(np.float32)
for f in sorted(glob.glob(os.path.join(sys.argv[1], 'wc2.1_10m_bioc_*.tif'))):
    name = os.path.basename(f)[len('wc2.1_10m_bioc_'):-4]
    dst = os.path.join(out, name + '.npz')
    if os.path.exists(dst): continue
    try:
        with rasterio.open(f) as r:
            assert r.count == 19 and r.shape == (1080, 2160), (r.count, r.shape)
            d = {}
            for b, k in [(1, 'T'), (2, 'DTR'), (6, 'Tcold'), (12, 'P')]:
                x = r.read(b).astype(np.float64); x[x < -1e30] = np.nan; d[k] = agg(x)
        np.savez_compressed(dst, **d); print('ok', name, {k: float(np.nanmean(v)) for k, v in d.items()})
    except Exception as e:
        print('FAIL', name, e)

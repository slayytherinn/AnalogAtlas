"""Uygunluk puanı · web/app.js içindeki hesapla birebir aynı (test: tools/validate.py)."""
import json, gzip, base64, numpy as np
TOL = {'T': 3.0, 'DTR': 2.0, 'FT': 20.0, 'W': 1.0, 'bare': 10.0, 'elev': 500.0, 'relief': 300.0}
LOGP = {'P': (10.0, 0.5), 'AI': (0.01, 0.5)}           # offset, tolerance in ln units
LITH_GROUP = {1: 'tortul', 3: 'tortul', 5: 'tortul', 6: 'tortul', 14: 'tortul', 2: 'volkanik', 7: 'volkanik', 10: 'volkanik', 12: 'volkanik', 4: 'plutonik', 9: 'plutonik', 13: 'plutonik', 8: 'metamorfik'}
W = {'yuksek': 3, 'orta': 2, 'dusuk': 1, 'kapali': 0}

def load(path='web/grid.json'):
    G = json.load(open(path)); m = G['meta']; b = gzip.decompress(base64.b64decode(G['b64'])); n = m['n']
    off = 8 * n; F = {}
    for f in m['fields']:
        a = np.frombuffer(b[off:off + 2 * n], '<i2').astype(np.float64); off += 2 * n
        a[a == -32768] = np.nan; F[f['key']] = a / f['scale']
    F['cell'] = np.frombuffer(b[:4 * n], '<i4'); return m, F

def range_score(key, v, lo, hi):
    if key in LOGP:
        o, t = LOGP[key]; x = np.log(np.maximum(v, 0) + o)
        a = -np.inf if lo is None else np.log(lo + o); bb = np.inf if hi is None else np.log(hi + o)
    else:
        t = TOL[key]; x = v; a = -np.inf if lo is None else lo; bb = np.inf if hi is None else hi
    d = np.where(x < a, a - x, np.where(x > bb, x - bb, 0.0))
    return np.where(np.isfinite(x), np.exp(-(d / t) ** 2), np.nan)   # missing value -> NaN (never a match)

def perma_index(T): return np.where(np.isfinite(T), np.clip((1.0 - T) / 4.0, 0, 1), np.nan)      # 1 if T ≤ −3 °C, 0 if T ≥ +1 °C

def score(F, crit, pre=''):
    """crit: dict key -> {lo, hi, w, req} ; 'lith': {set, w, req}; 'perma': {mode, w, req}; 'noice': bool. pre: future prefix 'ssp245_2061-2080:'"""
    g = lambda k: F[pre + k] if (pre and (pre + k) in F) else F[k]
    num = 0; den = 0; ok = np.ones(len(F['T']), bool); have = np.ones(len(F['T']), bool)
    for k, c in crit.items():
        if k in ('lith', 'perma', 'noice'): continue
        w = W[c['w']]
        if w == 0 and not c.get('req'): continue
        s = range_score(k, g(k), c.get('lo'), c.get('hi')); have &= np.isfinite(s); s = np.nan_to_num(s, nan=0)
        num += w * s; den += w
        if c.get('req'): ok &= s >= 0.999
    if 'lith' in crit and (W[crit['lith']['w']] or crit['lith'].get('req')):
        c = crit['lith']; L = np.nan_to_num(F['lith']).astype(int); sel = set(c['set'])
        groups = {LITH_GROUP.get(x) for x in sel}
        s = np.array([1.0 if x in sel else (0.5 if LITH_GROUP.get(x) in groups and LITH_GROUP.get(x) else (0.3 if x in (0, 11, 15) else 0.0)) for x in range(17)])[L]
        w = W[c['w']]; num += w * s; den += w
        if c.get('req'): ok &= s >= 0.999
    if 'perma' in crit and crit['perma']['mode'] != 'onemsiz':
        c = crit['perma']; pi = perma_index(g('T')); have &= np.isfinite(g('T')); s = np.nan_to_num(pi if c['mode'] == 'var' else 1 - pi, nan=0)
        w = W[c['w']]; num += w * s; den += w
        if c.get('req'): ok &= s >= 0.999
    if crit.get('noice'): ok &= F['icemask'] < 0.5
    sc = num / den if den else np.zeros(len(ok))
    return np.where(ok & have, sc, np.nan)

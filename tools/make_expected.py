"""tests/expected_scores.json üretir (JS–Python puan eşitliği testi için)."""
import sys, json, numpy as np
sys.path.insert(0, 'tools'); from scoring import load, score
m, F = load(); P = json.load(open('data/presets.json'))
rng = np.random.default_rng(1)
idx = sorted(set(rng.integers(0, m['n'], 400).tolist() + [s['cell'] for s in m['sites'] if s['cell'] is not None] + np.where(np.isnan(F['ssp585_2061-2080:T']))[0][:60].tolist()))
out = {}
for k, p in P.items():
    s = score(F, p['crit']); fs = score(F, p['crit'], 'ssp585_2061-2080:')
    out[k] = {'idx': idx, 'base': [None if np.isnan(s[i]) else float(s[i]) for i in idx], 'fut': [None if np.isnan(fs[i]) else float(fs[i]) for i in idx], 'elig': int((~np.isnan(s)).sum())}
json.dump(out, open('tests/expected_scores.json', 'w')); print({k: v['elig'] for k, v in out.items()})

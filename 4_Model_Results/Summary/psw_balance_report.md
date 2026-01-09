# PSW Balance Diagnostics
## Weight Diagnostics
- Weight column: `psw`
- psw summary: min=0.461, p01=0.525, median=0.982, p99=1.582, max=1.671
- Effective sample size (ESS), overall: 4671.3496
- ESS in x_FASt=0: 2733.1431
- ESS in x_FASt=1: 2039.1331

## Covariate Balance (max |SMD| across levels)
Rule of thumb: |SMD| < 0.10 is often considered good balance; < 0.20 is usually acceptable.

| Covariate | max |SMD| (pre) | max |SMD| (post, PSW) |
|---|---:|---:|
| hgrades_c | 0.2908 | 0.0002 |
| hapcl | 0.2609 | 0.0000 |
| hacadpr13_num_c | 0.1528 | 0.0000 |
| hprecalc13 | 0.1195 | 0.0000 |
| StemMaj | 0.1168 | 0.0000 |
| bparented_c | 0.1126 | 0.0000 |
| pell | 0.0896 | 0.0420 |
| hchallenge_c | 0.0325 | 0.0000 |
| tcare_num_c | 0.0199 | 0.0000 |
| cohort | 0.0150 | 0.0000 |
| cSFcareer_c | 0.0090 | 0.0000 |

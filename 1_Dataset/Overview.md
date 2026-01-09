# Dataset

This folder contains the analysis dataset.

## File

- **rep_data.csv** — Representative dataset (N = 5,000 simulated students)
- **archetype_assignments.csv** — Archetype assignments (13 archetypes, locked to generator)
- **generate_empirical_dataset.py** — Dataset generator (authoritative for archetypes)
- **Data_constuct.md** — Authoritative checklist for covariate expansion + PSW steps

## Variables

The dataset includes:
- **Treatment**: `x_FASt` (1 = earned ≥12 transferable credits before college)
- **Moderator**: `credit_dose_c` (mean-centered credit hours)
- **Mediators**: Survey items for Emotional Distress and Quality of Engagement
- **Outcomes**: Survey items for Belonging, Perceived Gains, Supportive Environment, and Satisfaction
- **Covariates**: Demographics, high school preparation, financial aid status, and PSW covariate expansion targets (see `1_Dataset/Data_constuct.md`)
- **Archetypes**: 13 archetypes (locked to generator; see `1_Dataset/archetype_assignments.csv`)

## Notes

- All `_c` suffix variables are mean-centered
- See `2_Codebooks/` for complete variable definitions and survey item wording
- The generator is the source of truth for archetype prevalence and FASt rates

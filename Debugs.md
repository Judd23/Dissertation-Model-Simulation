# Debug & Development Tracking

> **Reorganized:** January 8, 2026

This file has been split into focused documents:

## Universal

| Document | Purpose |
|----------|---------|
| [AI_DEBUGGING_PROTOCOL.md](AI_DEBUGGING_PROTOCOL.md) | Standardized debugging workflow (Webapp + R Pipeline) |

## Webapp

| Document | Purpose |
|----------|---------|
| [webapp/BUGS.md](webapp/BUGS.md) | Bug tracker (4 open, 22 archived) |
| [webapp/TRANSITIONS.md](webapp/TRANSITIONS.md) | Transition system docs & integration checklist |

## R Pipeline

See `.claude/docs/` for:
- `architectural_patterns.md` — Pipeline architecture, naming conventions
- `dissertation_context.md` — Research model, constructs, archetypes
- `session_notes.md` — Pipeline run status

## Quick Reference


### Webapp Commands
```bash
cd webapp
npm run dev      # Dev server
npm run build    # Production build
npm run lint     # ESLint check
npx tsc --noEmit # TypeScript check
npm run deploy   # GitHub Pages
```

### R Pipeline Commands
```bash
# Full run
Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R

# Quick smoke test
TABLE_CHECK_MODE=1 Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R
```

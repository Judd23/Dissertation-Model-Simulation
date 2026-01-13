# Agent Working Agreement (Repo-Wide)

## Primary rule: minimal-diff edits
- Make the smallest possible change that satisfies the request.
- Do not change styling, spacing, typography, colors, animations, layout, or design tokens unless explicitly requested.
- Do not refactor, rename, reorder, or clean up unrelated code.
- Do not reformat files or apply automated formatting unless explicitly requested.
- Do not modify files not explicitly allowed in the prompt unless required. If required, STOP and ask before proceeding.

## Scope control
- Touch at most 3 files per task by default.
- If more than 3 files are required, STOP and ask for approval with a file list.

## Process requirements
1) Before editing, list the exact files to be changed and why.
2) Wait for explicit approval before editing.
3) After editing, summarize changes file-by-file and confirm no extra visual diffs were introduced.

## UI change safety
- Prefer local, narrowly scoped changes over global CSS or tokens.
- Any CSS or design change must be justified as necessary for the requested behavior.

---

# Project Ops Addendum (Source-Checked)

## Required agent behaviors (efficiency + correctness)
- Read the relevant files first; do not speculate.
- Check in before making broad changes (refactors, styling sweeps, cross-cutting edits).
- Explain what you are doing in short, concrete steps.
- Keep changes simple and minimal-diff.
- Keep architecture documentation centralized: treat `webapp/ARCHITECTURE_AUDIT.md` as the canonical architecture reference.

## Webapp operational facts (verified)
- Webapp lives in `webapp/`.
- Commands (from `webapp/package.json`):
	- `npm run dev`
	- `npm run build` (copies `dist/index.html` to `dist/404.html` for GitHub Pages)
	- `npm run lint`
	- `npm run deploy` (publishes `dist/` to `gh-pages` branch)
- GitHub Pages URL (from `webapp/package.json`): `https://judd23.github.io/Dissertation-Model-Simulation`
- Vite base path (from `webapp/vite.config.ts`): `/Dissertation-Model-Simulation/`
- Router is `HashRouter` (from `webapp/src/app/providers.tsx`) for GitHub Pages compatibility.

## Animation ownership rule (Framer Motion owns movement)
- Use `framer-motion` imports only. Do not use `motion/react`.
- Motion owns ALL movement transforms (translate/scale/rotate), including hover/active motion.
- CSS is for visuals only (color, opacity, shadows, borders, backgrounds, blur, etc.).
- Do not use `transform:` or `transition: transform` in CSS modules unless explicitly requested and approved.

# AI Agent Debugging Protocol

> A standardized checklist for AI agents performing bug detection and fixing.  
> Based on research from SWE-bench (49% SOTA), Aider, and Anthropic's agent scaffolding.

**Applies to:** Webapp (React/TypeScript) AND R Analytics Pipeline (lavaan/SEM)

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: SETUP                                                     │
│  □ Read rules → □ Explore codebase → □ Collect errors               │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 2: INVESTIGATE                                               │
│  □ Document bug → □ Localize root cause → □ Reproduce               │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 3: FIX                                                       │
│  □ Plan minimal fix → □ Apply edits → □ Handle failures             │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 4: VERIFY                                                    │
│  □ Run checks → □ Confirm fix → □ Document completion               │
└─────────────────────────────────────────────────────────────────────┘
```

## Approval Requirement (Mandatory)

- REQUIRED: Must make a phased approach checklist and get approval before each phase begins.

---

## Table of Contents

**Phase 1: Setup**
1. [Design Freeze Rules](#1-design-freeze-rules)
2. [Explore the Codebase](#2-explore-the-codebase)
3. [Collect Current Errors](#3-collect-current-errors)

**Phase 2: Investigate**
4. [Document the Bug](#4-document-the-bug)
5. [Localize Root Cause](#5-localize-root-cause)
6. [Reproduce the Bug](#6-reproduce-the-bug)

**Phase 3: Fix**
7. [Plan the Fix](#7-plan-the-fix)
8. [Apply Edits](#8-apply-edits)
9. [Handle Failures](#9-handle-failures)

**Phase 4: Verify**
10. [Run Verification Checks](#10-run-verification-checks)
11. [Confirm & Document](#11-confirm--document)

**Reference**
- [Tool-Specific Guidance](#tool-specific-guidance)
- [Error Pattern Recognition](#error-pattern-recognition)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

# Phase 1: Setup

## 1. Design Freeze Rules

> ⚠️ **READ FIRST.** These rules govern what changes are allowed.

### Constraints

| Allowed | Forbidden |
|---------|-----------|
| ✅ Code **strictly necessary** to fix the bug | ❌ CSS/layout changes unrelated to the bug (webapp) |
| ✅ CSS changes **if required** by the bug fix | ❌ Refactoring, renaming, reformatting |
| ✅ Adding missing imports/types | ❌ Dependency updates (unless security fix) |
| ✅ Fixing actual errors | ❌ "While I'm here..." improvements |
| ✅ Adding targeted tests | ❌ Model specification changes without approval (R) |

### When Fix Requires Disallowed Changes

⚠️ **STOP.** Do not proceed. Instead:
1. Document what the fix requires
2. Explain why it violates freeze rules
3. Request explicit approval before continuing

---

## 2. Explore the Codebase

### Required Before Any Fix Attempt

```
□ EXPLORE REPOSITORY STRUCTURE
  - List top-level directories
  - Identify test locations
  - Find config files

□ UNDERSTAND THE STACK
  - Read README.md or project docs
  - Identify frameworks/packages
  - Note conventions (naming, file structure)

□ LOCATE TESTS
  - Find test files for affected code
  - Note test framework
```

### File Discovery Commands

#### 🌐 Webapp

```bash
# Project structure (2 levels)
find . -maxdepth 2 -type d | head -30

# Test files
find . -name "*.test.*" -o -name "*.spec.*" | head -20

# Config files
ls -la | grep -E "config|tsconfig|package|vite"

# Linting setup
cat package.json | grep -E "lint|eslint|prettier"
```

#### 📊 R Pipeline

```bash
# Project structure
find . -maxdepth 2 -type d | head -30

# R scripts
find . -name "*.R" | head -30

# Model definition files
find . -name "*model*.R" -o -name "*.lav"

# Key files
ls -la 3_Analysis/1_Main_Pipeline_Code/
ls -la 5_Statistical_Models/models/
```

---

## 3. Collect Current Errors

### 🌐 Webapp

```bash
# TypeScript errors
npx tsc --noEmit 2>&1 | head -50

# ESLint issues
npm run lint 2>&1 | head -50

# Build errors
npm run build 2>&1 | head -50

# Test failures
npm test -- --watchAll=false 2>&1 | head -100
```

### 📊 R Pipeline

```bash
# Syntax check (quick)
Rscript -e "parse('3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R')"

# Smoke test run
TABLE_CHECK_MODE=1 Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R 2>&1 | tail -100

# Check for banned terms
grep -r "QualInteract" --include="*.R"

# Check package versions
Rscript -e "packageVersion('lavaan')"
```

### Priority Order

```
Webapp:                          R Pipeline:
1. TypeScript/Linter errors      1. R syntax errors (parse)
2. Build errors                  2. Package loading errors
3. Test failures                 3. Model convergence failures
4. Runtime errors                4. Verification checklist failures
```

---

# Phase 2: Investigate

## 4. Document the Bug

### Bug Report Template

```markdown
### Bug: [SHORT TITLE]
**Broken:** [What fails]  
**Expected:** [What should happen]  
**Repro:** 1. ... 2. ... 3. ...  
**Errors:** [Console/terminal output]

**Root Cause:** [File/function/line + explanation]
**Allowed files:**
- `path/to/file`

**Proposed Fix:** [Brief description]
**Acceptance:** Repro passes, no unrelated changes
```

### Example (Webapp)

```markdown
### Bug: Slider crashes on mobile
**Broken:** App throws TypeError when dragging dose slider on iOS Safari  
**Expected:** Slider should update value smoothly  
**Repro:** 1. Open on iPhone 2. Navigate to /dose 3. Drag slider  
**Errors:** `TypeError: Cannot read property 'touches' of undefined`

**Root Cause:** DoseSlider.tsx:47 - missing touch event check
**Allowed files:**
- `webapp/src/components/DoseSlider.tsx`

**Proposed Fix:** Add `event.touches?.[0]` optional chaining
**Acceptance:** No crash on iOS, value updates correctly
```

### Example (R Pipeline)

```markdown
### Bug: MG model fails for Pell grouping
**Broken:** Multi-group SEM throws non-convergence error for W3 (Pell)  
**Expected:** Model should converge with valid estimates  
**Repro:** 1. Run `SMOKE_ONLY_A=0 W_SELECT=3 Rscript run_all_RQs_official.R`  
**Errors:** `lavaan WARNING: model did not converge after 10000 iterations`

**Root Cause:** Small cell sizes in Pell=1 group cause Heywood case on QIadmin
**Allowed files:**
- `5_Statistical_Models/models/mg_fast_vs_nonfast_model.R`

**Proposed Fix:** Constrain QIadmin variance > 0.001 in group-specific syntax
**Acceptance:** Model converges, no negative variances
```

---

## 5. Localize Root Cause

### Strategy 1: Error Message Mining

```
Extract from error messages:
□ File path and line number
□ Function/method name
□ Variable names involved
□ Stack trace (read bottom-up for root cause)
□ Error type
```

### Strategy 2: Semantic Search

```
For unfamiliar codebases, search for:
□ Function definitions matching error context
□ Import/export statements for missing modules
□ Type/variable definitions
□ Similar patterns in working code
```

### Strategy 3: Call Graph Tracing

```
- Find entry points related to the bug
- Trace dependencies backward from error site
- Prioritize files with high connectivity to error location
```

### Search Tool Priority

```
1. grep_search    - Know exact strings/patterns
2. semantic_search - Exploring unfamiliar code
3. file_search    - Know filename patterns
4. list_code_usages - Tracing function calls
```

---

## 6. Reproduce the Bug

### NEVER Fix Without Reproduction

> "Create a script to reproduce the error and execute it... to confirm the error"  
> — Anthropic SWE-bench Agent

### 🌐 Webapp Reproduction

```bash
# Step 1: Create minimal reproduction
cat > reproduce_bug.ts << 'EOF'
import { problematicFunction } from './source';
try {
  problematicFunction(inputThatCausesBug);
  console.log('BUG NOT REPRODUCED - check input');
} catch (e) {
  console.log('BUG REPRODUCED:', e.message);
}
EOF

# Step 2: Run it
npx tsx reproduce_bug.ts
```

### 📊 R Pipeline Reproduction

```bash
# Step 1: Create minimal reproduction
cat > reproduce_bug.R << 'EOF'
library(lavaan)
source("5_Statistical_Models/models/mg_fast_vs_nonfast_model.R")

# Minimal data subset triggering the bug
dat_test <- read.csv("rep_data.csv")
dat_test <- dat_test[dat_test$pell == 1, ]  # Subset causing issue

# Attempt problematic operation
tryCatch({
  fit <- sem(MODEL_FULL, data = dat_test, ...)
  cat("BUG NOT REPRODUCED - model converged\n")
}, error = function(e) {
  cat("BUG REPRODUCED:", e$message, "\n")
})
EOF

# Step 2: Run it
Rscript reproduce_bug.R
```

### Why This Matters

| Without Reproduction | With Reproduction |
|---------------------|-------------------|
| Guessing at root cause | Confirmed understanding |
| Fix might be incomplete | Know exactly what to fix |
| Can't verify fix works | Clear pass/fail signal |
| Risk of regression | Becomes regression test |

---

# Phase 3: Fix

## 7. Plan the Fix

### Core Philosophy (from Anthropic SWE-bench)

> "Our design philosophy was to give as much control as possible to the language model itself, and keep the scaffolding minimal."

**Key Principles:**
1. **Minimal changes** — Only what's strictly necessary
2. **Error-proof edits** — Always use absolute paths
3. **String replacement** — Most reliable method
4. **One at a time** — Edit, verify, then next edit

### Plan Checklist

```
□ Root cause identified (exact file/line)
□ Fix is minimal and surgical
□ No disallowed changes required
□ Know exactly which file(s) to edit
□ Have reproduction ready for verification
```

---

## 8. Apply Edits

### String Replacement Method (Highest Reliability)

```
Rules:
- old_str must match EXACTLY one occurrence
- Include 3+ lines context before/after
- Be mindful of whitespace
- If not unique, replacement fails (this is a feature!)
```

### Edit Format Hierarchy

| Format | Best For | Reliability |
|--------|----------|-------------|
| `str_replace` | Targeted fixes | Highest |
| `whole file` | Major rewrites | High (token-heavy) |
| `unified diff` | Multi-location edits | Medium |

### Multi-Step Edit Protocol

```
For complex changes:
1. Make ONE edit at a time
2. Verify each edit compiles/runs
3. Run tests after each significant change
4. Commit working intermediate states
```

### Edit Tool Selection

```
replace_string_in_file:
  - Single location fix
  - Must include 3+ lines of context
  - oldString must be EXACT match

multi_replace_string_in_file:
  - Multiple fixes across files
  - More efficient than sequential calls
  - Same rules apply for each replacement
```

---

## 9. Handle Failures

### Self-Correction Loop

```
After each fix attempt:

1. Run verification (see Phase 4)
2. If FAIL:
   a. Analyze error output
   b. Did I misunderstand the bug?
   c. Did I miss a related location?
   d. Try DIFFERENT approach (not same fix twice)
3. Max attempts: 3-5
4. If stuck: break into smaller steps
```

### Retry Strategy (from Aider)

```
Attempt 1: Primary approach
Attempt 2: Alternative method
Attempt 3-5: Alternate approaches

If all fail, select best partial solution:
1. Solution with successful edit + verification pass
2. Solution with partial edit + verification pass
3. Solution with successful edit only
```

### When to Escalate

```
Escalate to human when:
- 3+ attempts with same error
- Context window filling up
- Multiple conflicting interpretations
- Requires domain knowledge not in codebase
```

---

# Phase 4: Verify

## 10. Run Verification Checks

### 🌐 Webapp: Five-Point Verification

```
After EVERY fix attempt:

□ 1. SYNTAX CHECK
     npx tsc --noEmit
     npm run lint

□ 2. REPRODUCTION TEST
     Run your reproduction script
     Confirm: "BUG NOT REPRODUCED" (fixed)

□ 3. UNIT TESTS
     npm test -- --watchAll=false

□ 4. BUILD CHECK
     npm run build
     Confirm no new warnings/errors

□ 5. EDGE CASES
     What inputs could break this fix?
     Does it handle null/undefined?
```

### 📊 R Pipeline: Five-Point Verification

```
After EVERY fix attempt:

□ 1. SYNTAX CHECK
     Rscript -e "parse('path/to/modified_file.R')"

□ 2. REPRODUCTION TEST
     Run your reproduction script
     Confirm: "BUG NOT REPRODUCED" (fixed)

□ 3. SMOKE TEST
     TABLE_CHECK_MODE=1 Rscript run_all_RQs_official.R
     Check verification_checklist.txt

□ 4. MODEL DIAGNOSTICS
     - No Heywood cases (negative variances)
     - No non-convergence warnings
     - Fit indices in expected range

□ 5. NAMING COMPLIANCE
     grep -r "QualInteract" --include="*.R"  # Should return nothing
     Confirm: x_FASt, credit_dose_c, XZ_c, EmoDiss, QualEngag, DevAdj
```

### Plausibility Check (from Aider SWE-bench)

A solution is "plausible" when:
- ✅ Editing completed successfully
- ✅ Syntax/lint passed
- ✅ Tests passed (that existed before)

If ANY fail → return to Phase 3, try different approach

---

## 11. Confirm & Document

### ✅ VERIFY Template (Required After Every Fix)

#### 🌐 Webapp

```
□ Bug repro now passes
□ `npm run lint` clean (0 errors)
□ `npx tsc --noEmit` clean  
□ No visual changes introduced
□ Only touched allowed files
□ Marked complete in BUGS.md with date
```

#### 📊 R Pipeline

```
□ Bug repro now passes
□ Syntax check passes
□ Smoke test completes without error
□ verification_checklist.txt shows all PASS
□ No banned terms introduced
□ Only touched allowed files
□ Marked complete in session_notes.md with date
```

### Update Bug Tracker

```markdown
**Status:** ✅ Fixed [DATE]
**Files Changed:**
- `path/to/file` - [brief description of change]
**Verification:** Repro passes, checks clean
```

### Final Checklist

```
□ All originally reported issues resolved
□ No new errors introduced
□ Changes are minimal and focused
□ Ready for human review
```

---

# Reference

## Tool-Specific Guidance

### VS Code Debugger (TypeScript/React)

**Setup:**
1. Open file to debug
2. Click Run/Debug icon (⌘⇧D / Ctrl+Shift+D)
3. Select "Debug: JavaScript Debug Terminal"

**Breakpoint Types:**
| Type | Use Case | How to Set |
|------|----------|------------|
| Line | Stop at specific line | Click gutter |
| Conditional | Stop when expression true | Right-click → Edit Condition |
| Logpoint | Log without stopping | Right-click → Add Logpoint |

**Navigation:**
| Action | Mac | Windows |
|--------|-----|---------|
| Continue/Pause | F5 | F5 |
| Step Over | F10 | F10 |
| Step Into | F11 | F11 |
| Step Out | ⇧F11 | Shift+F11 |
| Restart | ⇧⌘F5 | Ctrl+Shift+F5 |

### Chrome DevTools (React/Web)

**7-Step Process:**
1. **Reproduce** bug in browser
2. Open **Sources** (⌘⌥I → Sources tab)
3. Set **breakpoint** (click line number)
4. **Trigger** the action
5. **Step through** using toolbar
6. **Inspect** in Scope pane or Console
7. **Fix and verify**

### RStudio / R Debugging

**Interactive Debugging:**
```r
# Insert browser() to pause execution
my_function <- function(x) {
  browser()  # Execution pauses here
  result <- complex_operation(x)
  return(result)
}

# After error, inspect stack
traceback()

# Debug a specific function
debug(fit_sem_model)
undebug(fit_sem_model)
```

**lavaan-Specific Debugging:**
```r
# Check model identification
lavInspect(fit, "free")

# Examine starting values
lavInspect(fit, "start")

# Check for Heywood cases
lavInspect(fit, "est")$psi  # Look for negative diagonals

# Detailed convergence info
lavInspect(fit, "optim")
```

### Git Bisect (Finding Regressions)

```bash
git bisect start
git bisect bad HEAD              # Current is broken
git bisect good <commit-hash>    # This one worked
# Git checks out midpoint — test and mark:
git bisect good  # or: git bisect bad
# Repeat until culprit found
git bisect reset
```

---

## Error Pattern Recognition

### 🌐 TypeScript Common Errors

| Error | Likely Cause | Fix Strategy |
|-------|--------------|--------------|
| `Property 'x' does not exist` | Missing type definition | Add to interface or type assertion |
| `Type 'X' is not assignable` | Type mismatch | Check expected vs actual type |
| `Cannot find module` | Missing import/install | Add import or npm install |
| `Object is possibly undefined` | Null safety | Add optional chaining or null check |

### 🌐 React/Frontend Common Errors

| Error | Likely Cause | Fix Strategy |
|-------|--------------|--------------|
| `Invalid hook call` | Hooks outside component | Move to component body |
| `Cannot read property of undefined` | Missing data | Add loading/null states |
| `Maximum update depth exceeded` | Infinite loop | Check useEffect deps |
| `Each child should have unique key` | Missing key prop | Add key to mapped elements |

### 📊 R/lavaan Common Errors

| Error | Likely Cause | Fix Strategy |
|-------|--------------|--------------|
| `model did not converge` | Poor starting values, identification | Try `optim.method="nlminb"`, check identification |
| `covariance matrix not positive definite` | Heywood case, collinearity | Constrain variance > 0, check correlations |
| `model is not identified` | Too many free parameters | Add constraints, use marker variable |
| `missing values in observed variables` | NA handling | Use `missing = "fiml"` or impute |
| `lavaan WARNING: some estimated lv variances are negative` | Heywood case | Constrain variance, check model spec |

### 📊 R/lavaan Multi-Group Errors

| Error | Likely Cause | Fix Strategy |
|-------|--------------|--------------|
| `grouping variable has empty levels` | Missing factor levels | Use `droplevels()` or filter data |
| `some equality constraints are inconsistent` | Conflicting constraints | Review group-specific syntax |
| `sample covariance matrix is not positive-definite for group X` | Small n, outliers | Check group sizes, examine outliers |

### 📊 R Pipeline-Specific Errors

| Error | Likely Cause | Fix Strategy |
|-------|--------------|--------------|
| `object 'QualInteract' not found` | Banned term usage | Replace with `QualEngag` |
| `cannot open file '...'` | Wrong path, missing file | Check `OUT_BASE`, file existence |
| `Error in solve.default(...)` | Singular matrix | Check for perfect collinearity |

---

## Anti-Patterns to Avoid

### ❌ DO NOT

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| Fix without reproduction | Can't verify what you can't reproduce |
| Add too many files (>25k tokens) | Causes model distraction |
| Make assumptions | Always explore first, fix second |
| Repeat same failed approach | Try DIFFERENT solution after 2 failures |
| Ignore linter/syntax errors | They often point directly to the bug |
| Skip edge cases | The "fix" might create new bugs |
| Use relative paths | Always use absolute paths |
| Large multi-file changes at once | One file at a time, verify between each |
| Trust fix without verification | Hidden tests may still fail |

### 📊 R Pipeline-Specific Anti-Patterns

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| Change model spec without approval | Affects all downstream results |
| Use `QualInteract` anywhere | Banned term, use `QualEngag` |
| Ignore verification_checklist.txt | Contains critical validation checks |
| Skip centering verification | `*_c` vars must be mean-centered |
| Modify measurement syntax inconsistently | CFA and SEM must match exactly |

### Common Failure Modes

| Failure | Cause | Solution |
|---------|-------|----------|
| Fix works locally, fails in CI | Environment differences | Check CI logs, match environment |
| Fix introduces new bug | Incomplete understanding | More thorough reproduction |
| Fix is too narrow | Only handles reported case | Consider edge cases |
| Fix is too broad | Over-generalized solution | Be surgical, minimal changes |
| String replacement fails | Non-unique match | Add more context lines |

---

## References

- [Anthropic SWE-bench Research](https://www.anthropic.com/research/swe-bench-sonnet) - 49% SOTA methodology
- [SWE-bench Benchmark](https://github.com/princeton-nlp/SWE-bench) - Real-world GitHub issues
- [Aider Best Practices](https://github.com/Aider-AI/aider) - Edit formats and benchmarks
- [SWE-agent](https://github.com/SWE-agent/SWE-agent) - Agent scaffolding patterns
- [lavaan Documentation](https://lavaan.ugent.be/) - SEM in R

---

*Last updated: January 2026*  
*Version: 1.2 — Universal (Webapp + R Pipeline)*

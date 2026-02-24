# Code Quality Review

**Date:** 2026-02-24  
**Scope:** Full codebase audit for remaining issues

---

## Executive Summary

| Category | Status | Count |
|----------|--------|-------|
| ESLint warnings | Pending | 3 |
| jscpd clones | Pending | 7 |
| Lib coverage (≥80%) | Pass | All lib files meet threshold |
| API route tests | Pass | All 36 routes have tests |
| eslint-disable comments | Done | 7 with explanatory comments |

---

## 1. ESLint Warnings (3 remaining)

### Cognitive Complexity (limit 15)

| File | Line | Current | Action |
|------|------|---------|--------|
| `src/app/recipes/[id]/RecipeEditor.tsx` | 141 | 34 | Extract panel logic into sub-components (TeamRecipePanel, AgentRecipePanel) |
| `src/app/teams/[teamId]/team-editor.tsx` | 223 | 38 | Extract TeamEditor main body into tab panels or further split loadTeamTabData |
| `src/app/teams/[teamId]/team-editor.tsx` | 752 | 19 | Extract add-agent onClick handler into named function with sub-helpers |

---

## 2. jscpd Clones (7 remaining)

### RecipeEditor internal (3 clones)

- **Lines 382–393 vs 516–527**: Repeated `details`/`summary` pattern for expandable sections
- **Lines 566–580 vs 638–652**: Similar agent/cron job card structure
- **Lines 607–625 vs 674–692**: Duplicate field-rendering pattern

**Fix:** Extract `RecipePanel`, `ExpandableSection`, or `AgentCard`/`CronCard` components.

### recipes-client vs RecipeEditor (1 clone)

- **Lines 246–258 vs 274–286**: Shared recipe fetch/validation logic

**Fix:** Extract `useRecipeFetch` or `validateRecipeReady` into shared hook/util.

### recipes-client internal (1 clone)

- **Lines 269–281 vs 362–374**: Duplicate `waitForKitchenHealthy` / `waitForTeamPageReady`-style polling

**Fix:** Extract shared `pollUntil(fn, opts)` or consolidate into single `waitForReady` helper.

### CreateModalShell vs PublishChangesModal (1 clone)

- **Lines 28–38 vs 18–28**: Shared modal backdrop/layout structure

**Fix:** Both could use a shared `ModalBackdrop` or `BaseModal` component.

### ConfirmationModal vs CreateModalShell (1 clone)

- **Lines 42–65 vs 48–72**: Overlapping modal shell (backdrop, title, buttons)

**Fix:** CreateModalShell could wrap or extend ConfirmationModal, or share a `ModalShell` base.

---

## 3. Coverage

### Lib files (threshold: 80%)

All `src/lib/**/*.ts` files meet the 80% threshold. No action required.

### API route helpers (below 80%, not in threshold)

| File | Coverage | Note |
|------|----------|------|
| `src/app/api/recipes/team-agents/helpers.ts` | 39% | Consider adding unit tests for helpers |
| `src/app/api/scaffold/helpers.ts` | 58% | Complex; integration tests may be more practical |
| `src/app/api/agents/[id]/route.ts` | 65% | Route has tests; some branches uncovered |
| `src/app/api/teams/files/route.ts` | 65% | Same |
| `src/app/api/cron/helpers.ts` | 68% | buildIdToScopeMap, markOrphaned paths |

**Optional:** Add unit tests for helpers if they become a maintenance burden.

### Client components (0% – excluded from threshold)

React components and pages have 0% coverage. Vitest + jsdom can test these; current config focuses on lib and API. No immediate action unless component bugs arise.

---

## 4. API Route Test Coverage

All 36 API routes have test coverage. The `marketplace-recipes-route.test.ts` file covers both the list route and the `[slug]` route (GET_SLUG) with found, not-found, and error cases.

---

## 5. eslint-disable Usage

All 7 `react-hooks/exhaustive-deps` disables have explanatory comments. No action needed.

---

## 6. Refactor Report Findings

- **errorMessage util:** No raw `e instanceof Error ? e.message` patterns remain. Good.
- **Inline API body types:** None found. Good.
- **fetch + res.ok:** 12 fetch calls, 23 `if (!res.ok)` checks. Optional: add `fetchJson` helper for consistency.

---

## 7. New / Missed Items

### 7.1 fetchJson helper (optional)

Centralizing `fetch(url) -> res.json()` + `if (!res.ok) throw` could reduce duplication and standardize error handling. Low priority.

### 7.2 proxy.ts (0% coverage)

`src/proxy.ts` has 0% coverage. If it's used in production, consider adding tests. May be dev-only.

### 7.3 SonarJS no-duplicate-string

Currently `off` in some config (e.g. report/). If enabled project-wide, may surface new warnings. Review before enabling.

---

## Recommended Priority

| Priority | Item | Effort |
|----------|------|--------|
| 1 | Fix 3 ESLint cognitive-complexity warnings | High |
| 2 | RecipeEditor jscpd (extract RecipePanel, ExpandableSection) | Medium |
| 3 | recipes-client vs RecipeEditor shared logic | Low |
| 4 | CreateModalShell / PublishChangesModal / ConfirmationModal unification | Medium |
| 5 | Optional: fetchJson helper | Low |

---

## Verification Commands

```bash
npm run lint
npm run dup:check
npm run test:run
npm run coverage
npm run refactor:report
```

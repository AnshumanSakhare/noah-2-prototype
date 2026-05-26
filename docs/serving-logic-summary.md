# Question Serving Logic Summary

This document outlines how the diagnostic assessment app selects and balances questions, and details recent updates to topic test sizes and difficulty balancing.

---

## 1. General Serving Rules

* **Topic Tests:** Dynamic size based on Learning Objectives (LOs), capped at **12 questions**.
* **Grade Tests:** Hard limit of **22 questions** per grade test.
* **Format Mixing:** Avoids consecutive identical formats (e.g. MCQ, fitb, MCQ, drag_drop) to maintain user engagement.

---

## 2. Topic Test Selection Flow

1. **Size Target:** Total questions count is `Math.min(12, LO count * 3)`.
2. **Difficulty Targets:** Targets are split equally in a 1:1:1 ratio across difficulty bands (e.g., 4 Easy, 4 Medium, 4 Hard for a 12-question test).
3. **Interactive Target:** Aims to allocate 1/3 of the test size to interactive question types (e.g., `fitb` and `drag_drop`), if available in the database.
4. **Learning Objective Coverage:** Performs round-robin selection across available LOs within each difficulty band to ensure even conceptual coverage.

---

## 3. Key Issues Resolved

### Issue A: Test Size Explosion
* **Problem:** Database LO names contain detailed, granular text causing the unique LO count to balloon (e.g., 351 unique LOs in G8 Geometry). The previous formula (`LO count * 3`) scaled linearly without bounds, serving up to 373 questions for a single test.
* **Fix:** Capped the calculated topic test size to a maximum of **12 questions** in `lib/quiz-counts.ts`.

### Issue B: Difficulty Imbalance (Starvation)
* **Problem:** Under a 12-question limit, the previous loop selected questions sequentially (`easy` -> `medium` -> `hard`). It attempted to satisfy a large LO-based target (e.g. 26) from the `easy` band first, consuming all 12 slots and leaving 0 questions for `medium` and `hard`.
* **Fix:** Decoupled target counts from LO counts. The algorithm now calculates strict difficulty targets first (4 Easy, 4 Medium, 4 Hard) and runs round-robin separately within each band.

### Issue C: Duplicate Catalog Entries
* **Problem:** Questions in the database for the same topic exist under different subjects (e.g., `'Geometry'` and `'Maths'`), which both normalize to `'Maths'` in the catalog helper, creating duplicate entries with the same React composite keys.
* **Fix:** Grouped and merged catalog entries resolving to the same normalized subject, classLevel, and topic at the query load stage in `loadDiagnosticQuizCatalog`.

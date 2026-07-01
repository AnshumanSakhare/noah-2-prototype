# Geometry homework batch

Generates + auto-reviews + auto-fixes the **9 interactive games per topic** (3 difficulties × 3 indexes) for the homework agent, with a vision review tuned for **geometry** (diagram correctness, label overlap, clutter, text/space, clipping).

**By default it runs all 8 Grade-7/8 geometry topics (= 72 games)** and writes one combined report. To run just one topic (pilot mode), pass `PILOT_TOPIC` (see below). Edit the `ALL_TOPICS` list at the top of `run.ts` to change the set.

## What it does (per slot)

1. **Brainstorm** an idea → `POST /api/admin/generator/ideas`
2. **Generate** the game → `POST /api/admin/generator/generate` (`action=create`, geometry `customPrompt`)
3. **Hydrate** the template (same substitution the homework runner uses)
4. **Render** at the real 760×520 stage with Playwright → PNG screenshot
5. **Review** the screenshot with a vision model against a geometry rubric (`fitsStage`, `diagramCorrect`, `labelsLegible`, `notCluttered`, `textConcise`)
6. **Auto-fix**: on `fix`, regenerate with the review issues as feedback (up to `MAX_FIX`), re-review
7. **Report** → `out/report.html` (thumbnails + verdict + issues) + `out/results.json`

## Prerequisites

```bash
# 1. install the new dev deps (playwright, tsx)
pnpm install
npx playwright install chromium

# 2. app must be running (the script calls its generator endpoints)
pnpm dev

# 3. env (same DB vars the app uses) + a vision key
#    DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / DB_PORT
#    OPENAI_API_KEY   (review model; REVIEW_MODEL default gpt-5.4)
```

> The generation step uses **your app's** configured provider (OpenAI or Bedrock via `lib/llm.ts`). The **review** step uses OpenAI vision directly — so it needs `OPENAI_API_KEY` even if the app runs on Bedrock. Override the reviewer with `REVIEW_MODEL`.

## Run

```bash
# default: ALL 8 geometry topics (72 games)
pnpm geometry:pilot

# single topic only (pilot mode)
PILOT_GRADE=8 PILOT_TOPIC="Properties of Quadrilaterals" pnpm geometry:pilot
```

Then open `scripts/geometry-pilot/out/report.html`. The report is written **incrementally after each topic**, so you can watch progress and it survives a mid-run crash.

## Tuning knobs (env)

| Var | Default | Purpose |
|-----|---------|---------|
| `PILOT_GRADE` / `PILOT_TOPIC` | `7` / `Pythagoras Theorem` | which topic |
| `BASE_URL` | `http://localhost:3000` | app origin |
| `REVIEW_MODEL` | `gpt-5.4` | vision reviewer |
| `MAX_FIX` | `2` | regenerate attempts on a failing review |

The geometry generation guidance and the review rubric live at the top of `run.ts` — tune those after the first run, then re-run.

## Scaling to all 8 topics

Once the pilot looks good, loop the topic list (Grade 7: Geometric Constructions, Lines & Angles, Properties of Triangles, Pythagoras Theorem; Grade 8: 3D Shapes & Mensuration, Geometric Constructions, Perimeter Area & Volume, Properties of Quadrilaterals) — e.g. a shell loop over `PILOT_TOPIC`, or lift `main()` to iterate an array. Generated games land in `question_templates` / `question_variations` as `draft` / `verifier_status=pending`; publish the ones that pass.

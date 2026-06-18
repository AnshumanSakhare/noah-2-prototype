---
name: eduquest-game
description: Generate ONE self-contained, interactive, colorful HTML math game for a given grade (KG–8) and topic name. Use whenever the user gives a grade + topic and wants to build, scaffold, or test a single homework "game", "interactive question", "interactive simulation", or "mini math game". Output is one standalone .html file with static (non-variation) values, in a strict house format so every game looks like the same product. Do NOT use for variation JSON, DB schema, or batch pipelines — this makes one static testing artifact only.
---

# EduQuest Game Generator (standalone)

Given **a grade (KG–8)** and **a topic name**, output exactly ONE complete, standalone `.html` file: a single interactive math game with **static, hardcoded, grade-correct values** that is playable the moment it opens.

Everything you need is in THIS file. There are no other files to read. Copy the skeleton in the APPENDIX, fill only the marked zones, run the mental checklist, save to `/mnt/user-data/outputs/`, and present it.

The #1 job is **consistency + delight**: colorful and friendly, but minimal and uncluttered. Every game must look like it came from one product, regardless of grade or topic.

---

## Workflow (do this every time)

1. Pick **one** interaction archetype (table below) that fits the topic + grade.
2. Set values from the **grade band** (ranges, vocab, modality, pedagogical guards).
3. Copy the **APPENDIX skeleton** verbatim as your starting point. Never write the shell from scratch — the shell is what guarantees consistency.
4. Fill ONLY: `{{TOPIC}}`, `{{GRADE}}`, the instruction line, the stage content, and the three JS functions. Leave tokens/zones untouched.
5. Run the **Self-check** list below. Fix every ❌ before presenting.
6. Save to `/mnt/user-data/outputs/<topic>_g<grade>.html` and present with `present_files`.

---

## HARD RULES (never break — these are the consistency contract)

1. **Fixed stage — and EVERYTHING fits inside it.** The play area `.game` is exactly **760 × 520 px**, centered, with body margin/padding 0 and overflow hidden. CRITICAL: ALL content — the prompt figure, the numbers, AND the option/answer controls — MUST fit within that **520px height with NOTHING clipped**. Budget the vertical space: focal figure/illustration ≤ ~280px tall, big display numbers ≤ ~64px, the answer controls (buttons/slots) ≤ ~110px, with comfortable gaps. If the layout feels tall, shrink the figure and fonts until the bottom row of controls is fully visible. A game whose buttons are cut off at the bottom is a FAILURE.
2. **No Headers or Footers.** Do NOT include any game headers (no titles, eyebrows, or instruction texts) or footers (no reset buttons, hint lines, or modality notes). The host application (Homework Runner/Builder) provides headers, instructions, reset buttons, and feedback.
3. **Tokens only.** All color/spacing/radius/font come from the CSS variables in the skeleton's `:root`. **No raw hex/rgb outside `:root`. No off-scale font sizes. No inline `style=` for color/background/font.**
4. **One file, no network.** Everything inline. No external CSS/JS/fonts/images, no CDN, no `fetch`. Graphics = **clean inline SVG preferred**; emoji only as a rare accent (≤1–2 total), never the main visual language.
4b. **Minimal, modern, NOT cartoonish.** Favor flat, geometric, line/soft-fill SVG (think tidy app icons, not glossy 3D emoji or busy storybook scenes). No emoji-soup, no decorative animal pile-ups, no heavy gradients/shadows on every object. Calm, clean, premium — even at KG.
5. **One interaction primitive.** Exactly one archetype per game. Never combine drag + sort + MCQ.
6. **Self-contained state.** The game must track its state and answer correctly in vanilla JS. When an answer is chosen or changed, it must immediately call `checkAnswer()`.
7. **Parameterized values — never scatter hardcoded literals.** Define every question-specific value (numbers, labels, figure measurements, correct answer, distractors) ONCE in a single named config object / constants block at the top of the script, and derive all on-screen text, the SVG figure, and the answer logic from it. Use real, grade-correct values so the file is playable on open — but keep them single-source: never repeat the same literal in two places, never sprinkle bare numbers through the markup/JS, and never leave raw `{{placeholders}}` in a standalone file. (This is the RULE 14 contract — it is what lets the pipeline swap values to make variations.)
8. **Accessibility floor.** Every interactive element is keyboard-reachable AND pointer/touch-usable. Touch targets ≥ 44×44 px. Decorative emoji get `aria-hidden="true"`.
9. **No dialogs or feedback text.** Never `alert()`, `prompt()`, `confirm()`, or write text feedback inside the game HTML.
10. **Drag needs a tap fallback.** Any drag/sequence game must also work by tap-to-pick then tap-to-place.
11. **No decorative clutter.** Do NOT scatter random floating dots, blobs, stray bars, glows, "ghost" shapes, sparkles, or background confetti around the focal element. Every element on screen must be either the interactive content, a label the child needs, or the single clean panel/stage it sits on. If a mark isn't part of the question or the answer, delete it. Decoration ≠ random circles.
12. **Never reveal the answer — the STUDENT produces it.** The game must NOT auto-compute, auto-animate-to, or display the correct answer anywhere. Any number, counter, marker, or position shown must reflect ONLY the student's own current input/manipulation — never the target value. The child does the thinking; the game just captures their choice. (A self-solving "watch it compute" demo belongs to the learn/recap phase, NOT a graded question.) Example — for "23 − 8 = ?": ❌ a bar that drains itself and shows "15"; ✅ the child sets a marker / builds a count / taps a chip, and the only number shown is the one THEY set.
13. **Shuffle the option order — never lay the answer out predictably.** The on-screen sequence of choices/tiles/chips/slots/items MUST be scrambled so the correct answer is NOT findable from position alone. Concretely:
    - **tap-select / MCQ:** do NOT place the correct choice first, last, or in a fixed slot, and do NOT list choices as a tidy ascending/descending ladder (e.g. `2, 4, 6, 8` with the answer always at one end). Mix the order; the correct value can sit anywhere.
    - **drag-drop / fill-slot:** the draggable tiles must NOT appear in the same order as their target bins/slots (no straight-down 1:1 alignment). Lay the source tiles in a different order than the answer order — e.g. for tiles `27, 64, 125` → roots `3, 4, 5`, render the tiles as `64, 27, 125` (or any non-aligned order), never `27, 64, 125` directly above `3, 4, 5`.
    - **sequence-order:** the items must START shuffled (out of order) — that's the whole task; never render them already in the correct sequence.
    - Distractors must be plausible and interleaved with the correct answer, not grouped or sorted. Because `getState()` keys off stable `id`s (see ID convention), scrambling the DISPLAY order never affects grading. A game whose answer can be guessed from layout position is a FAILURE.
14. **Build it variation-ready — isolate the values that change.** Author every game so a LATER variation can be produced by swapping values only, never by rewriting structure or logic. Keep every question-specific value — the numbers, the labels, the figure's key measurements, the correct answer, and the distractors — in ONE clearly-named place (a small data object / constants at the top of the script) and reference it everywhere; never hardcode the same value in two spots. Layout, interaction wiring, and answer-checking must depend ONLY on those named values, so changing the values yields a valid new question with the same look and mechanics. Where practical, DRIVE the SVG figure from those values (e.g. the side lengths set the triangle's geometry) so a new variation redraws correctly instead of showing a stale picture. Keep the choice/item set and their stable `id`s structured identically across variations (same ids, different values). This is the contract the variation pipeline relies on.

---

## Look & feel: colorful but minimal

- **Colorful** = use the playful accent palette (`--c-grape`, `--c-sky`, `--c-mango`, `--c-rose`, `--c-mint`) for game tokens, correct/active states, and one or two focal moments. Friendly, rounded, soft.
- **Minimal** = ~55–65% whitespace, ONE focal cluster, short text, no score/timer/lives/confetti-walls unless the topic truly needs them. The reference games win by doing ONE clear thing.
- **Minimal layout ≠ minimal imagination.** A minimal layout should still carry the idea's creative hook — a character, scenario, or visual metaphor — expressed *through* the single focal cluster (e.g. the choices ARE the monsters' tummies, the token IS the sleepy star). If a selected idea/blueprint specifies a theme, honor it with **minimal SVG** (emoji sparingly, if at all) inside the existing interaction, never by adding extra elements, steps, or clutter. A subtle, clean metaphor beats a busy cartoon.
- Soft shadows only (`--shadow`). Transitions 120–200 ms ease-out. Rounded corners everywhere.
- KG–2: bigger tokens, simple friendly **SVG shapes/icons** (minimal emoji), fewer words. Grades 6–8: smaller tokens, more symbols/abstraction, denser is OK.
- Use multiple accent colors for distinct items (e.g., sortable blocks), but keep `--c-grape` as the primary "brand" accent so games stay coherent.
- **Earn every mark.** Whitespace is the design — do not fill it with decorative dots, blobs, glows, or floating accents. A clean shape on empty space reads as premium; the same shape surrounded by random circles reads as broken. When in doubt, remove.

---

## Rendering shapes, figures & diagrams (geometry, fractions, number lines)

When the question shows a geometric figure (polygon, angle, line), a fraction bar, a number line, or any drawn diagram, render it as **clean inline SVG** — this is the focal object, so make it crisp:

- **One figure, centered, generous padding.** Give the SVG a `viewBox` and let the figure sit in the middle with empty margin around it. No background pattern, no accent dots near it, no glow behind it.
- **Crisp, consistent strokes.** One uniform stroke width (≈ 3–4 px visual), `stroke-linejoin="round"` and `stroke-linecap="round"`, stroke color from a token (default `--c-grape`). Fill the interior with a soft token tint (e.g. `--c-grape-soft`/`--c-sky-soft`) or leave it white — never a harsh saturated fill.
- **Correct, regular geometry.** Compute real coordinates so a "hexagon" is a regular hexagon, a "right angle" is actually 90°, sides that should be equal are equal. Don't eyeball lopsided polygons.
- **Label only what the question needs.** Vertex dots, side ticks, or angle arcs are allowed ONLY when the concept requires them — and then they are precise (a small dot exactly on a vertex), not scattered decoration. If the child doesn't need a mark to answer, omit it.
- **Size to the stage.** The figure should occupy a comfortable focal area (roughly 240–360 px), not fill the whole 760×520 and not be tiny. Options/choices go below it with clear spacing.
- **Match the grade aesthetic.** KG–2 may use a chunkier stroke and a friendly fill; grades 6–8 stay thin, precise, and academic — closer to a textbook diagram than a cartoon.

---

## Interaction archetypes (pick exactly ONE)

| Archetype | Child action | Best for |
|---|---|---|
| **tap-select** | Taps one/N options | comparing, "which is…", identify, MCQ, true/false |
| **drag-drop** | Drags item onto a target zone | sorting into bins, matching, balancing, placing |
| **fill-slot** | Puts a value into a blank | symbols (>/=/<), missing number, equation blank |
| **sequence-order** | Orders items in a row | ordering, smallest→biggest, steps, patterns |
| **build-count** | Adds/removes units to a target | counting, place value, ten-frames, build-a-number |
| **number-line** | Places a marker on a line | estimation, rounding, fractions, integers |
| **partition** | Splits a whole / groups items | fractions, division, equal sharing |

**JS contract** — every game implements all three so output stays uniform:
- `getState()` → child's current answer in the **canonical Output shape for the chosen archetype** (table below)
- `checkAnswer()` → compare to the static `CORRECT`, update `#feedback` + visual state
- `resetGame()` → restore initial state

**Canonical Output shapes** — `getState()` MUST return exactly this for the chosen archetype (the homework server grades by matching it to the stored answer):

| Archetype | `getState()` returns |
|---|---|
| **tap-select** | `{ selected: value }` — or `{ selected: [values] }` for multi-select |
| **drag-drop** | `{ placements: { "<itemId>": "<binId>" } }` |
| **fill-slot** | `{ slots: { "<slotId>": value } }` |
| **sequence-order** | `{ order: ["<itemId>", …] }` |
| **build-count** | `{ count: number }` |
| **number-line** | `{ position: number }` |
| **partition** | `{ parts: [number, …] }` |

Set `CORRECT` to the inner value (e.g. for tap-select `const CORRECT = 8;` and compare `getState().selected === CORRECT`). Never return a bare scalar — always wrap it in the canonical object above.

**ID convention.** Any set of choices/items/bins/slots must carry a stable `id`, and `getState()` must return those **ids** — never labels, raw display values, or array positions. This keeps the stored answer valid even if a label is edited or the display order is shuffled (e.g. tap a button wired `onclick="pick('o6')"` and `getState()` returns `{ selected: 'o6' }`).

Wire `checkAnswer()` to the natural completion action (final tap / drop / slot-fill), or to an explicit "Check" button for multi-step archetypes.

Every game MUST check `window.SILENT_MODE` before showing correctness feedback. When `window.SILENT_MODE` is truthy, the game must suppress visual correctness indicators (no green/red styles, no checkmark/cross emojis) and feedback messages, and instead highlight the selection with a neutral style and notify the parent:

```javascript
function checkAnswer(el) {
  if (window.SILENT_MODE) {
    // In homework mode: highlight selection with neutral style (e.g. outline/background with var(--c-grape)), no green/red
    if (el) el.style.outline = '3px solid var(--c-grape)';
    // Send answer to parent for server-side grading
    window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: getState() }, '*');
    return;
  }
  // Normal mode: show correct/incorrect visual feedback (outline/style only)
  if (getState() === CORRECT) {
    if (el) { el.style.outline = '3px solid var(--c-good)'; el.classList.add('is-pop'); }
  } else {
    if (el) { el.style.outline = '3px solid var(--c-bad)'; el.classList.add('is-shake'); setTimeout(()=>el.classList.remove('is-shake'),260); }
  }
}
```

Rules:
1. If `window.SILENT_MODE === true`, do NOT reveal correct/incorrect feedback or show green/red colors.
2. Use a neutral highlight (e.g. grape outline) for the selected option — no green, no red.
3. Always call `window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: getState() }, '*')` to pass the answer up.
4. The `checkAnswer()` function must still run, but skip the success/failure indicators.
5. Even in standalone mode, never auto-compute or pre-fill the answer (see HARD RULE 12). The game presents the question and captures the student's input; it does not solve itself.

---

## Grade bands (set values from here)

| Grade | Number range | Allowed ops | Reading | Tokens | Default modality |
|---|---|---|---|---|---|
| **KG** | 0–10 | count, compare | pre-reader, ≤6 words, picture-first | huge, dots/simple SVG shapes | tap, big targets |
| **1** | 0–20 | +, − (no regrouping) | very simple, ≤10 words | big, dots+numerals | tap, simple drag |
| **2** | 0–100 | +, −, intro × | simple sentences | medium | tap, drag |
| **3** | 0–1,000 | ×, ÷, unit fractions | short sentences | numerals | drag, fill |
| **4** | 0–10,000 | multi-digit ×÷, fractions, intro decimals | paragraph ok | numerals/symbols | fill, number-line |
| **5** | decimals, fractions | all 4 ops, mixed numbers | full sentences | symbolic | fill, partition, number-line |
| **6** | negatives, ratios, % | integers, ratio, percent | abstract ok | symbolic, compact | number-line, fill |
| **7** | rationals | expressions, proportions, basic algebra | abstract | symbolic | fill, number-line |
| **8** | reals, exponents | linear eq, functions, roots | abstract | dense symbolic | fill, number-line, partition |

**Pedagogical guards (hard):** no visible negatives at grade ≤5 unless the topic IS integers (6+); no subtraction giving negatives below grade 6; no regrouping in grade-1 ±; unit fractions only at grade 3; decimals not before grade 4; percent/ratio/negatives not before grade 6; KG–1 instruction ≤ ~10 words. Pick numbers with a clear, unambiguous correct answer.

---

## Self-check before presenting (every item must pass)

- [ ] `.game` is exactly `760px × 520px` centered, body has no margins/padding.
- [ ] No hex/rgb color anywhere outside `:root`. No inline `style=` for color/bg/font. No off-scale font sizes.
- [ ] No external URL / `<link>` / external `<script src>` / `fetch` / remote image.
- [ ] Exactly ONE interaction archetype.
- [ ] `getState()`, `checkAnswer()`, `resetGame()` all implemented; `CORRECT` is set.
- [ ] Stage is present, headers/footers/feedback blocks are NOT included in the HTML.
- [ ] No `alert/prompt/confirm` or text feedback inside.
- [ ] Every interactive element keyboard-focusable and tap-friendly (≥44px). Decorative emoji `aria-hidden`.
- [ ] If drag/sequence: tap fallback works.
- [ ] Options/tiles/items are SHUFFLED (HARD RULE 13): correct choice not first/last/fixed, choices not a sorted ladder, drag tiles not aligned 1:1 above their target bins.
- [ ] Values are parameterized (one named config source, no scattered literals) and correct for the grade; guards respected.
- [ ] Colorful (accent palette used on focal items) but minimal (one focal cluster, lots of whitespace).

---

## APPENDIX — mandatory skeleton (copy verbatim, fill only marked zones)

Replace `{{TOPIC}}`, `{{GRADE}}`, the instruction text, the `STAGE` content, and the three JS functions. Do not touch `:root`, the zone classes, or the stage dimensions. The example content shown (a tap-select comparison) is illustrative — replace it with your chosen archetype.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TOPIC}} — Grade {{GRADE}}</title>
<style>
  /* === DESIGN TOKENS — do not edit, do not add raw colors elsewhere === */
  :root{
    --c-bg:#FFFFFF; --c-panel:#F6F7FB; --c-panel-2:#EDEFF7; --c-border:#E5E7F0;
    --c-ink-1:#20243A; --c-ink-2:#52586F; --c-ink-3:#A0A4B8;
    /* playful accent palette — use these on game tokens & focal states */
    --c-grape:#6C5CE7; --c-grape-soft:#ECEAFE;   /* primary brand accent */
    --c-sky:#3BA7F5;   --c-sky-soft:#E4F2FE;
    --c-mango:#FF9F43; --c-mango-soft:#FFF1E2;
    --c-rose:#FF6B9A;  --c-rose-soft:#FFE6EF;
    --c-mint:#22C8A8;  --c-mint-soft:#DEF8F2;
    --c-good:#16B981; --c-good-soft:#DDF7EE; --c-bad:#F0556B; --c-bad-soft:#FFE4E8;
    --s-1:4px;--s-2:8px;--s-3:12px;--s-4:16px;--s-5:24px;--s-6:32px;--s-7:48px;
    --r-sm:8px;--r-md:12px;--r-lg:16px;--r-xl:24px;--r-pill:999px;
    --text-sm:13px;--text-md:16px;--text-lg:20px;--text-xl:24px;--text-display:56px;
    --shadow:0 1px 2px rgba(20,24,58,.05);--shadow-pop:0 6px 18px rgba(108,92,231,.18);
    --ease:cubic-bezier(.22,.61,.36,1);
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    background:var(--c-bg);color:var(--c-ink-1);min-height:100vh;display:flex;
    align-items:center;justify-content:center;padding:0;overflow:hidden}
  
  .game{width:760px;height:520px;max-width:100%;display:flex;flex-direction:column;
    align-items:center;justify-content:center;position:relative}

  /* STAGE — fixed 760×520, do not change */
  .game__stage{width:100%;height:100%;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:var(--s-5);position:relative}

  /* REUSABLE PIECES — extend, keep the look */
  .token{display:inline-flex;align-items:center;justify-content:center;min-width:88px;height:88px;
    background:var(--c-panel);border:1px solid var(--c-border);border-radius:var(--r-lg);
    font-size:var(--text-display);font-weight:800;color:var(--c-ink-1);box-shadow:var(--shadow)}
  .token--grape{background:var(--c-grape);color:#fff;border-color:transparent;box-shadow:var(--shadow-pop)}
  .token--sky{background:var(--c-sky);color:#fff;border-color:transparent}
  .token--mango{background:var(--c-mango);color:#fff;border-color:transparent}
  .slot{display:inline-flex;align-items:center;justify-content:center;min-width:88px;height:88px;
    border:2px dashed var(--c-border);border-radius:var(--r-md);color:var(--c-ink-3);font-size:var(--text-xl);transition:.15s var(--ease)}
  .slot.is-filled{border-style:solid;border-color:var(--c-grape);background:var(--c-grape-soft);color:var(--c-ink-1)}
  .choice{display:flex;align-items:center;gap:var(--s-3);min-width:240px;background:var(--c-panel);
    border:1px solid var(--c-border);border-radius:var(--r-md);padding:var(--s-3) var(--s-4);
    font-size:var(--text-md);font-weight:600;color:var(--c-ink-1);cursor:pointer;transition:.15s var(--ease)}
  .choice:hover{background:var(--c-panel-2);transform:translateY(-1px)}
  .choice.is-correct{outline:3px solid var(--c-good);background:var(--c-good-soft)}
  .choice.is-wrong{outline:3px solid var(--c-bad);background:var(--c-bad-soft)}
  .choice:focus-visible,.token:focus-visible,.slot:focus-visible{outline:3px solid var(--c-grape-soft);outline-offset:2px}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
  .is-shake{animation:shake .25s var(--ease)} .is-pop{animation:pop .25s var(--ease)}
</style>
</head>
<body>
  <main class="game" role="application" aria-label="{{TOPIC}} game for grade {{GRADE}}">
    <!-- STAGE — build ONE chosen archetype here. Example below = tap-select. -->
    <section class="game__stage" id="stage">
      <div style="display:flex;gap:var(--s-6);align-items:center">
        <button class="token token--grape is-pop" type="button" onclick="pick(8,this)" aria-label="8">8</button>
        <span class="game__instruction" aria-hidden="true">vs</span>
        <button class="token token--sky" type="button" onclick="pick(5,this)" aria-label="5">5</button>
      </div>
    </section>
  </main>

<script>
  /* === INTERACTION CONTRACT — implement all three === */
  /* This example is tap-select. getState() returns the CANONICAL output { selected: value }. */
  const CORRECT = 8;            // the static correct inner value for THIS game
  let chosen = null;

  function getState(){ return { selected: chosen }; }

  function pick(val, el){
    chosen = val; checkAnswer(el);
  }

  function checkAnswer(el){
    if (window.SILENT_MODE) {
      if (el) el.style.outline = '3px solid var(--c-grape)';
      window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: getState() }, '*');
      return;
    }

    // Standalone mode correctness checks (compare the inner value)
    if(getState().selected === CORRECT){
      if (el) { el.style.outline = '3px solid var(--c-good)'; el.classList.add('is-pop'); }
    } else {
      if (el) { el.style.outline = '3px solid var(--c-bad)'; el.classList.add('is-shake'); setTimeout(()=>el.classList.remove('is-shake'),260); }
    }
  }

  function resetGame(){
    chosen = null;
    document.querySelectorAll('.is-pop,.is-shake').forEach(n=> {
      n.classList.remove('is-pop','is-shake');
      n.style.outline = '';
    });
  }
</script>
</body>
</html>
```
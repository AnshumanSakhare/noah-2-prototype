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

1. **Fixed stage.** The play area `.game__stage` is exactly **760 × 520 px**, centered. Content fits; never scroll inside it.
2. **Tokens only.** All color/spacing/radius/font come from the CSS variables in the skeleton's `:root`. **No raw hex/rgb outside `:root`. No off-scale font sizes. No inline `style=` for color/background/font.**
3. **One file, no network.** Everything inline. No external CSS/JS/fonts/images, no CDN, no `fetch`. Graphics = emoji or inline SVG only.
4. **One interaction primitive.** Exactly one archetype per game. Never combine drag + sort + MCQ.
5. **Self-contained correctness.** The correct answer and a visible correct/retry state are implemented in vanilla JS in the file. No server.
6. **Static values.** Real numbers/words — NOT `{{placeholders}}` in the playable content. Playable on open.
7. **Accessibility floor.** Every interactive element is keyboard-reachable AND pointer/touch-usable. Touch targets ≥ 44×44 px. Decorative emoji get `aria-hidden="true"`. Feedback uses `aria-live`.
8. **No dialogs.** Never `alert()`, `prompt()`, `confirm()`. Feedback goes into `#feedback`.
9. **Drag needs a tap fallback.** Any drag/sequence game must also work by tap-to-pick then tap-to-place, with a footer note saying so.

---

## Look & feel: colorful but minimal

- **Colorful** = use the playful accent palette (`--c-grape`, `--c-sky`, `--c-mango`, `--c-rose`, `--c-mint`) for game tokens, correct/active states, and one or two focal moments. Friendly, rounded, soft.
- **Minimal** = ~55–65% whitespace, ONE focal cluster, short text, no score/timer/lives/confetti-walls unless the topic truly needs them. The reference games win by doing ONE clear thing.
- Soft shadows only (`--shadow`). Transitions 120–200 ms ease-out. Rounded corners everywhere.
- KG–2: bigger tokens, more emoji/pictures, fewer words. Grades 6–8: smaller tokens, more symbols/abstraction, denser is OK.
- Use multiple accent colors for distinct items (e.g., sortable blocks), but keep `--c-grape` as the primary "brand" accent so games stay coherent.

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
- `getState()` → child's current answer as a plain value/array
- `checkAnswer()` → compare to the static `CORRECT`, update `#feedback` + visual state
- `resetGame()` → restore initial state

Wire `checkAnswer()` to the natural completion action (final tap / drop / slot-fill), or to an explicit "Check" button for multi-step archetypes.

---

## Grade bands (set values from here)

| Grade | Number range | Allowed ops | Reading | Tokens | Default modality |
|---|---|---|---|---|---|
| **KG** | 0–10 | count, compare | pre-reader, ≤6 words, picture-first | huge, dots/emoji | tap, big targets |
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

- [ ] `.game__stage` is exactly `760px × 520px`; nothing scrolls inside it.
- [ ] No hex/rgb color anywhere outside `:root`. No inline `style=` for color/bg/font. No off-scale font sizes.
- [ ] No external URL / `<link>` / external `<script src>` / `fetch` / remote image.
- [ ] Exactly ONE interaction archetype.
- [ ] `getState()`, `checkAnswer()`, `resetGame()` all implemented; `CORRECT` is set.
- [ ] Header (title + instruction), stage, footer, and `#feedback` zones all present.
- [ ] No `alert/prompt/confirm`. Feedback writes to `#feedback` with a good + retry state.
- [ ] Every interactive element keyboard-focusable and tap-friendly (≥44px). Decorative emoji `aria-hidden`.
- [ ] If drag/sequence: tap fallback works AND footer states the modality.
- [ ] Values are static and correct for the grade; guards above respected.
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
    align-items:flex-start;justify-content:center;padding:var(--s-6) var(--s-4)}
  .game{width:760px;max-width:100%}

  /* HEADER */
  .game__header{padding-bottom:var(--s-4);border-bottom:1px solid var(--c-border);margin-bottom:var(--s-6)}
  .game__eyebrow{font-size:var(--text-sm);font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--c-grape);margin-bottom:var(--s-2)}
  .game__title{font-size:var(--text-xl);font-weight:800;letter-spacing:-.01em}
  .game__instruction{font-size:var(--text-md);color:var(--c-ink-2);margin-top:var(--s-2);line-height:1.4}

  /* STAGE — fixed 760×520, do not change */
  .game__stage{width:760px;height:520px;max-width:100%;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:var(--s-5);position:relative}

  /* FOOTER */
  .game__footer{margin-top:var(--s-6);display:flex;align-items:center;justify-content:space-between;gap:var(--s-4)}
  .game__hint{font-size:var(--text-sm);font-style:italic;color:var(--c-ink-3)}
  #feedback{font-size:var(--text-md);font-weight:700;min-height:1.4em;text-align:center;transition:color .15s var(--ease)}
  #feedback.is-good{color:var(--c-good)} #feedback.is-bad{color:var(--c-bad)}

  /* REUSABLE PIECES — extend, keep the look */
  .btn-reset{font-size:var(--text-sm);font-weight:600;color:var(--c-ink-3);background:var(--c-panel);
    border:1px solid var(--c-border);border-radius:var(--r-md);padding:var(--s-2) var(--s-4);cursor:pointer;transition:.15s var(--ease)}
  .btn-reset:hover{background:var(--c-panel-2);color:var(--c-ink-2)}
  .banner{width:100%;background:var(--c-grape-soft);border:1px solid var(--c-border);border-radius:var(--r-md);
    padding:var(--s-3) var(--s-4);text-align:center;color:var(--c-ink-2);font-weight:600}
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
  .choice.is-correct{background:var(--c-good-soft);border-color:var(--c-good)}
  .choice.is-wrong{background:var(--c-bad-soft);border-color:var(--c-bad)}
  .choice:focus-visible,.token:focus-visible,.slot:focus-visible{outline:3px solid var(--c-grape-soft);outline-offset:2px}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
  .is-shake{animation:shake .25s var(--ease)} .is-pop{animation:pop .25s var(--ease)}
</style>
</head>
<body>
  <main class="game" role="application" aria-label="{{TOPIC}} game for grade {{GRADE}}">
    <!-- HEADER -->
    <header class="game__header">
      <!-- optional: <p class="game__eyebrow">Interactive</p> -->
      <h1 class="game__title">{{TOPIC}}</h1>
      <p class="game__instruction"><!-- grade-appropriate, short instruction --></p>
    </header>

    <!-- STAGE — build ONE chosen archetype here. Example below = tap-select. -->
    <section class="game__stage" id="stage">
      <div style="display:flex;gap:var(--s-6);align-items:center">
        <button class="token token--grape is-pop" type="button" onclick="pick(8,this)" aria-label="8">8</button>
        <span class="game__instruction" aria-hidden="true">vs</span>
        <button class="token token--sky" type="button" onclick="pick(5,this)" aria-label="5">5</button>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="game__footer">
      <p class="game__hint" id="hint"><!-- modality note for drag; else short tip --></p>
      <button class="btn-reset" type="button" onclick="resetGame()">Reset</button>
    </footer>
    <p id="feedback" aria-live="polite"></p>
  </main>

<script>
  /* === INTERACTION CONTRACT — implement all three === */
  const CORRECT = 8;            // the static correct answer for THIS game
  let chosen = null;

  function getState(){ return chosen; }

  function pick(val, el){
    chosen = val; checkAnswer(el);
  }

  function checkAnswer(el){
    const fb = document.getElementById('feedback');
    if(getState() === CORRECT){
      fb.textContent = 'Yes! 8 is the bigger number. 🎉'; fb.className='is-good';
      if(el){ el.classList.add('is-pop'); }
    } else {
      fb.textContent = 'Not quite — which is bigger? Try again!'; fb.className='is-bad';
      if(el){ el.classList.add('is-shake'); setTimeout(()=>el.classList.remove('is-shake'),260); }
    }
  }

  function resetGame(){
    chosen = null;
    const fb = document.getElementById('feedback'); fb.textContent=''; fb.className='';
    document.querySelectorAll('.is-pop,.is-shake').forEach(n=>n.classList.remove('is-pop','is-shake'));
  }
</script>
</body>
</html>
```
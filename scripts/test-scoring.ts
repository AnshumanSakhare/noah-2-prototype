// Quick dev harness for the scoring engine — no DB, no LLM.
// Run: npx tsx scripts/test-scoring.ts
import { scoreAnswer, EvaluationSpec } from "../lib/scoring";

let pass = 0;
let fail = 0;

function check(name: string, spec: EvaluationSpec, output: any, expected: number) {
  const { performance } = scoreAnswer(spec, output);
  const ok = performance === expected;
  console.log(`${ok ? "✅" : "❌"} ${name} → got ${performance}, expected ${expected}`);
  ok ? pass++ : fail++;
}

// tap-select (single) — binary
check("tap-select correct", { type: "tap-select", scoring: "binary", answer: "A" }, { selected: "A" }, 100);
check("tap-select wrong", { type: "tap-select", scoring: "binary", answer: "A" }, { selected: "B" }, 0);
check("tap-select numeric", { type: "tap-select", answer: 8 }, { selected: "8" }, 100);

// tap-select (multi) — partial
check("multi all correct", { type: "tap-select", scoring: "partial", answer: ["a", "b"] }, { selected: ["a", "b"] }, 100);
check("multi half + wrong", { type: "tap-select", scoring: "partial", answer: ["a", "b"] }, { selected: ["a", "x"] }, 0); // (1-1)/2 = 0
check("multi one of two", { type: "tap-select", scoring: "partial", answer: ["a", "b"] }, { selected: ["a"] }, 50);

// drag-drop — partial
check("drag all", { type: "drag-drop", answer: { apple: "A", ball: "B" } }, { placements: { apple: "A", ball: "B" } }, 100);
check("drag half", { type: "drag-drop", answer: { apple: "A", ball: "B" } }, { placements: { apple: "A", ball: "A" } }, 50);

// fill-slot — partial, numeric-aware
check("fill all", { type: "fill-slot", answer: { s1: 5, s2: ">" } }, { slots: { s1: "5", s2: ">" } }, 100);
check("fill half", { type: "fill-slot", answer: { s1: 5, s2: ">" } }, { slots: { s1: "4", s2: ">" } }, 50);

// sequence-order — partial, positional
check("seq perfect", { type: "sequence-order", answer: [1, 2, 3] }, { order: [1, 2, 3] }, 100);
check("seq one off", { type: "sequence-order", answer: [1, 2, 3] }, { order: [1, 3, 2] }, 33);

// build-count — binary
check("count correct", { type: "build-count", answer: 7 }, { count: 7 }, 100);
check("count wrong", { type: "build-count", answer: 7 }, { count: 6 }, 0);

// number-line — tolerance band on [0,1]
check("nl exact", { type: "number-line", answer: 0.75, min: 0, max: 1 }, { position: 0.75 }, 100);
check("nl within full band", { type: "number-line", answer: 0.75, min: 0, max: 1 }, { position: 0.76 }, 100); // 1% err
check("nl far off", { type: "number-line", answer: 0.75, min: 0, max: 1 }, { position: 0.2 }, 0); // >10% err
check("nl mid falloff", { type: "number-line", answer: 0.5, min: 0, max: 1 }, { position: 0.56 }, 50); // 6% err → ~50

// partition — order-independent multiset
check("partition match", { type: "partition", answer: [2, 2, 2] }, { parts: [2, 2, 2] }, 100);
check("partition reordered", { type: "partition", answer: [1, 2, 3] }, { parts: [3, 1, 2] }, 100);
check("partition half", { type: "partition", answer: [1, 2, 3, 4] }, { parts: [1, 2, 9, 9] }, 50);

// robustness
check("null output → 0", { type: "tap-select", answer: "A" }, null, 0);
check("bare scalar normalized", { type: "build-count", answer: 3 }, 3, 100);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

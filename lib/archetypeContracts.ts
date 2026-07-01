// ─────────────────────────────────────────────────────────────────────────────
// Archetype contracts — the ONE thing that is invariant per interaction type:
// the canonical Output shape (what getState() returns) and the matching
// evaluation_spec.answer shape.
//
// Input (props_schema / variation_data) is intentionally NOT fixed here — the
// visual content genuinely varies per game (a hexagon SVG vs two number tokens
// vs emoji clocks all share the same tap-select OUTPUT). So only output_schema is
// server-owned; props_schema stays AI-authored.
//
// The real discipline is the ID CONVENTION: any set of choices/items/bins carries
// a stable `id`, and getState()/answer reference those ids (never labels or
// positions). That keeps answers stable across label edits and display shuffles.
// ─────────────────────────────────────────────────────────────────────────────

import { CanonicalType } from "./scoring";

// Server-owned snapshot written into question_templates_1.output_schema.
export const OUTPUT_SCHEMA: Record<CanonicalType, object> = {
  "tap-select": { type: "tap-select", fields: { selected: "optionId — or [optionId, ...] when multi:true" } },
  "drag-drop": { type: "drag-drop", fields: { placements: "{ [itemId]: binId }" } },
  "fill-slot": { type: "fill-slot", fields: { slots: "{ [slotId]: paletteId }" } },
  "sequence-order": { type: "sequence-order", fields: { order: "[itemId, ...]" } },
  "build-count": { type: "build-count", fields: { count: "number" } },
  "number-line": { type: "number-line", fields: { position: "number" } },
  "partition": { type: "partition", fields: { parts: "[number, ...]" } },
};

// Per-archetype prompt block injected into the generator system prompt. Defines
// the id-based input convention, the getState() shape, the evaluation_spec.answer
// shape, and one concrete filled example.
const CONTRACT: Record<CanonicalType, string> = {
  "tap-select": `ARCHETYPE CONTRACT — tap-select
INPUT (variation_data): include an "options" array; each option is { "id": <stable id>, "label": <text>, "emoji"?: <emoji> }. Add a boolean "multi" (false for single-select). Render any extra visual context the question needs (a shape SVG, two number tokens, a clock) ABOVE the options — but the tappable choices MUST be options[] and each onclick passes that option's id.
getState() MUST return: { "selected": "<optionId>" }  (single)  OR  { "selected": ["<optionId>", ...] }  (when multi:true).
evaluation_spec: { "type":"tap-select", "scoring":"binary" (single) | "partial" (multi), "answer": "<optionId>"  OR  ["<optionId>", ...] }.
The "answer" MUST reference option ids that exist in variation_data.options.
EXAMPLE:
  variation_data: { "question_text":"Which shape is the hexagon?", "multi":false, "options":[ {"id":"o6","label":"Hexagon"}, {"id":"o5","label":"Pentagon"}, {"id":"o4","label":"Quadrilateral"} ] }
  getState(): { "selected":"o6" }
  evaluation_spec: { "type":"tap-select","scoring":"binary","answer":"o6" }`,

  "drag-drop": `ARCHETYPE CONTRACT — drag-drop
INPUT (variation_data): an "items" array (each { "id", "label", "emoji"? }) and a "bins" array (each { "id", "label" }). Items are draggable; bins are targets. MUST also support tap-to-pick then tap-to-place.
getState() MUST return: { "placements": { "<itemId>": "<binId>", ... } } using the ids.
evaluation_spec: { "type":"drag-drop", "scoring":"partial", "answer": { "<itemId>":"<binId>", ... } } — scored as % of items in the correct bin.
Answer keys are item ids and values are bin ids that exist in variation_data.
EXAMPLE:
  variation_data: { "question_text":"Sort by time of day", "items":[{"id":"wake","label":"Wake up","emoji":"🌅"},{"id":"bed","label":"Bedtime","emoji":"🌙"}], "bins":[{"id":"am","label":"Morning"},{"id":"pm","label":"Night"}] }
  getState(): { "placements": { "wake":"am", "bed":"pm" } }
  evaluation_spec: { "type":"drag-drop","scoring":"partial","answer":{ "wake":"am","bed":"pm" } }`,

  "fill-slot": `ARCHETYPE CONTRACT — fill-slot
INPUT (variation_data): an "expression" display string containing slot markers like {{s1}}; a "slots" array (each { "id", "accepts" }); and a "palette" array of placeable values (each { "id", "label" }). The stored slot VALUE is ALWAYS the palette item's id (NOT its label).
getState() MUST return: { "slots": { "<slotId>": "<paletteId>", ... } }.
evaluation_spec: { "type":"fill-slot", "scoring":"partial", "answer": { "<slotId>":"<paletteId>", ... } } — scored as % of slots correct.
EXAMPLE:
  variation_data: { "question_text":"Put the right symbol", "expression":"8 {{s1}} 5", "slots":[{"id":"s1","accepts":"symbol"}], "palette":[{"id":"gt","label":">"},{"id":"eq","label":"="},{"id":"lt","label":"<"}] }
  getState(): { "slots": { "s1":"gt" } }
  evaluation_spec: { "type":"fill-slot","scoring":"partial","answer":{ "s1":"gt" } }`,

  "sequence-order": `ARCHETYPE CONTRACT — sequence-order
INPUT (variation_data): an "items" array (each { "id", "label", "emoji"? }) shown in a single row; optional "direction". The child reorders them. MUST support tap-to-pick then tap-to-place as a fallback.
getState() MUST return: { "order": ["<itemId>", ...] } — the item ids in the child's current order.
evaluation_spec: { "type":"sequence-order", "scoring":"partial", "answer": ["<itemId>", ...] } — the correct order; scored as % of positions correct.
EXAMPLE:
  variation_data: { "question_text":"Order smallest to biggest", "items":[{"id":"n5","label":"5"},{"id":"n2","label":"2"},{"id":"n9","label":"9"}] }
  getState(): { "order":["n2","n5","n9"] }
  evaluation_spec: { "type":"sequence-order","scoring":"partial","answer":["n2","n5","n9"] }`,

  "build-count": `ARCHETYPE CONTRACT — build-count
INPUT (variation_data): a "unit" (emoji/label for one item), "min", "max", optional "start". The child adds/removes units toward a target.
getState() MUST return: { "count": <number> }.
evaluation_spec: { "type":"build-count", "scoring":"binary", "answer": <number> }.
EXAMPLE:
  variation_data: { "question_text":"Put 7 apples in the basket", "unit":"🍎", "min":0, "max":10, "start":0 }
  getState(): { "count":7 }
  evaluation_spec: { "type":"build-count","scoring":"binary","answer":7 }`,

  "number-line": `ARCHETYPE CONTRACT — number-line
INPUT (variation_data): "line_min", "line_max", "step" (snap increment, 0 = continuous), optional "ticks". ONE horizontal line; the child drags a single marker.
getState() MUST return: { "position": <number> }.
evaluation_spec: { "type":"number-line", "scoring":"partial", "answer": <correctPosition>, "min": <line_min>, "max": <line_max> }.
IMPORTANT: "min"/"max" are the LINE'S RANGE (equal to line_min/line_max), NOT a narrow accept-band. The server gives full credit within ~2% of the range and fades to 0 at ~10%. Do NOT set min/max to a tight band around the answer.
EXAMPLE:
  variation_data: { "question_text":"Where does 30 go?", "line_min":0, "line_max":100, "step":1, "ticks":[0,50,100] }
  getState(): { "position":30 }
  evaluation_spec: { "type":"number-line","scoring":"partial","answer":30,"min":0,"max":100 }`,

  "partition": `ARCHETYPE CONTRACT — partition
INPUT (variation_data): a "whole" (total to split, e.g. 12; or 1 for a shape), "num_parts", optional "mode" ("equal-share" | "fraction-bar" | "groups"). The child splits the whole into parts/shares.
getState() MUST return: { "parts": [<number>, ...] } — the size of each part.
evaluation_spec: { "type":"partition", "scoring":"partial", "answer": [<number>, ...] } — order-independent; scored as % of parts matching.
EXAMPLE:
  variation_data: { "question_text":"Share 12 cookies on 3 plates", "whole":12, "num_parts":3, "mode":"equal-share" }
  getState(): { "parts":[4,4,4] }
  evaluation_spec: { "type":"partition","scoring":"partial","answer":[4,4,4] }`,
};

export function archetypeContract(type: CanonicalType): string {
  return CONTRACT[type] || "";
}

// Best-effort cross-validation: does evaluation_spec.answer reference ids/values
// that actually exist in variation_data? Returns an error string, or null if OK.
// Lenient — only fails on clear violations, skips checks when the referenced keys
// are absent (props_schema is flexible, so not every game has every key).
export function validateAnswerConsistency(
  type: CanonicalType,
  variationData: any,
  evaluationSpec: any
): string | null {
  const answer = evaluationSpec?.answer;
  const vd = variationData || {};

  const idSet = (arr: any): Set<string> =>
    new Set((Array.isArray(arr) ? arr : []).map((o: any) => String(o?.id)));

  switch (type) {
    case "tap-select": {
      if (!Array.isArray(vd.options)) return null;
      const ids = idSet(vd.options);
      const picks = Array.isArray(answer) ? answer : [answer];
      const bad = picks.filter((p) => !ids.has(String(p)));
      return bad.length ? `answer references unknown option id(s): ${bad.join(", ")}` : null;
    }
    case "drag-drop": {
      if (!Array.isArray(vd.items) || !Array.isArray(vd.bins)) return null;
      if (!answer || typeof answer !== "object") return "answer must be an {itemId:binId} map";
      const items = idSet(vd.items);
      const bins = idSet(vd.bins);
      for (const [item, bin] of Object.entries(answer)) {
        if (!items.has(item)) return `answer references unknown item id: ${item}`;
        if (!bins.has(String(bin))) return `answer references unknown bin id: ${bin}`;
      }
      return null;
    }
    case "fill-slot": {
      if (!Array.isArray(vd.slots) || !Array.isArray(vd.palette)) return null;
      if (!answer || typeof answer !== "object") return "answer must be a {slotId:paletteId} map";
      const slots = idSet(vd.slots);
      const palette = idSet(vd.palette);
      for (const [slot, val] of Object.entries(answer)) {
        if (!slots.has(slot)) return `answer references unknown slot id: ${slot}`;
        if (!palette.has(String(val))) return `answer references unknown palette id: ${val}`;
      }
      return null;
    }
    case "sequence-order": {
      if (!Array.isArray(vd.items)) return null;
      if (!Array.isArray(answer)) return "answer must be an array of item ids";
      const ids = idSet(vd.items);
      const bad = answer.filter((a) => !ids.has(String(a)));
      if (bad.length) return `answer references unknown item id(s): ${bad.join(", ")}`;
      if (answer.length !== ids.size) return `answer length (${answer.length}) must equal item count (${ids.size})`;
      return null;
    }
    case "build-count": {
      if (typeof answer !== "number") return "answer must be a number";
      if (typeof vd.max === "number" && answer > vd.max) return `answer ${answer} exceeds max ${vd.max}`;
      if (typeof vd.min === "number" && answer < vd.min) return `answer ${answer} below min ${vd.min}`;
      return null;
    }
    case "number-line": {
      if (typeof answer !== "number") return "answer must be a number";
      const min = Number(evaluationSpec.min);
      const max = Number(evaluationSpec.max);
      if (Number.isNaN(min) || Number.isNaN(max)) return "number-line evaluation_spec must include numeric min and max (the line range)";
      if (answer < Math.min(min, max) || answer > Math.max(min, max)) return `answer ${answer} is outside the line range [${min}, ${max}]`;
      return null;
    }
    case "partition": {
      if (!Array.isArray(answer)) return "answer must be an array of numbers";
      if (typeof vd.num_parts === "number" && answer.length !== vd.num_parts) return `answer has ${answer.length} parts, expected num_parts ${vd.num_parts}`;
      if (typeof vd.whole === "number") {
        const sum = answer.reduce((s: number, n: any) => s + Number(n), 0);
        if (sum !== vd.whole) return `parts sum to ${sum}, expected whole ${vd.whole}`;
      }
      return null;
    }
    default:
      return null;
  }
}

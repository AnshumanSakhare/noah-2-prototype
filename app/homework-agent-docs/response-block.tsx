"use client";

import { useState } from "react";
import { highlightCode } from "./code-block";

/**
 * Response block with a Shape / Real-data toggle.
 * `shape` = generic placeholders; `real` = actual values pulled from the question bank.
 */
export function ResponseBlock({
  label = "Response",
  shape,
  real,
  lang = "json",
}: {
  label?: string;
  shape: string;
  real: string;
  lang?: "json" | "sql";
}) {
  const [tab, setTab] = useState<"real" | "shape">("real");
  const code = tab === "real" ? real : shape;

  const tabBtn = (key: "real" | "shape", text: string) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className="rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors"
        style={{
          backgroundColor: active
            ? "color-mix(in oklab, var(--accent-purple) 16%, transparent)"
            : "transparent",
          color: active ? "var(--accent-purple)" : "var(--text-dim)",
        }}
      >
        {text}
      </button>
    );
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div
          className="font-mono text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "var(--text-dim)" }}
        >
          {label}
        </div>
        <div
          className="flex items-center gap-1 rounded-xl p-1"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          {tabBtn("real", "Real data")}
          {tabBtn("shape", "Shape")}
        </div>
      </div>
      <pre
        className="overflow-x-auto rounded-2xl p-4 text-[12.5px] leading-relaxed"
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        <code>{highlightCode(code, lang)}</code>
      </pre>
    </div>
  );
}

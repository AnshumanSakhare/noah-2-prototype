import type { ReactNode } from "react";

/** GitHub-light-ish palette for code tokens. */
const COLORS = {
  key: "#8250df", // json property names / sql types — purple
  string: "#0a7d33", // strings — green
  number: "#0550ae", // numbers — blue
  keyword: "#cf222e", // json true/false/null & sql keywords — red
  comment: "#6e7781", // comments — gray
  punct: "var(--text)", // braces, brackets, commas — default text
};

/** Lightweight JSON(-ish) highlighter. Handles // comments, keys, strings, numbers, keywords. */
function highlightJson(code: string): ReactNode[] {
  const tokenRe =
    /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b/g;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard exec loop
  while ((m = tokenRe.exec(code)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={key++} style={{ color: COLORS.punct }}>
          {code.slice(last, m.index)}
        </span>,
      );
    }
    const [full, comment, str, num, kw] = m;
    if (comment !== undefined) {
      out.push(
        <span key={key++} style={{ color: COLORS.comment, fontStyle: "italic" }}>
          {comment}
        </span>,
      );
    } else if (str !== undefined) {
      const isKey = /^\s*:/.test(code.slice(m.index + full.length));
      out.push(
        <span key={key++} style={{ color: isKey ? COLORS.key : COLORS.string }}>
          {str}
        </span>,
      );
    } else if (num !== undefined) {
      out.push(
        <span key={key++} style={{ color: COLORS.number }}>
          {num}
        </span>,
      );
    } else if (kw !== undefined) {
      out.push(
        <span key={key++} style={{ color: COLORS.keyword }}>
          {full}
        </span>,
      );
    }
    last = m.index + full.length;
  }
  if (last < code.length) {
    out.push(
      <span key={key++} style={{ color: COLORS.punct }}>
        {code.slice(last)}
      </span>,
    );
  }
  return out;
}

const SQL_KEYWORDS = new Set([
  "CREATE", "TABLE", "PRIMARY", "KEY", "DEFAULT", "NOT", "NULL", "UNIQUE",
  "CHECK", "IN", "REFERENCES", "FOREIGN", "CONSTRAINT", "AND", "OR",
]);
const SQL_TYPES = new Set([
  "UUID", "TEXT", "JSONB", "JSON", "INTEGER", "INT", "TIMESTAMPTZ", "TIMESTAMP",
  "SMALLINT", "BIGINT", "BOOLEAN", "SERIAL", "NUMERIC",
]);

/** Lightweight SQL highlighter. Handles -- comments, 'strings', keywords, types, numbers. */
function highlightSql(code: string): ReactNode[] {
  const tokenRe =
    /(--[^\n]*)|('(?:[^'\\]|\\.)*')|(\d+)|([A-Za-z_][A-Za-z0-9_]*)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard exec loop
  while ((m = tokenRe.exec(code)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={key++} style={{ color: COLORS.punct }}>
          {code.slice(last, m.index)}
        </span>,
      );
    }
    const [full, comment, str, num, word] = m;
    if (comment !== undefined) {
      out.push(
        <span key={key++} style={{ color: COLORS.comment, fontStyle: "italic" }}>
          {comment}
        </span>,
      );
    } else if (str !== undefined) {
      out.push(
        <span key={key++} style={{ color: COLORS.string }}>
          {str}
        </span>,
      );
    } else if (num !== undefined) {
      out.push(
        <span key={key++} style={{ color: COLORS.number }}>
          {num}
        </span>,
      );
    } else if (word !== undefined) {
      const up = word.toUpperCase();
      const color = SQL_KEYWORDS.has(up)
        ? COLORS.keyword
        : SQL_TYPES.has(up)
          ? COLORS.key
          : COLORS.punct;
      out.push(
        <span key={key++} style={{ color, fontWeight: color === COLORS.keyword ? 600 : 400 }}>
          {full}
        </span>,
      );
    }
    last = m.index + full.length;
  }
  if (last < code.length) {
    out.push(
      <span key={key++} style={{ color: COLORS.punct }}>
        {code.slice(last)}
      </span>,
    );
  }
  return out;
}

export function CodeBlock({
  label,
  code,
  lang = "json",
}: {
  label?: string;
  code: string;
  lang?: "json" | "sql";
}) {
  const nodes = lang === "sql" ? highlightSql(code) : highlightJson(code);
  return (
    <div className="mt-4">
      {label && (
        <div
          className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "var(--text-dim)" }}
        >
          {label}
        </div>
      )}
      <pre
        className="overflow-x-auto rounded-2xl p-4 text-[12.5px] leading-relaxed"
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        <code>{nodes}</code>
      </pre>
    </div>
  );
}

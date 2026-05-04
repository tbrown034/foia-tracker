// Minimal CSV writer — no external dependency.
// Wraps any value containing comma, quote, or newline in double-quotes,
// and doubles internal quotes per RFC 4180.

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(
  rows: Record<string, unknown>[],
  columns?: string[]
): string {
  if (rows.length === 0 && !columns) return "";
  const cols = columns ?? Object.keys(rows[0] ?? {});
  const lines: string[] = [cols.join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => escapeCell(row[c])).join(","));
  }
  return lines.join("\n") + "\n";
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}

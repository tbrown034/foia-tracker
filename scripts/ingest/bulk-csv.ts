import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { parse } from "csv-parse/sync";
import AdmZip from "adm-zip";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = neon(url);

const FIRST_YEAR = 2008;
const LAST_YEAR = 2024;
const RAW_DIR = resolve(process.cwd(), "data/raw");

const ANNUAL_CSV = "foia-received-processed-and-pending-foia-requests.csv";
const OLDEST_CSV =
  "foia-pending-requests-ten-oldest-pending-perfected-requests.csv";
const EXEMPTIONS_CSV =
  "foia-disposition-of-foia-requests-number-of-times-exemptions-applied.csv";
const PERSONNEL_CSV = "foia-foia-personnel.csv";

function toInt(s: unknown): number | null {
  if (s == null) return null;
  const cleaned = String(s).replace(/[",\s]/g, "");
  if (cleaned === "" || cleaned.toLowerCase() === "n/a" || cleaned === "<1")
    return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(s: unknown): number | null {
  if (s == null) return null;
  const cleaned = String(s).replace(/[",\s]/g, "");
  if (cleaned === "" || cleaned.toLowerCase() === "n/a") return null;
  if (cleaned === "<1") return 0.5;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toDate(s: unknown): string | null {
  if (s == null) return null;
  const t = String(s).trim().replace(/^"|"$/g, "");
  if (!t || t.toLowerCase() === "n/a") return null;
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const usMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

async function fetchZip(year: number): Promise<Buffer> {
  const cachePath = resolve(RAW_DIR, `all_agencies_csv_${year}.zip`);
  if (existsSync(cachePath)) return readFileSync(cachePath);
  const zipUrl = `https://www.foia.gov/downloads/all_agencies_csv_${year}.zip`;
  process.stdout.write(`  fetching ${zipUrl}... `);
  const res = await fetch(zipUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${zipUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(cachePath, buf);
  process.stdout.write(`${buf.length} bytes\n`);
  return buf;
}

function extractCsv(zipBuf: Buffer, name: string): string | null {
  const zip = new AdmZip(zipBuf);
  const base = name.replace(/\.csv$/, "");
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exact = new RegExp(`(^|/)${escaped}\\.csv$`);
  const suffixed = new RegExp(`(^|/)${escaped}\\s*\\(\\d+\\)\\.csv$`);
  const entries = zip.getEntries();
  const exactMatch = entries.find((e) => exact.test(e.entryName));
  const suffixMatch = entries.find((e) => suffixed.test(e.entryName));
  const match = exactMatch ?? suffixMatch;
  return match ? match.getData().toString("utf8") : null;
}

function splitConcatenatedCsv(csv: string): string[] {
  const headerStarts: number[] = [];
  const re = /"Agency","Component","Fiscal Year"/g;
  for (const m of csv.matchAll(re)) {
    if (m.index !== undefined) headerStarts.push(m.index);
  }
  if (headerStarts.length <= 1) return [csv];
  return headerStarts.map((start, i) =>
    csv.slice(start, headerStarts[i + 1] ?? csv.length)
  );
}

function parseAll(csv: string): Record<string, string>[] {
  const sections = splitConcatenatedCsv(csv);
  const all: Record<string, string>[] = [];
  for (const section of sections) {
    const records = parse(section, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
    all.push(...records);
  }
  return all;
}

// Bulk upsert: one INSERT with multi-row VALUES per call. Postgres allows
// up to 65,535 placeholders per query; we chunk to stay well under.
async function bulkUpsert(
  table: string,
  columns: string[],
  rows: unknown[][],
  conflictKey: string[],
  updateColumns: string[]
): Promise<number> {
  if (rows.length === 0) return 0;
  const maxParamsPerQuery = 30000;
  const paramsPerRow = columns.length;
  const chunkSize = Math.max(1, Math.floor(maxParamsPerQuery / paramsPerRow));
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (const row of chunk) {
      const placeholderRow: string[] = [];
      for (let c = 0; c < columns.length; c++) {
        placeholderRow.push(`$${values.length + 1}`);
        values.push(row[c]);
      }
      placeholders.push(`(${placeholderRow.join(",")})`);
    }
    const setClause = updateColumns
      .map((c) => `${c} = EXCLUDED.${c}`)
      .concat(["ingested_at = now()"])
      .join(", ");
    const query = `
      INSERT INTO ${table} (${columns.join(",")})
      VALUES ${placeholders.join(",")}
      ON CONFLICT (${conflictKey.join(",")}) DO UPDATE SET ${setClause}
    `;
    await sql.query(query, values);
    inserted += chunk.length;
  }
  return inserted;
}

// ---------- Annual headline ----------

async function ingestAnnual(zipBuf: Buffer, year: number): Promise<number> {
  const csv = extractCsv(zipBuf, ANNUAL_CSV);
  if (!csv) return 0;
  const records = parseAll(csv);
  const rows: unknown[][] = [];
  for (const r of records) {
    if (!r["Agency"]) continue;
    rows.push([
      r["Agency"],
      r["Component"],
      toInt(r["Fiscal Year"]) ?? year,
      toInt(r["Number of Requests Pending as of Start of Fiscal Year"]),
      toInt(r["Number of Requests Received in Fiscal Year"]),
      toInt(r["Number of Requests Processed in Fiscal Year"]),
      toInt(r["Number of Requests Pending as of End of Fiscal Year"]),
    ]);
  }
  return bulkUpsert(
    "foia_annual",
    ["agency", "component", "fiscal_year", "pending_start", "received", "processed", "pending_end"],
    rows,
    ["agency", "component", "fiscal_year"],
    ["pending_start", "received", "processed", "pending_end"]
  );
}

// ---------- Ten oldest pending ----------

const OLDEST_RANK_LABELS = [
  "10th Oldest",
  "9th Oldest",
  "8th Oldest",
  "7th Oldest",
  "6th Oldest",
  "5th Oldest",
  "4th Oldest",
  "3rd Oldest",
  "2nd Oldest",
  "Oldest",
];

async function ingestOldestPending(
  zipBuf: Buffer,
  year: number
): Promise<number> {
  const csv = extractCsv(zipBuf, OLDEST_CSV);
  if (!csv) return 0;
  const sections = splitConcatenatedCsv(csv);
  const rows: unknown[][] = [];
  for (const section of sections) {
    const records = parse(section, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as string[][];
    if (records.length === 0) continue;
    const header = records[0];
    const rankCols: { rank: number; dateCol: number; daysCol: number }[] = [];
    for (let i = 0; i < OLDEST_RANK_LABELS.length; i++) {
      const label = OLDEST_RANK_LABELS[i];
      const daysIdx = header.findIndex(
        (h) =>
          h.toLowerCase() === `${label} Number of Days Pending`.toLowerCase()
      );
      if (daysIdx < 0) continue;
      const dateIdx = daysIdx - 1;
      const rank = OLDEST_RANK_LABELS.length - i;
      rankCols.push({ rank, dateCol: dateIdx, daysCol: daysIdx });
    }
    if (rankCols.length === 0) continue;

    const agencyCol = header.findIndex((h) => h.toLowerCase() === "agency");
    const componentCol = header.findIndex((h) => h.toLowerCase() === "component");
    const fyCol = header.findIndex((h) => h.toLowerCase() === "fiscal year");

    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      const agency = row[agencyCol];
      if (!agency) continue;
      const component = row[componentCol] ?? "Agency Overall";
      const fy = toInt(row[fyCol]) ?? year;
      for (const rc of rankCols) {
        const date = toDate(row[rc.dateCol]);
        const days = toInt(row[rc.daysCol]);
        if (date == null && days == null) continue;
        rows.push([agency, component, fy, rc.rank, date, days]);
      }
    }
  }
  return bulkUpsert(
    "foia_oldest_pending",
    ["agency", "component", "fiscal_year", "rank", "date_received", "days_pending"],
    rows,
    ["agency", "component", "fiscal_year", "rank"],
    ["date_received", "days_pending"]
  );
}

// ---------- Exemptions ----------

const EXEMPTION_LABELS = [
  "Ex. 1", "Ex. 2", "Ex. 3", "Ex. 4", "Ex. 5", "Ex. 6",
  "Ex. 7(A)", "Ex. 7(B)", "Ex. 7(C)", "Ex. 7(D)", "Ex. 7(E)", "Ex. 7(F)",
  "Ex. 8", "Ex. 9",
];

async function ingestExemptions(
  zipBuf: Buffer,
  year: number
): Promise<number> {
  const csv = extractCsv(zipBuf, EXEMPTIONS_CSV);
  if (!csv) return 0;
  const records = parseAll(csv);
  const rows: unknown[][] = [];
  for (const r of records) {
    if (!r["Agency"]) continue;
    const fy = toInt(r["Fiscal Year"]) ?? year;
    for (const label of EXEMPTION_LABELS) {
      if (!(label in r)) continue;
      const count = toInt(r[label]);
      if (count == null) continue;
      rows.push([r["Agency"], r["Component"], fy, label, count]);
    }
  }
  return bulkUpsert(
    "foia_exemptions",
    ["agency", "component", "fiscal_year", "exemption", "invocations"],
    rows,
    ["agency", "component", "fiscal_year", "exemption"],
    ["invocations"]
  );
}

// ---------- Personnel ----------

async function ingestPersonnel(
  zipBuf: Buffer,
  year: number
): Promise<number> {
  const csv = extractCsv(zipBuf, PERSONNEL_CSV);
  if (!csv) return 0;
  const records = parseAll(csv);
  const rows: unknown[][] = [];
  for (const r of records) {
    if (!r["Agency"]) continue;
    const fy = toInt(r["Fiscal Year"]) ?? year;
    const fullTime = toInt(r['Number of "Full-Time FOIA Employees"']);
    const equiv = toFloat(r['Number of "Equivalent Full-Time FOIA Employees"']);
    const total = toFloat(r['Total Number of "Full-Time FOIA Staff"']);
    if (fullTime == null && equiv == null && total == null) continue;
    rows.push([r["Agency"], r["Component"], fy, fullTime, equiv, total]);
  }
  return bulkUpsert(
    "foia_personnel",
    ["agency", "component", "fiscal_year", "full_time", "equivalent_fte", "total_fte"],
    rows,
    ["agency", "component", "fiscal_year"],
    ["full_time", "equivalent_fte", "total_fte"]
  );
}

// ---------- Main ----------

async function main() {
  const [logRow] = (await sql`
    INSERT INTO sync_log (source, started_at, status)
    VALUES ('bulk-csv', now(), 'running')
    RETURNING id
  `) as { id: number }[];
  const logId = logRow.id;

  const totals = { annual: 0, oldest: 0, exemptions: 0, personnel: 0 };
  try {
    for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
      const t0 = Date.now();
      console.log(`\nFY${year}`);
      const zipBuf = await fetchZip(year);
      const a = await ingestAnnual(zipBuf, year);
      const o = await ingestOldestPending(zipBuf, year);
      const e = await ingestExemptions(zipBuf, year);
      const p = await ingestPersonnel(zipBuf, year);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  annual=${a} oldest=${o} exemptions=${e} personnel=${p} (${dt}s)`);
      totals.annual += a;
      totals.oldest += o;
      totals.exemptions += e;
      totals.personnel += p;
    }
    const grandTotal = totals.annual + totals.oldest + totals.exemptions + totals.personnel;
    await sql`
      UPDATE sync_log SET ended_at = now(), records = ${grandTotal}, status = 'ok'
      WHERE id = ${logId}
    `;
    console.log(`\nDone.`);
    console.log(`  annual:     ${totals.annual}`);
    console.log(`  oldest:     ${totals.oldest}`);
    console.log(`  exemptions: ${totals.exemptions}`);
    console.log(`  personnel:  ${totals.personnel}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`
      UPDATE sync_log SET ended_at = now(), status = 'error', error = ${message}
      WHERE id = ${logId}
    `;
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

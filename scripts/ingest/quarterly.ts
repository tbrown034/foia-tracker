import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");
const apiKey = process.env.FOIA_API_KEY;
if (!apiKey) {
  console.error(
    "FOIA_API_KEY is not set. Get one at https://api.data.gov/signup/ and add it to .env.local."
  );
  process.exit(1);
}

const sql = neon(dbUrl);

const QUARTERS: { fy: number; q: number }[] = [
  { fy: 2026, q: 2 },
  { fy: 2026, q: 1 },
  { fy: 2025, q: 4 },
  { fy: 2025, q: 3 },
  { fy: 2025, q: 2 },
  { fy: 2025, q: 1 },
  { fy: 2024, q: 4 },
  { fy: 2024, q: 3 },
];

type Row = {
  agency: string;
  component: string;
  fiscal_year: number;
  fiscal_quarter: number;
  received: number | null;
  processed: number | null;
  backlog: number | null;
};

function toInt(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

type JsonApiResource = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<
    string,
    {
      data: { id: string; type: string } | { id: string; type: string }[] | null;
    }
  >;
};

type JsonApiDoc = {
  data: JsonApiResource[];
  included?: JsonApiResource[];
  links?: { next?: { href: string } };
};

async function fetchQuarter(fy: number, q: number): Promise<Row[]> {
  const params = new URLSearchParams();
  params.set("filter[field_quarterly_year]", String(fy));
  params.set("filter[field_quarterly_quarter]", String(q));
  params.set("include", "field_agency");
  params.set("page[limit]", "200");
  let url: string | undefined =
    `https://api.foia.gov/api/quarterly_foia_report?${params.toString()}`;

  const rows: Row[] = [];
  while (url) {
    const res = await fetch(url, { headers: { "X-API-Key": apiKey! } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status} for ${url}: ${body.slice(0, 200)}`);
    }
    const doc: JsonApiDoc = await res.json();
    const included = new Map<string, JsonApiResource>();
    for (const inc of doc.included ?? []) included.set(`${inc.type}:${inc.id}`, inc);

    for (const item of doc.data) {
      const agencyRef = item.relationships?.field_agency?.data;
      const agencyEntity =
        agencyRef && !Array.isArray(agencyRef)
          ? included.get(`${agencyRef.type}:${agencyRef.id}`)
          : undefined;
      const agencyName = (agencyEntity?.attributes?.name as string) ?? "";
      if (!agencyName) continue;

      const a = item.attributes;
      rows.push({
        agency: agencyName,
        component: "Agency Overall",
        fiscal_year: fy,
        fiscal_quarter: q,
        received: toInt(a.field_quarterly_received_oa),
        processed: toInt(a.field_quarterly_processed_oa),
        backlog: toInt(a.field_quarterly_backlogged_oa),
      });
    }
    url = doc.links?.next?.href;
  }
  return rows;
}

async function upsert(rows: Row[]): Promise<void> {
  for (const r of rows) {
    if (!r.agency) continue;
    await sql`
      INSERT INTO foia_quarterly (agency, component, fiscal_year, fiscal_quarter, received, processed, backlog)
      VALUES (${r.agency}, ${r.component}, ${r.fiscal_year}, ${r.fiscal_quarter}, ${r.received}, ${r.processed}, ${r.backlog})
      ON CONFLICT (agency, component, fiscal_year, fiscal_quarter) DO UPDATE SET
        received = EXCLUDED.received,
        processed = EXCLUDED.processed,
        backlog = EXCLUDED.backlog,
        ingested_at = now()
    `;
  }
}

async function main() {
  const [logRow] = (await sql`
    INSERT INTO sync_log (source, started_at, status)
    VALUES ('quarterly-api', now(), 'running')
    RETURNING id
  `) as { id: number }[];
  const logId = logRow.id;

  // Clear stale rows from the prior buggy ingest (different component values
  // collapsed under the same primary key).
  await sql`DELETE FROM foia_quarterly`;

  let total = 0;
  try {
    for (const { fy, q } of QUARTERS) {
      console.log(`\nFY${fy} Q${q}`);
      const rows = await fetchQuarter(fy, q);
      console.log(`  fetched ${rows.length} rows`);
      if (rows.length === 0) continue;
      await upsert(rows);
      console.log(`  upserted ${rows.length} rows`);
      total += rows.length;
    }
    await sql`
      UPDATE sync_log SET ended_at = now(), records = ${total}, status = 'ok'
      WHERE id = ${logId}
    `;
    console.log(`\nDone. ${total} rows.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`
      UPDATE sync_log SET ended_at = now(), records = ${total}, status = 'error', error = ${message}
      WHERE id = ${logId}
    `;
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

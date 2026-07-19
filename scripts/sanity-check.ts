import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const counts = await sql`
    SELECT fiscal_year, count(*)::int AS rows
    FROM foia_annual
    WHERE component = 'Agency Overall' AND agency <> 'All agencies'
    GROUP BY 1
    ORDER BY 1
  `;
  console.log("Per-year agency-overall report counts:");
  for (const row of counts) console.log(`  FY${row.fiscal_year}: ${row.rows}`);

  const [latest] = (await sql`
    SELECT MAX(fiscal_year)::int AS fiscal_year
    FROM foia_annual
    WHERE component = 'Agency Overall' AND agency <> 'All agencies'
  `) as { fiscal_year: number }[];
  if (!latest) throw new Error("No annual agency-overall rows found");

  const top = await sql`
    SELECT agency, pending_end
    FROM foia_annual
    WHERE component = 'Agency Overall'
      AND agency <> 'All agencies'
      AND fiscal_year = ${latest.fiscal_year}
    ORDER BY pending_end DESC NULLS LAST
    LIMIT 10
  `;
  console.log(`\nTop 10 pending totals FY${latest.fiscal_year} (Agency Overall):`);
  for (const row of top) {
    console.log(`  ${row.pending_end?.toLocaleString().padStart(7)}  ${row.agency}`);
  }
}

main();

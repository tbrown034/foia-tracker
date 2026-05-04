import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const counts = await sql`
    SELECT fiscal_year, count(*)::int AS rows
    FROM foia_annual
    GROUP BY 1
    ORDER BY 1
  `;
  console.log("Per-year row counts:");
  for (const row of counts) console.log(`  FY${row.fiscal_year}: ${row.rows}`);

  const top = await sql`
    SELECT agency, pending_end
    FROM foia_annual
    WHERE component = 'Agency Overall' AND fiscal_year = 2024
    ORDER BY pending_end DESC NULLS LAST
    LIMIT 10
  `;
  console.log("\nTop 10 backlogs FY2024 (Agency Overall):");
  for (const row of top) {
    console.log(`  ${row.pending_end?.toLocaleString().padStart(7)}  ${row.agency}`);
  }
}

main();

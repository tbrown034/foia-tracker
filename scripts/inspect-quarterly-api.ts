import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const url =
    "https://api.foia.gov/api/quarterly_foia_report?filter[field_quarterly_year]=2026&filter[field_quarterly_quarter]=2&include=field_quarterly_component_data&page[limit]=2";
  const res = await fetch(url, {
    headers: { "X-API-Key": process.env.FOIA_API_KEY! },
  });
  const doc = (await res.json()) as { data: unknown[]; included?: unknown[] };
  console.log("data[0]:", JSON.stringify(doc.data[0], null, 2));
  console.log("---");
  console.log(
    "included sample:",
    JSON.stringify((doc.included ?? []).slice(0, 2), null, 2)
  );
}

main();

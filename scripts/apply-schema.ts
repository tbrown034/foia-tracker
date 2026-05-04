import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const sql = neon(url);

async function main() {
  const schemaPath = resolve(process.cwd(), "scripts/schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
  const stripped = schema.replace(/^\s*--.*$/gm, "");
  const statements = stripped
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    process.stdout.write(`> ${stmt.split("\n")[0].slice(0, 80)}... `);
    await sql.query(stmt);
    process.stdout.write("ok\n");
  }
  console.log(`\nApplied ${statements.length} statements.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

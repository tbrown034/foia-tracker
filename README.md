# FOIA Tracker

Federal FOIA backlog dashboard for `foiatracker.org`.

FOIA Tracker normalizes public FOIA.gov annual and quarterly datasets into a queryable Next.js app. It ranks federal agencies by current backlog, backlog change, oldest pending requests, staffing context, and exemption invocations.

## Data

- Annual bulk CSVs: FY2008 through FY2025. The current FY2025 release contains 117 agency-overall reports.
- Quarterly FOIA Report API: FY2021 Q1 through FY2026 Q3, the latest substantially filled quarter in the database.

FOIA.gov also publishes Agency Components and annual XML APIs. The current pipeline does not ingest either source.

All source data is public domain US government data from FOIA.gov. Agency numbers are self-reported and can be revised by DOJ.

Syncs are run manually after the source release and filing coverage are checked. The site shows the source period and last successful pull date; no automated cron is running.

## Local Development

```bash
pnpm install
pnpm dev
```

The app expects `DATABASE_URL` for page queries. Ingest scripts also require `FOIA_API_KEY` for FOIA.gov JSON:API calls.

```bash
pnpm tsx scripts/apply-schema.ts
pnpm tsx scripts/ingest/bulk-csv.ts
pnpm tsx scripts/ingest/quarterly.ts
pnpm build
```

Never commit `.env.local` or cached upstream data dumps.

## License

MIT.

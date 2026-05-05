# FOIA Tracker

Federal FOIA backlog dashboard for `foiatracker.org`.

FOIA Tracker normalizes public FOIA.gov annual and quarterly datasets into a queryable Next.js app. It ranks federal agencies by current backlog, backlog change, oldest pending requests, staffing context, and exemption invocations.

## Data

- Annual bulk CSVs: FY2008 through FY2024.
- Quarterly FOIA Report API: freshest published quarter in the seeded dataset.
- Agency Components API: canonical agency naming.
- Annual report XML: reserved for deeper component-level work.

All source data is public domain US government data from FOIA.gov. Agency numbers are self-reported and can be revised by DOJ.

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

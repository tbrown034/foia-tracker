import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "http://localhost:3004";
const OUT = resolve(process.cwd(), "data/review");
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { path: "/", slug: "home" },
  { path: "/annual", slug: "annual" },
  { path: "/agency/department-of-justice", slug: "agency-doj" },
  { path: "/about", slug: "about" },
  { path: "/data", slug: "data" },
];

const VIEWPORTS = [
  { width: 1280, height: 900, label: "desktop" },
  { width: 768, height: 1024, label: "tablet" },
  { width: 375, height: 812, label: "mobile" },
];

type Issue = {
  route: string;
  viewport: string;
  kind: string;
  detail: string;
};

const issues: Issue[] = [];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console errors as we go.
  page.on("pageerror", (err) =>
    issues.push({
      route: page.url(),
      viewport: "any",
      kind: "page-error",
      detail: err.message,
    })
  );

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    for (const route of ROUTES) {
      const url = `${BASE}${route.path}`;
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        issues.push({
          route: route.path,
          viewport: viewport.label,
          kind: "navigation-error",
          detail: message,
        });
        continue;
      }

      // Full-page screenshot.
      const file = `${viewport.label}-${route.slug}.png`;
      await page.screenshot({
        path: resolve(OUT, file),
        fullPage: true,
      });

      // Check for horizontal overflow on the documentElement.
      const overflow = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        return {
          scrollWidth: Math.max(docEl.scrollWidth, body.scrollWidth),
          clientWidth: docEl.clientWidth,
          windowWidth: window.innerWidth,
        };
      });
      if (overflow.scrollWidth > overflow.windowWidth + 1) {
        issues.push({
          route: route.path,
          viewport: viewport.label,
          kind: "horizontal-overflow",
          detail: `body.scrollWidth=${overflow.scrollWidth} > window=${overflow.windowWidth}`,
        });
      }

      // Find any element wider than the viewport.
      const wideElements = await page.evaluate((vw: number) => {
        const found: { tag: string; cls: string; width: number; rect: number }[] = [];
        const all = document.querySelectorAll("body *");
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.width > vw + 1) {
            found.push({
              tag: el.tagName.toLowerCase(),
              cls:
                typeof el.className === "string"
                  ? (el.className as string).slice(0, 80)
                  : "",
              width: Math.round(rect.width),
              rect: Math.round(rect.right),
            });
          }
        }
        // Dedup similar entries.
        const out: typeof found = [];
        for (const f of found) {
          if (
            !out.some(
              (o) =>
                o.tag === f.tag && o.cls === f.cls && Math.abs(o.width - f.width) < 4
            )
          ) {
            out.push(f);
          }
        }
        return out.slice(0, 10);
      }, viewport.width);
      for (const w of wideElements) {
        issues.push({
          route: route.path,
          viewport: viewport.label,
          kind: "element-wider-than-viewport",
          detail: `<${w.tag} class="${w.cls}"> width=${w.width}`,
        });
      }

      // Tappable target audit on mobile only — interactive elements
      // smaller than the WCAG-suggested 44x44 footprint.
      if (viewport.label === "mobile") {
        const small = await page.evaluate(() => {
          const result: { tag: string; text: string; w: number; h: number }[] = [];
          const els = document.querySelectorAll("a, button");
          for (const el of els) {
            const rect = (el as HTMLElement).getBoundingClientRect();
            if (rect.width < 28 || rect.height < 28) {
              result.push({
                tag: el.tagName.toLowerCase(),
                text: (el.textContent ?? "").trim().slice(0, 40),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
              });
            }
          }
          return result.slice(0, 12);
        });
        for (const s of small) {
          issues.push({
            route: route.path,
            viewport: viewport.label,
            kind: "tap-target-small",
            detail: `${s.tag} "${s.text}" ${s.w}x${s.h}`,
          });
        }
      }

      // Check the slope chart hover overlay actually responds (desktop).
      if (viewport.label === "desktop" && route.path === "/") {
        const slopeBox = await page.locator("svg").first().boundingBox();
        if (slopeBox) {
          // Move into the chart's middle region to fire a hover.
          await page.mouse.move(
            slopeBox.x + slopeBox.width / 2,
            slopeBox.y + slopeBox.height / 2
          );
          await page.waitForTimeout(200);
          const tooltip = await page
            .locator('[role="tooltip"]')
            .first()
            .isVisible()
            .catch(() => false);
          if (!tooltip) {
            issues.push({
              route: route.path,
              viewport: viewport.label,
              kind: "hover-no-tooltip",
              detail: "Slope-chart hover did not produce a tooltip",
            });
          }
        }
      }

      console.log(
        `  ${viewport.label.padEnd(8)} ${route.path.padEnd(40)} -> ${file}`
      );
    }
  }

  await browser.close();

  // Print summary.
  console.log("");
  if (issues.length === 0) {
    console.log("No automated issues detected.");
  } else {
    console.log(`Found ${issues.length} automated issues:`);
    const grouped = new Map<string, Issue[]>();
    for (const it of issues) {
      const key = `${it.viewport} · ${it.route}`;
      const arr = grouped.get(key) ?? [];
      arr.push(it);
      grouped.set(key, arr);
    }
    for (const [key, list] of grouped) {
      console.log(`\n${key}`);
      for (const it of list) {
        console.log(`  · [${it.kind}] ${it.detail}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

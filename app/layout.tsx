import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "400",
});

const SITE_URL = "https://www.foiatracker.org";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FOIA Tracker",
    template: "%s — FOIA Tracker",
  },
  description:
    "A federal FOIA backlog dashboard — ranking agencies by where records requests go to die.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "FOIA Tracker",
    description:
      "Federal FOIA backlog dashboard. 17 years of agency data, ranked by where records requests go to die.",
    url: SITE_URL,
    siteName: "FOIA Tracker",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FOIA Tracker",
    description:
      "Federal FOIA backlog dashboard. 17 years of agency data, ranked by where records requests go to die.",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "FOIA Tracker",
  url: SITE_URL,
  description:
    "Federal FOIA backlog dashboard. 17 years of agency-level data on Freedom of Information Act request processing.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/agencies?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
  publisher: {
    "@type": "Person",
    name: "Trevor Brown",
    url: "https://trevorthewebdeveloper.com",
    sameAs: [
      "https://github.com/tbrown034",
      "https://www.linkedin.com/in/trevorabrown",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-stone-900">
        {children}
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}

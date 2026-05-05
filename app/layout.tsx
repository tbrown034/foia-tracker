import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://foiatracker.org"),
  title: {
    default: "FOIA Tracker",
    template: "%s — FOIA Tracker",
  },
  description:
    "A federal FOIA backlog dashboard — ranking agencies by where records requests go to die.",
  openGraph: {
    title: "FOIA Tracker",
    description:
      "Federal FOIA backlog dashboard. 17 years of agency data, ranked by where records requests go to die.",
    url: "https://foiatracker.org",
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
      </body>
    </html>
  );
}

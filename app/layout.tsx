import type { Metadata } from "next";
import { Newsreader, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
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
      className={`${newsreader.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-stone-900">
        {children}
      </body>
    </html>
  );
}

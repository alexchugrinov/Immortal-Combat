import type { Metadata } from "next";
import "@fontsource/cinzel/latin-600.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/barlow-condensed/latin-400.css";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Immortal Combat — Fight. Forgive. Unite.",
  description: "A cinematic browser fighting prototype where defeated rivals become powerful allies.",
  openGraph: {
    title: "Immortal Combat",
    description: "Fight. Forgive. Unite. A cinematic elemental fighting prototype.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Immortal Combat — Fight. Forgive. Unite." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Immortal Combat",
    description: "Fight. Forgive. Unite. A cinematic elemental fighting prototype.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

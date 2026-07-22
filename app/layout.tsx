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
  description: "A local keyboard fighting game where defeated rivals become powerful allies.",
  openGraph: {
    title: "Immortal Combat",
    description: "Fight. Forgive. Unite. A local elemental fighting game.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Immortal Combat — Fight. Forgive. Unite." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Immortal Combat",
    description: "Fight. Forgive. Unite. A local elemental fighting game.",
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

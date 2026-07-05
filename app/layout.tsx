import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Radar — India & Singapore Tech Career Tracker",
  description: "Real-time aggregator for entry-level software engineering roles across 95 top companies in India and Singapore. Track internships, new grad, and full-time opportunities at quant firms, big tech, AI labs, and product companies.",
  keywords: ["jobs", "software engineer", "intern", "new grad", "India", "Singapore", "FAANG", "quant", "career tracker"],
  openGraph: {
    title: "Job Radar",
    description: "Track entry-level tech opportunities across India & Singapore's top companies in real-time.",
    type: "website",
  },
  robots: "noindex",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%233b82f6'/><text x='5' y='23' font-size='18' font-weight='bold' fill='white'>JR</text></svg>" />
        <meta name="theme-color" content="#09090b" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body>{children}</body>
    </html>
  );
}

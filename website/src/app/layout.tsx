import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Is it slop?",
  description: "A sloppiness score for things on the internet. Critics: is there a real product definition? People: do the people who find it use it?",
  metadataBase: new URL("https://isitslop.org"),
  openGraph: { title: "Is it slop?", description: "A sloppiness score for things on the internet.", url: "https://isitslop.org" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} min-h-screen flex flex-col`}>
        <header className="border-b border-line">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="display text-2xl leading-none">
              is it <em>slop</em>?
            </Link>
            <nav className="flex items-center gap-5 text-sm text-ink-2">
              <Link href="/methodology" className="hover:text-ink">Methodology</Link>
              <Link href="/contribute" className="hover:text-ink font-semibold text-ink">Change the rules</Link>
              <Link href="/api-docs" className="hover:text-ink">API</Link>
              <a href="https://github.com/jayjaychicago/isitslop" className="hover:text-ink" target="_blank" rel="noreferrer">GitHub</a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              An open index operated by API Blaze, LLC. Heuristics only. No LLMs. Opinions, not facts.
            </div>
            <div className="flex gap-4">
              <Link href="/terms" className="hover:text-ink">Terms</Link>
              <Link href="/privacy" className="hover:text-ink">Privacy</Link>
              <a href="https://github.com/jayjaychicago/isitslop/blob/main/foundation.md" className="hover:text-ink">Foundation</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

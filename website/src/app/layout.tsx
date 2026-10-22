import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SessionProvider, SignIn } from "@/components/Session";
import { WordIcon } from "@/components/Icons";
import { GoogleAnalytics } from "@next/third-parties/google";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Is it slop?",
  description: "A sloppiness score for things on the internet. Quality: real, maintained work? Popularity: do the people who find it use it?",
  metadataBase: new URL("https://isitslop.org"),
  openGraph: { title: "Is it slop?", description: "A sloppiness score for things on the internet.", url: "https://isitslop.org", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} min-h-screen flex flex-col`}>
        <SessionProvider>
        <header className="border-b border-line">
          <div className="mx-auto max-w-5xl px-4 py-3 sm:py-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/" className="order-1 flex items-center gap-2.5 display text-2xl leading-none whitespace-nowrap">
              <WordIcon word="slop" size={30} className="text-slop inline-block shrink-0" />
              <span>is it <em>slop</em>?</span>
            </Link>
            <div className="order-2 sm:order-3 ml-auto sm:ml-0 shrink-0"><SignIn /></div>
            <nav className="order-3 sm:order-2 w-full sm:w-auto sm:ml-auto flex items-center gap-4 sm:gap-5 text-sm text-ink-2 overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
              <Link href="/about" className="hover:text-ink">About</Link>
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
              <Link href="/about" className="hover:text-ink">About</Link>
              <Link href="/terms" className="hover:text-ink">Terms</Link>
              <Link href="/privacy" className="hover:text-ink">Privacy</Link>
              <a href="https://github.com/jayjaychicago/isitslop/blob/main/foundation.md" className="hover:text-ink">Foundation</a>
            </div>
          </div>
        </footer>
        </SessionProvider>
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      </body>
    </html>
  );
}

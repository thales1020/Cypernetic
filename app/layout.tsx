import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Case File: escalation investigator",
  description:
    "Consolidates tickets, emails and chat around a client escalation into one cited timeline: who did what, what was promised, and what went wrong.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col grid-bg">
        <header className="border-b border-line bg-bg/80 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-mono text-sm tracking-tight">
              <span className="inline-block w-2.5 h-2.5 bg-red rotate-45" />
              <span className="font-semibold">CASE FILE</span>
              <span className="text-faint hidden sm:inline">/ the investigator</span>
            </Link>
            <Link
              href="/new"
              className="font-mono text-xs uppercase tracking-wider border border-accent text-accent px-3 py-1.5 hover:bg-accent hover:text-bg transition-colors"
            >
              + New case
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Story Automation",
  description: "AI ile YouTube hikaye videoları üret",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex">
        <Suspense fallback={<aside className="w-16 md:w-60 shrink-0 border-r border-line" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-8">
          <Suspense fallback={<div className="shimmer h-96 rounded-2xl max-w-7xl mx-auto" />}>{children}</Suspense>
        </main>
      </body>
    </html>
  );
}

/**
 * Root Layout - Server Component
 *
 * @description App Router root layout with proper client boundary
 * @component Server Component (async capable, no hooks)
 * @architecture Build Map v2.1 ENHANCED - App Router root layout pattern
 * @see .cursor/rules/react18-nextjs14-governance.mdc for layout standards
 *
 * GOVERNANCE RULES:
 * - MUST be Server Component (NO 'use client')
 * - MUST define metadata exports
 * - MUST use ClientLayout wrapper for client components
 * - MUST use generateViewport() for themeColor (Next.js 14.2+)
 */
import type { Metadata } from "next";
import "./globals.css";
import "../styles/layout.css";
import "../styles/account-status.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "Bizconekt",
  description: "Baseline Next.js 14 app for Bizconekt",
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png' },
    ],
  },
};

/**
 * generateViewport - Viewport Configuration
 *
 * Next.js 14.2+ requires themeColor in viewport export, not metadata.
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-viewport
 */
export async function generateViewport() {
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" }
    ],
    width: 'device-width',
    initialScale: 1
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
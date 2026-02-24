import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { Shield } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gardiennage | Planning de garde",
  description: "Calendrier de rotation des gardes du weekend",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <header className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight hover:opacity-80 transition-opacity"
            >
              <Shield className="w-5 h-5" />
              Gardiennage
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Administration
              </Link>
              <ThemeToggle />
            </nav>
          </header>
          <main>{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

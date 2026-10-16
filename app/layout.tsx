import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";
import KittoWidget from "@/components/kitto/KittoWidget";
import { isDemoMode } from "@/lib/kitto/demo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Rounded face for the Kitto widget, matching the logo's soft, bold letters.
const nunito = Nunito({
  variable: "--font-kitto",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kitto",
  description: "Codifykit's AI brand buddy",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <KittoWidget demoMode={isDemoMode()} />
      </body>
    </html>
  );
}

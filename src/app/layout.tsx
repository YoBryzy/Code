import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdMagic — AI product video ads on autopilot",
  description:
    "Paste a product link, and AdMagic generates high-performing TikTok, Reels, and Shorts ads — then posts one a day automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}

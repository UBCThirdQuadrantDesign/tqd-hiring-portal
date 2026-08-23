import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const handDrawn = localFont({
  src: "./fonts/EndlessFontRegular.otf",
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Third Quadrant Design — Recruitment 26/27",
  description:
    "Join Third Quadrant Design, an engineering design team. Applications for the 2026–27 cohort are open.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("antialiased", "font-sans", geist.variable, handDrawn.variable)}>
      <body className="min-h-screen flex flex-col bg-bone text-ink">
        {children}
      </body>
    </html>
  );
}

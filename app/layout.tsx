import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Third Quadrant Design — Recruitment 26/27",
  description:
    "Join Third Quadrant Design, an engineering design team. Applications for the 2026–27 cohort are open.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bone text-ink">
        {children}
      </body>
    </html>
  );
}

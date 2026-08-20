import { LenisProvider } from "@/lib/motion/lenis-provider";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LenisProvider>{children}</LenisProvider>;
}

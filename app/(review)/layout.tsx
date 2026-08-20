// Reviewer route group: deliberately no Lenis, no GSAP. Native scroll,
// CSS transitions only. proxy.ts gates unauthenticated access before this
// layout ever renders; RLS is the real boundary underneath that.
export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-bone text-ink">{children}</div>;
}

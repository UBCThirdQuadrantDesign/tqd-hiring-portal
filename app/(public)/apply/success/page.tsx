import Link from "next/link";
import { application } from "@/content/application";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { name } = await searchParams;

  return (
    <div className="min-h-screen bg-bone text-ink flex items-center">
      <div className="px-6 sm:px-10 py-24 max-w-[1440px] mx-auto w-full text-center">
        <div className="text-[clamp(34px,4.4vw,64px)] leading-none font-extrabold tracking-[-0.03em] uppercase">
          Application
          <br />
          received
        </div>
        <div className="mt-7 text-[17px] leading-relaxed text-[#5c5a51] max-w-[52ch] mx-auto text-pretty">
          Thanks{name ? `, ${name}` : ""}. We read every submission after{" "}
          {application.closesLabel} and reply either way.
        </div>
        <Link
          href="/"
          className="inline-block mt-10 px-6 py-[15px] border border-ink text-xs font-bold tracking-[0.16em] uppercase cursor-pointer hover:bg-ink hover:text-bone transition-colors no-underline"
        >
          Back to the overview
        </Link>
      </div>
    </div>
  );
}

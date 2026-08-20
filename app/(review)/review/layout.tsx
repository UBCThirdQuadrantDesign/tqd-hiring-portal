import { createClient } from "@/lib/supabase/server";
import { BoardStoreProvider } from "./board-store";

export default async function ReviewBoardLayout({
  children,
  drawer,
}: {
  children: React.ReactNode;
  drawer: React.ReactNode;
}) {
  // Queried here rather than in page.tsx so the board and the intercepted
  // applicant panel share one store — see board-store.tsx.
  const supabase = await createClient();
  const { data: applications } = await supabase
    .from("applications")
    .select("id, full_name, year, subteam, stage, starred, position")
    .order("position", { ascending: true });

  return (
    <BoardStoreProvider initialCards={applications ?? []}>
      {children}
      {drawer}
    </BoardStoreProvider>
  );
}

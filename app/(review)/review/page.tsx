import { createClient } from "@/lib/supabase/server";
import { Board } from "./board";

export default async function ReviewPage() {
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, full_name, year, subteam, stage, starred, position")
    .order("position", { ascending: true });

  return <Board initialApplications={applications ?? []} />;
}

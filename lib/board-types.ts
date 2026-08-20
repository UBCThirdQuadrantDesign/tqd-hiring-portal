import type { ApplicationStage } from "@/lib/schema";

export type ApplicationRow = {
  id: string;
  cycle: string;
  full_name: string;
  email: string;
  faculty: string;
  year: string;
  subteam: string;
  answers: {
    why_join: string;
    hours_per_week: string;
    other_commitments: string;
  };
  stage: ApplicationStage;
  starred: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type AttachmentRow = {
  id: string;
  application_id: string;
  kind: "resume" | "portfolio";
  storage_path: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
};

export type NoteRow = {
  id: string;
  application_id: string;
  author_id: string;
  author_email?: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export const STAGES: { key: ApplicationStage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "reviewing", label: "Reviewing" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "archived", label: "Archived" },
];

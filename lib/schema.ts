import { z } from "zod";
import { SUBTEAMS, YEARS } from "@/content/application";
import { UPLOAD_PATH_PATTERN } from "@/lib/storage";

/**
 * Zod schema for the application form, shared client (react-hook-form
 * resolver) and server (Server Action validation before insert). Kept in
 * sync with content/application.ts by hand — if a question id changes
 * there, update the corresponding field here.
 */

function wordCount(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export const applicationFormSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your full name.").max(200),
  email: z.string().trim().email("Enter a valid email address."),
  faculty: z.string().trim().min(1, "Enter your faculty.").max(200),
  year: z.enum(YEARS, { message: "Choose a year." }),
  subteam: z.enum(SUBTEAMS, { message: "Choose a sub-team." }),
  why_join: z
    .string()
    .trim()
    .min(1, "Tell us why you'd like to join.")
    .refine((v) => wordCount(v) <= 250, "Please keep it to 250 words or fewer."),
  hours_per_week: z.string().trim().min(1, "Please let us know your availability."),
  other_commitments: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => wordCount(v) <= 150, "Please keep it to 150 words or fewer.")
    .optional()
    .or(z.literal("")),
  // Uploads are handled out-of-band via signed URLs (see lib/upload.ts);
  // the form only carries the resulting storage paths.
  resume_path: z.string().min(1, "Attach your résumé.").regex(UPLOAD_PATH_PATTERN, "Attach your résumé."),
  portfolio_path: z.string().min(1, "Attach your portfolio.").regex(UPLOAD_PATH_PATTERN, "Attach your portfolio."),
  // Honeypot — must stay empty. Real applicants never see or fill this field.
  company: z.string().max(0).optional().or(z.literal("")),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

/** Shape stored in `applications.answers` jsonb — the non-column fields. */
export const answerValuesSchema = applicationFormSchema.pick({
  why_join: true,
  hours_per_week: true,
  other_commitments: true,
});

export type AnswerValues = z.infer<typeof answerValuesSchema>;

export const applicationStages = [
  "new",
  "reviewing",
  "interview",
  "offer",
  "archived",
] as const;

export type ApplicationStage = (typeof applicationStages)[number];

export const noteSchema = z.object({
  application_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

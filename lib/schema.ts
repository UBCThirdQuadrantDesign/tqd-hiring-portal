import { z } from "zod";
import { SUBTEAMS, YEARS, question } from "@/content/application";
import { UPLOAD_PATH_PATTERN } from "@/lib/storage";

/**
 * Zod schema for the application form, shared client (react-hook-form
 * resolver) and server (Server Action validation before insert). Field
 * *ids* are still listed by hand — if a question id changes in
 * content/application.ts, update the corresponding field here. The word
 * caps are read from there directly so the counter shown to the applicant
 * and the limit enforced on submit can never disagree.
 */

function wordCount(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const WHY_JOIN_WORDS = question("why_join").maxWords;
const SKILLS_WORDS = question("skills").maxWords;
const OTHER_COMMITMENTS_WORDS = question("other_commitments").maxWords;

/**
 * Character ceiling for a word-capped answer. The word cap is the
 * applicant-facing limit; the character cap is the one that matters for an
 * anon-writable endpoint, since 250 "words" can still be megabytes. Sized
 * to comfortably clear the word cap in normal prose.
 */
const charCap = (words: number) => words * 16;

const wordLimited = (words: number, emptyMessage: string) =>
  z
    .string()
    .trim()
    .min(1, emptyMessage)
    .max(charCap(words), `Please keep it to ${words} words or fewer.`)
    .refine((v) => wordCount(v) <= words, `Please keep it to ${words} words or fewer.`);

export const applicationFormSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your full name.").max(200),
  email: z.string().trim().email("Enter a valid email address."),
  faculty: z.string().trim().min(1, "Enter your faculty.").max(200),
  year: z.enum(YEARS, { message: "Choose a year." }),
  subteam: z.enum(SUBTEAMS, { message: "Choose a role." }),
  why_join: wordLimited(WHY_JOIN_WORDS, "Tell us about your background and why you'd like to join."),
  skills: wordLimited(SKILLS_WORDS, "Tell us about your relevant experience."),
  hours_per_week: z
    .string()
    .trim()
    .min(1, "Please let us know your availability.")
    .max(200),
  // Optional (content/application.ts marks it required: false), so an empty
  // string is a valid answer rather than a missing one.
  other_commitments: z
    .string()
    .trim()
    .max(
      charCap(OTHER_COMMITMENTS_WORDS),
      `Please keep it to ${OTHER_COMMITMENTS_WORDS} words or fewer.`
    )
    .refine(
      (v) => wordCount(v) <= OTHER_COMMITMENTS_WORDS,
      `Please keep it to ${OTHER_COMMITMENTS_WORDS} words or fewer.`
    )
    .optional()
    .or(z.literal("")),
  // Uploads are handled out-of-band via signed URLs (see lib/upload.ts);
  // the form only carries the resulting storage paths.
  resume_path: z.string().min(1, "Attach your résumé.").regex(UPLOAD_PATH_PATTERN, "Attach your résumé."),
  // Portfolio is optional — an empty string means "no file attached". Any
  // non-empty value still has to look like a real upload path.
  portfolio_path: z
    .string()
    .regex(UPLOAD_PATH_PATTERN, "Re-upload your portfolio.")
    .optional()
    .or(z.literal("")),
  // Honeypot — must stay empty. Real applicants never see or fill this field.
  company: z.string().max(0).optional().or(z.literal("")),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

/** Shape stored in `applications.answers` jsonb — the non-column fields. */
export const answerValuesSchema = applicationFormSchema.pick({
  why_join: true,
  skills: true,
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

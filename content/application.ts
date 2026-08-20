/**
 * The single source of truth for the 2026–27 general application.
 *
 * `questions` drives all four of:
 *   1. Form field rendering        — app/(public)/page.tsx
 *   2. The Zod validation schema   — lib/schema.ts
 *   3. The `answers` jsonb shape   — lib/schema.ts (AnswerValues)
 *   4. Field labels in the reviewer drawer — app/(review)/review/**
 *
 * Change a question here and all four follow. No migration required for
 * question copy or option changes — only for adding/removing a *column*
 * field (full_name, email, faculty, year, subteam), which are promoted out
 * of `answers` because the review board filters/sorts on them.
 */

export const SUBTEAMS = [
  "Architecture",
  "Engineering Science",
  "Discovery",
  "Marketing/Outreach",
] as const;

export const YEARS = [
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
  "5th year +",
] as const;

export type QuestionField =
  | {
      id: "full_name" | "email" | "faculty";
      type: "text" | "email";
      label: string;
      placeholder?: string;
      required: boolean;
      column: true;
    }
  | {
      id: "year";
      type: "select";
      label: string;
      options: readonly string[];
      required: boolean;
      column: true;
    }
  | {
      id: "subteam";
      type: "select";
      label: string;
      options: readonly string[];
      required: boolean;
      column: true;
    }
  | {
      id: "why_join" | "other_commitments" | "hours_per_week";
      type: "longtext" | "text";
      label: string;
      placeholder?: string;
      maxWords?: number;
      required: boolean;
      column: false;
    }
  | {
      id: "resume" | "portfolio";
      type: "file";
      label: string;
      accept: readonly string[];
      maxSize: number;
      required: boolean;
      column: false;
    };

export const application = {
  cycle: "2026-27",
  title: "Application",
  closesAt: "2026-09-20T23:59:00-07:00",
  closesLabel: "September 20",
  meta: [
    { label: "Commitment", value: "6–10 hrs / week" },
    { label: "Closes", value: "September 20" },
  ],
  subteams: SUBTEAMS,
  // TODO: replace with the real job description. Rendered by the Overview tab
  // (app/(public)/overview-panel.tsx); nothing else reads this, so headings,
  // paragraphs, and bullets can be rewritten freely without touching the form.
  overview: [
    {
      heading: "Who we are",
      paragraphs: [
        "Founded in September 2019 by 3 female engineering students, Third Quadrant Design brings together passionate students from various disciplines to learn and act on our climate crisis. Our team utilizes innovative technologies to design and build regenerative high-performance buildings.",
        "From 2019–2025, we competed in the U.S. Department of Energy Solar Decathlon® Design Challenge collegiate competition and went undefeated with our 2020 and 2021 submissions.",
      ],
      bullets: [],
    },
    {
      heading: "What you'll do",
      paragraphs: [],
      bullets: [
        "Work inside one of four sub-teams — Architecture, Engineering Science, Discovery, or Marketing/Outreach.",
        "Contribute to Vancouver Special 2.0, our Solar Decathlon submission now in design development.",
        "Learn the tools the team runs on, from modelling and energy analysis to fabrication and storytelling.",
        "Commit roughly 6–10 hours a week across the 2026–27 academic year.",
      ],
    },
    {
      heading: "How we review",
      paragraphs: [
        "We read every submission, then invite a shortlist to a thirty‑minute conversation in the studio. Offers go out after interviews close. Portfolios matter more than grades; a sketchbook page counts.",
      ],
      bullets: [],
    },
  ],
  questions: [
    {
      id: "full_name",
      type: "text",
      label: "Full name",
      placeholder: "Type here",
      required: true,
      column: true,
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      placeholder: "you@anything.ca",
      required: true,
      column: true,
    },
    {
      id: "faculty",
      type: "text",
      label: "Faculty",
      placeholder: "e.g. Civil Engineering, 1st Year Eng",
      required: true,
      column: true,
    },
    {
      id: "year",
      type: "select",
      label: "Year",
      options: YEARS,
      required: true,
      column: true,
    },
    {
      id: "subteam",
      type: "select",
      label: "Sub-team interest",
      options: SUBTEAMS,
      required: true,
      column: true,
    },
    {
      id: "why_join",
      type: "longtext",
      label: "Why would you like to join TQD? What do you hope to gain from being part of the team?",
      placeholder: "What drew you to this team, and what do you want to have built by next April?",
      maxWords: 250,
      required: true,
      column: false,
    },
    {
      id: "hours_per_week",
      type: "text",
      label: "How many hours can you dedicate per week?",
      placeholder: "e.g. 6–10 hrs",
      required: true,
      column: false,
    },
    {
      id: "other_commitments",
      type: "longtext",
      label: "What other commitments/hobbies do you have?",
      placeholder: "Clubs, jobs, sports, whatever else fills the week.",
      maxWords: 150,
      required: false,
      column: false,
    },
    {
      id: "resume",
      type: "file",
      label: "Resume",
      accept: ["application/pdf", "image/png"],
      maxSize: 10_000_000,
      required: true,
      column: false,
    },
    {
      id: "portfolio",
      type: "file",
      label: "Portfolio",
      accept: ["application/pdf", "image/png"],
      maxSize: 10_000_000,
      required: true,
      column: false,
    },
  ],
} as const satisfies {
  cycle: string;
  title: string;
  closesAt: string;
  closesLabel: string;
  meta: readonly { label: string; value: string }[];
  subteams: readonly string[];
  overview: readonly {
    heading: string;
    paragraphs: readonly string[];
    bullets: readonly string[];
  }[];
  questions: readonly QuestionField[];
};

export type Application = typeof application;

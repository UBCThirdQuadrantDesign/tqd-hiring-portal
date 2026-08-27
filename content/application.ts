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
  "Team Lead",
  "Architecture",
  "Engineering",
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
  closesAt: "2026-09-13T23:59:00-07:00",
  closesLabel: "September 13",
  meta: [
    /*{label: "Commitment", value: "6–10 hrs / week"},*/
    { label: "Closes", value: "Sunday, September 13, 11:59 PM" },
  ],
  subteams: SUBTEAMS,
 
  overview: [
    {
      heading: "Roles",
      paragraphs: [],
      bullets: [],
      // Each group renders as a role name with its responsibilities beneath it.
      groups: [
        {
          title: "Team Leads",
          hours: "6-10 hours a week",
          bullets: [
            "Set the direction for a subteam and keep the project on schedule.",
            "Run weekly check-ins and unblock members.",
          ],
        },
        {
          title: "Architecture",
          hours: "4-6 hours a week",
          bullets: [
            "Translate concepts into drawings, models, and spatial plans.",
          ],
        },
        {
          title: "Engineering",
          hours: "4-6 hours a week",
          bullets: [
            "Civil Engineering, Building Science, or Electrical Engineering."
          ],
        },
        {
          title: "Marketing and Outreach",
          hours: "5-6 hours a week",
          bullets: [
            "Project feasibility, social media and our main connection with the professional world.",
          ],
        },
        {
          title: "Discovery",
          hours: "3-5 hours a week",
          bullets: [
            "Rotate across different teams and find the best role for you.",
          ],
        },
      ],
    },
    {
      heading: "Who you are",
      paragraphs: [],
      groups: [],
      bullets: [
        "Anybody! Regardless of what you're studying or what year you're in, if you think you are a good fit, we encourage you to apply.",
        "Willing to learn. We'll pick up new skills together!",
        "Ready to have fun. We are a STUDENT design team. If you're not having fun, you're not doing it right.",
      ],
    },
    {
      heading: "How we review",
      groups: [],
      paragraphs: [
        "We read submissions on a rolling basis, and invite candidates to a short virtual meeting. Keep an eye on your inbox.",
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
      required: false,
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
    /** Named sub-blocks (e.g. one per role) rendered as a title + its own bullets. */
    groups: readonly {
      title: string;
      /** Time commitment, rendered as small de-emphasized text beside the title. */
      hours?: string;
      bullets: readonly string[];
    }[];
  }[];
  questions: readonly QuestionField[];
};

export type Application = typeof application;

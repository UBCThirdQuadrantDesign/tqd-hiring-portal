/**
 * The single source of truth for the 2026–27 general application.
 *
 * `questions` drives all four of:
 *   1. Form field rendering        — app/(public)/apply-form.tsx
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
  "Journalism",
  "Outreach",
  "Social Media",
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
      id: "why_join" | "skills" | "other_commitments" | "hours_per_week" | "additional_link";
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
  meta: [
    /*{label: "Commitment", value: "6–10 hrs / week"},*/
    { label: "Deadline", value: "Open until roles are filled" },
  ],
  subteams: SUBTEAMS,
 
  overview: [
    {
      heading: "Open Roles",
      paragraphs: [],
      bullets: [],
      // Each group renders as a role name with its responsibilities beneath it.
      groups: [
        {
          title: "Journalism",
          bullets: [
            "Write articles, blog posts, newsletters and project updates for our website and channels",
            "Advocate for TQD!!",
          ],
        },
        {
          title: "Outreach",
          bullets: [
            "Find and contact architecture, engineering and construction firms, professionals, government bodies and UBC faculty",
          ],
        },
        {
          title: "Social Media",
          bullets: [
            "Plan, create and post content for Instagram, LinkedIn and other platforms, including Reels and short-form video",
            "Submit some of your previous work with your application (very casual)",
          ],
        },
      ],
    },
    {
      heading: "Who you are",
      paragraphs: [],
      groups: [],
      bullets: [
        "Anybody! Regardless of what you're studying or what year you're in, if you think you're a good fit, we encourage you to apply.",
        "Interested in storytelling through journalism and marketing.",
        "Passionate about heat-resilient, sustainable housing, uplifting our local community, and reimagining what the future of Vancouver could look like.",
        "Eager to advocate for change and make an impact.",
        "Ready to have fun. We are a STUDENT design team. If you're not having fun, you're not doing it right!",
      ],
    },
    {
      heading: "How we review",
      groups: [],
      paragraphs: [
        "We read submissions on a rolling basis and invite candidates to a short virtual meeting. Keep an eye on your inbox.",
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
      label: "Role interest",
      options: SUBTEAMS,
      required: true,
      column: true,
    },
    {
      id: "why_join",
      type: "longtext",
      label: "What is your background, and why would you like to join TQD?",
      placeholder: "e.g. who you are, what you hope to gain, your favourite project of ours...",
      maxWords: 250,
      required: true,
      column: false,
    },
    {
      id: "skills",
      type: "longtext",
      label: "What experiences do you have that will help you succeed?",
      placeholder: "e.g. similar experiences, side quests, projects, passion...",
      maxWords: 250,
      required: true,
      column: false,
    },
    {
      id: "hours_per_week",
      type: "text",
      label: "How many hours can you dedicate per week?",
      placeholder: "e.g. 6–7 hrs",
      required: true,
      column: false,
    },
    {
      id: "other_commitments",
      type: "longtext",
      label: "What other commitments/hobbies do you have?",
      placeholder: "Clubs, jobs, sports, or whatever else fills the week",
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
      maxSize: 20_000_000,
      required: false,
      column: false,
    },
    {
      id: "additional_link",
      type: "text",
      label: "Link",
      placeholder: "e.g. LinkedIn, portfolio website",
      required: false,
      column: false,
    },
  ],
} as const satisfies {
  cycle: string;
  title: string;
  meta: readonly { label: string; value: string }[];
  subteams: readonly string[];
  overview: readonly {
    heading: string;
    paragraphs: readonly string[];
    bullets: readonly string[];
    /** Named sub-blocks (e.g. one per role) rendered as a title + its own bullets. */
    groups: readonly {
      title: string;
      /** Small label rendered above this group, dividing the list into sections. */
      subheading?: string;
      /** Time commitment, rendered as small de-emphasized text beside the title. */
      hours?: string;
      bullets: readonly string[];
    }[];
  }[];
  questions: readonly QuestionField[];
};

export type Application = typeof application;

type AnyQuestion = Application["questions"][number];
export type QuestionId = AnyQuestion["id"];

/**
 * Look up a question by id, preserving its literal type — callers get
 * `options` on a select, `maxSize` on a file, `maxWords` on a longtext,
 * with no runtime `type` guard needed.
 *
 * Every consumer (form labels, placeholders, word caps, reviewer headings)
 * goes through this rather than repeating the copy, so editing a question
 * above is the only edit needed.
 */
export function question<Id extends QuestionId>(id: Id): Extract<AnyQuestion, { id: Id }> {
  return application.questions.find((q) => q.id === id) as Extract<AnyQuestion, { id: Id }>;
}

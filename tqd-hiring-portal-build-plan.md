# TQD Hiring Portal — Build Plan

**Third Quadrant Design** · Public application portal + internal review board
Status: pre-build · Last updated: 19 Aug 2026

---

## Contents

1. [Scope & decisions](#1-scope--decisions)
2. [Open blockers](#2-open-blockers)
3. [Stack](#3-stack)
4. [Architecture & routes](#4-architecture--routes)
5. [Content model — the single source of truth](#5-content-model--the-single-source-of-truth)
6. [Database schema](#6-database-schema)
7. [Auth & access control](#7-auth--access-control)
8. [File uploads](#8-file-uploads)
9. [Applicant flow](#9-applicant-flow)
10. [Reviewer flow](#10-reviewer-flow)
11. [Design system](#11-design-system)
12. [Landing page composition](#12-landing-page-composition)
13. [Motion system](#13-motion-system)
14. [Performance, accessibility, security](#14-performance-accessibility-security)
15. [Deployment](#15-deployment)
16. [Build order](#16-build-order)
17. [Risk register](#17-risk-register)

---

## 1. Scope & decisions

### Confirmed

| Decision | Choice |
|---|---|
| Job postings | **One role, hardcoded.** No CMS, no admin CRUD. |
| Landing page | **Short scroll:** hero → about → open role. |
| Reviewer features | **Lean v1.** Stage + notes only. No ratings, no formal decision capture, no @mentions. |

### Assumptions — flag anything wrong

- Applicant volume in the dozens to low hundreds, not thousands.
- 3–8 reviewers, all on a Google Workspace domain TQD controls.
- Applicants submit anonymously. No account, no post-submit editing, no withdrawal flow.
- No transactional email in v1 (no confirmation email, no reviewer notifications).
- Design roles, so **portfolio PDFs are large (20–50MB)** and matter more than resumes.
- English only. No i18n.

### Explicit non-goals for v1

Interview scheduling · candidate messaging · offer letters · analytics dashboards · bulk import/export · resume parsing · multi-role support · public application status tracking.

---

## 2. Open blockers

| # | Blocker | Needed to unblock |
|---|---|---|
| 1 | **Claude Design project unread.** `TQD Hiring Portal.dc.html`, `image-slot.js`, `support.js` are not accessible from the chat interface — the Design MCP isn't connectable here. | Paste the files into chat, **or** run the build in Claude Code with the Design MCP added to `.mcp.json`. Until then the apply/review UI spec is structural only. |
| 2 | **Assets.** | Logo as SVG with real `<path>` data (required for the stroke draw-on), floor plan render, the two interior photographs, plus whatever section 2 uses. |
| 3 | **Typeface.** The reference reads as a neo-grotesque — Neue Haas Grotesk Display or Helvetica Now. | Confirm whether TQD holds a license. If not, spec a free stand-in (Inter Display tightly tracked, or Instrument Sans). |
| 4 | **Reviewer allowlist.** | Google Workspace domain + initial reviewer email addresses. |
| 5 | **Role copy + question list.** | Even rough. Phase 3 generates the entire form from it. |

---

## 3. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.3** (App Router) | Turbopack is the default bundler. Middleware is renamed `middleware.ts` → **`proxy.ts`** in v16 — the auth gate lives there. |
| React | 19.2 | |
| Language | TypeScript | Strict mode. |
| Styling | Tailwind CSS v4 | CSS-first config, design tokens as CSS variables. |
| Database | Supabase Postgres | RLS enforced on every table. |
| Auth | Supabase Auth, Google OAuth | Reviewer side only. `@supabase/ssr`, cookie sessions. |
| Storage | Supabase Storage | Private bucket, signed URLs both directions. |
| Animation | **GSAP** + ScrollTrigger, Flip, SplitText, DrawSVG | See §13. Verify current licensing terms before commercial ship. |
| Scroll | **Lenis** | Public routes only. |
| Drag & drop | `dnd-kit` | Better keyboard/touch support than the alternatives. |
| Forms | `react-hook-form` + Zod | Shared schema, client and server. |
| Package manager | pnpm | |
| Hosting | Vercel | |
| Errors | Sentry | |

---

## 4. Architecture & routes

Two applications in one repo, with deliberately different characters.

- **Public side** is a marketing site: static, image-heavy, motion-forward, smooth-scrolled.
- **Review side** is a tool: dense, fast, native scroll, boring on purpose.

Separate root layouts, separate font loading strategies, separate motion budgets.

```
app/
  (public)/
    layout.tsx                  Lenis + GSAP providers, display fonts
    page.tsx                    Landing — hero / about / open role
    apply/
      page.tsx                  Posting + form, one page
      success/page.tsx          Confirmation
  (review)/
    layout.tsx                  No Lenis. UI font. Auth guard.
    login/page.tsx              Google OAuth
    review/
      page.tsx                  Kanban board
      @modal/
        (.)a/[id]/page.tsx      Intercepted detail — GSAP Flip target
      a/[id]/page.tsx           Full detail (direct link / hard refresh)
  api/
    auth/callback/route.ts
content/
  job.ts                        The posting. Single source of truth.
lib/
  supabase/{server,client,admin}.ts
  schema.ts                     Zod, generated from content/job.ts
  motion/{lenis,gsap,transitions}.ts
proxy.ts                        Session refresh + /review gate
supabase/migrations/
```

### Two structural choices worth defending

**Posting and form on one page.** With a single role, a separate `/careers/[slug]` page whose only purpose is to hold an "Apply" button is a wasted click. Long-form description, then the form directly beneath, with a sticky anchor link.

**Parallel + intercepting routes for the detail view.** Clicking a kanban card gives you a *shareable URL* and a modal you can GSAP Flip into; a hard refresh renders the full page instead. A plain `useState` modal gives you neither. This is load-bearing for the motion work in §13.

---

## 5. Content model — the single source of truth

Because there's exactly one role, the posting is a typed config file, not a database row.

```ts
// content/job.ts
export const job = {
  slug: 'design-lead',
  title: 'Design Lead',
  location: 'Vancouver, BC — Hybrid',
  employmentType: 'Full-time',
  compensation: '$—— – $——',
  closesAt: '2026-10-01',
  sections: [
    { heading: 'The role', body: '...' },
    { heading: 'What you bring', body: '...' },
    { heading: 'How we work', body: '...' },
  ],
  questions: [
    { id: 'why_tqd',   type: 'longtext', label: '...', maxLength: 1200, required: true },
    { id: 'portfolio', type: 'file',     label: '...', accept: ['application/pdf'], maxSize: 50_000_000, required: true },
    { id: 'resume',    type: 'file',     label: '...', accept: ['application/pdf'], maxSize: 10_000_000, required: true },
  ],
} as const satisfies JobPosting
```

That `questions` array drives **all four** of:

1. Form field rendering
2. Zod validation schema (client and server)
3. The `answers` jsonb column's TypeScript type
4. Field labels in the reviewer detail view

Change a question, everything downstream follows. No migration, no CMS.

---

## 6. Database schema

```sql
create type application_stage as enum
  ('applied','screening','interview','offer','rejected');

create table applications (
  id            uuid primary key default gen_random_uuid(),
  job_slug      text not null default 'design-lead',
  full_name     text not null,
  email         text not null,
  phone         text,
  location      text,
  portfolio_url text,
  linkedin_url  text,
  answers       jsonb not null default '{}',
  stage         application_stage not null default 'applied',
  position      numeric not null,
  archived      boolean not null default false,
  source        text,
  search_vector tsvector generated always as (...) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table attachments (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  kind           text not null,          -- resume | portfolio | other
  storage_path   text not null,
  filename       text not null,
  size_bytes     bigint not null,
  mime_type      text not null,
  created_at     timestamptz not null default now()
);

create table notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  author_id      uuid not null references auth.users,
  body           text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table stage_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  from_stage     application_stage,
  to_stage       application_stage not null,
  actor_id       uuid references auth.users,
  created_at     timestamptz not null default now()
);

create table reviewers (
  id        uuid primary key references auth.users on delete cascade,
  email     text not null unique,
  name      text,
  role      text not null default 'reviewer',   -- reviewer | admin
  active    boolean not null default true
);
```

### Four decisions worth flagging

**`job_slug` stays despite the single role.** One column, zero cost today, and adding role #2 later becomes a migration rather than a refactor.

**`answers` as jsonb.** Lets the question set change without a migration. Costs type safety at the DB boundary — recovered via the Zod schema in §5.

**`position` as a fractional index.** Drop a card between two neighbours → `(prev + next) / 2`. Avoids rewriting every row in a column on each drag. Add a rebalance job for when gaps get too small (rare at this volume).

**`stage_events` is not optional**, even with lean reviewing. "Who moved this to rejected, and when" is the first question anyone asks in week three. Three columns and an insert trigger.

**Archive as a boolean, not a sixth column.** Five kanban columns fits a laptop screen; six introduces horizontal scroll and the board stops being scannable.

---

## 7. Auth & access control

> **An unlisted URL is not access control.** It will end up in a Slack message, a browser history sync, or a Vercel referrer log. Treat it as convenience only.

### Layers

1. **Google OAuth** via Supabase Auth, cookie-based sessions through `@supabase/ssr`.
2. **Allowlist check on callback** — email must exist in `reviewers` with `active = true`. Do *not* rely on the Google `hd` claim alone; it's a client-supplied UI hint until verified server-side.
3. **`proxy.ts`** refreshes the session and redirects unauthenticated `/review/*` traffic to `/login`.
4. **RLS is the real boundary.** Everything above is convenience; this is enforcement.

### RLS policies

```sql
create function is_reviewer() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from reviewers
    where id = auth.uid() and active = true
  );
$$;
```

| Table | Anon | Reviewer |
|---|---|---|
| `applications` | **No policy at all** | Full read/write via `is_reviewer()` |
| `attachments` | None | Read via `is_reviewer()` |
| `notes` | None | Read all; insert/update/delete own only |
| `stage_events` | None | Read via `is_reviewer()`; insert via trigger |
| `reviewers` | None | Read own row; admins read all |
| Storage bucket `applications` | **Private, no public policy** | Signed URLs only |

**Submissions bypass RLS deliberately.** The public form posts to a Server Action using the service role key, which validates, rate-limits, and normalizes before inserting. An anon `INSERT` policy on `applications` is how you get an enumerable, spammable table.

### Anti-spam

Honeypot field + Cloudflare Turnstile + IP rate limit (Vercel KV or Upstash). Cheap to add, and you will want it the day the posting hits LinkedIn.

---

## 8. File uploads

The constraint that shapes this: **Vercel Server Actions cap request bodies at roughly 4.5MB.** A 40MB portfolio PDF cannot route through the server.

### Flow

1. User selects a file. Client validates type and size against the `questions` config.
2. Server Action mints a **signed upload URL** for a random path: `{application_id}/{nanoid}.pdf`.
3. Browser `PUT`s directly to Supabase Storage, with real progress reporting.
4. Server Action records the `attachments` row on completion.
5. Reviewers download via short-lived signed URLs (60s TTL). Never public links.

**Uploads start on file-select, not on submit.** Nothing kills a portfolio submission like a 40MB upload that only begins after the applicant has mentally left the page.

Orphaned uploads (started, never submitted) need a scheduled cleanup — anything older than 24h with no matching `applications` row.

---

## 9. Applicant flow

Single page, sectioned scroll, thin progress rail. **Not a multi-step wizard** — for a design role, a wizard reads as bureaucratic.

Sections: **About you → Work → Portfolio → Questions.**

### Details that matter

- Validation via `react-hook-form` + Zod, schema shared client and server.
- **Draft persistence to `localStorage`**, keyed by job slug. Long-form answers get lost to accidental navigation constantly.
- Real upload progress bars, per file.
- Inline error messages wired via `aria-describedby`, never colour-only.
- The success page should mirror the landing composition — same bone field, same mauve block, same type scale. It's the last impression a candidate has of the studio.

---

## 10. Reviewer flow

### Board

Five columns: **Applied · Screening · Interview · Offer · Rejected.** Archive is a filter toggle.

- `dnd-kit` for drag. Optimistic stage move → Server Action persists → `stage_events` row written by trigger.
- Guard concurrent edits with an `updated_at` check; reconcile on conflict rather than blindly overwriting.
- **Supabase Realtime** on `applications` and `notes`. Two reviewers triaging at once is the normal case, not the edge case. Presence dots so people can see who else is on the board.

### Card

Name · submitted date · note count · reviewer avatars · portfolio thumbnail (first page render, generated on upload). **Keep it under six data points** or the board stops being scannable.

### Detail view

Two columns — application content left, notes and activity right.

- Notes: markdown-lite, edit/delete own only, newest last.
- Inline PDF preview via signed URL in an `<object>` with a download fallback.
- Activity feed from `stage_events`.

### Filtering

By stage, by "has my note", by date range, plus full-text search across name/email/answers using the `search_vector` column. Trivial to add now; saves you at 200 applications.

---

## 11. Design system

The composition language, read from the reference: a **cream field**, a single **saturated mauve block** as anchor, **line-art at small scale** inside it, and **photographic slots that break the block's edges** — one bleeding out top-right, one bottom-left. Type is small, black, generously leaded, bottom-left. Enormous negative space. The tension comes entirely from the overlap.

### Tokens

```css
--bone:  #EFECE4;  /* field */
--ink:   #111111;  /* type */
--mauve: #A0555C;  /* anchor block */
--rose:  #E8B4AC;  /* linework, hairlines */
--sage:  #8A9A6B;  /* logo, accents only */
```

### The composition rule to encode

Every image is a **slot** that overlaps a block edge by 10–20% of its own width. That's the studio's signature, and it must be a reusable component — `<ImageSlot edge="top-right" overhang={0.15}>` — not hand-positioned per page.

> The Design project already contains `image-slot.js`, which is very likely exactly this. Reading it is blocker #1.

### Layout

12-column grid, broken deliberately. The floor plan in the reference sits off-centre and bleeds right. **Asymmetry is the point** — don't let Tailwind's centring defaults flatten it.

### Type

Neo-grotesque, tightly tracked at display sizes, generous leading at body sizes. Pending the licensing answer in blocker #3.

---

## 12. Landing page composition

Three sections. The scroll itself should do work.

### 1 — Hero

The reference composition, exactly. Logo stroke draw-on (first visit only), mauve block clip-path wipe, floor plan fading up inside it, two photo slots breaking the block's edges, "Join Us" line-revealed last.

### 2 — About

**Mirror the hero rather than repeat it.** Mauve block anchored right instead of left, one image slot instead of two, type-led. Same grammar, inverted. That inversion is what makes it read as a designed system rather than a template.

### 3 — Open role

One role means **do not build a list.** A single-entry list looks like a mistake. Make it a full-width typographic statement — role title at display scale, location and type as metadata, one link into `/apply`. The page should feel like it's been building toward this.

### Connective tissue

A `ScrollTrigger` that interpolates the page background across all three sections — bone → a deeper warm tone → back to bone — scrubbed to scroll position. Combined with Lenis's easing, the page reads as one continuous surface rather than three stacked blocks. **This is the highest value-per-line effect in the whole build.**

---

## 13. Motion system

This is where the project either feels commissioned or feels templated.

### Ground rules

**Lenis on public routes only.** Smooth scroll on a kanban board is actively hostile — reviewers want native, instantaneous scroll in a data tool. Separate providers per route group.

**Use `useGSAP` from `@gsap/react`.** It handles the `gsap.context()` cleanup that React 19 strict mode will otherwise punish you for.

**Never animate layout properties.** Transforms and opacity only. No `top`, `left`, `width`, `height`.

### Lenis + GSAP wiring

```
lerp: 0.1
duration: 1.2
easing: exponential-out
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add(t => lenis.raf(t * 1000))
gsap.ticker.lagSmoothing(0)
```

### Hero sequence

| # | Element | Technique | Timing |
|---|---|---|---|
| 1 | Logo | `DrawSVGPlugin` stroke reveal, staggered per path | 1.2s — **first visit only** (`sessionStorage` flag), otherwise tedious by the third load |
| 2 | Mauve block | `clip-path` inset from left | 0.9s, `expo.out` |
| 3 | Floor plan | Fade up, scale 1.02 → 1.0 | delayed 0.3s |
| 4 | Image slots | Individual `ScrollTrigger`s with **different `scrub` speeds** | on scroll |
| 5 | "Join Us" | `SplitText` by line, mask-reveal from below | 0.06s stagger |

**Step 4 is the single most important effect.** The parallax differential between the top-right and bottom-left photos is what makes the overlap feel three-dimensional rather than pasted.

### Pinning

Pin the hero briefly (`pin: true, scrub`) so the image slots drift past the mauve block before the page releases into section 2. **One pin, short duration.** Sites that pin every section feel like they're fighting the user.

### Page transitions

App Router has no native exit animation. Two options:

- **Custom `<TransitionProvider>`** — intercept navigation, run a mauve curtain wipe, then push. More code, full control. **Recommended**, given the precision you want.
- **Next 16.3 Instant Navigations + View Transitions API** — far less code, considerably less control.

### Card → detail Flip

`Flip.getState()` on the kanban card before navigating, `Flip.from()` after the modal mounts. The card literally grows into the detail panel. The intercepting-route structure from §4 keeps this URL-addressable.

### Reduced motion — non-negotiable

Wrap everything in `gsap.matchMedia()` with a `(prefers-reduced-motion: reduce)` branch that sets durations to zero and destroys the Lenis instance. A hiring page unusable by someone with vestibular sensitivity is a legal and ethical problem, not a design one.

### Licensing note

GSAP's premium plugins (SplitText, Flip, DrawSVG, ScrollTrigger) moved to free under Webflow's stewardship. **Verify current terms before shipping commercially** rather than taking this document's word for it.

---

## 14. Performance, accessibility, security

### Performance

- `next/image`, AVIF, `priority` on above-fold only.
- The floor plan render is likely enormous — **get it under 250KB** or LCP eats the entire motion budget.
- `ScrollTrigger.refresh()` after `document.fonts.ready`, or every trigger position is wrong on slow connections.
- `will-change` sparingly and removed after animation completes.
- Target: LCP < 2.0s, CLS < 0.05, 60fps scroll on a mid-tier laptop.

### Accessibility

- Full keyboard navigation through the apply flow. Real `<label>` elements. Errors via `aria-describedby`.
- `dnd-kit` keyboard sensors enabled on the board.
- Focus management on modal open/close, focus trap, restore on dismiss.
- Contrast check the mauve-on-bone and ink-on-mauve pairings against WCAG AA.
- **Test the entire apply flow with a screen reader.** Not a spot check.

### Security

- Service role key server-only. Never in a client bundle, never in `NEXT_PUBLIC_*`.
- CSP headers, HSTS, `X-Frame-Options`.
- Signed URLs short-lived both directions.
- No PII in client logs, Sentry breadcrumbs, or analytics events.
- **Data retention policy.** You are storing resumes and contact details of people who did not get the job. Decide the retention window now and write a scheduled purge. GDPR applies to EU applicants; **BC's PIPA applies to you directly**, as does PIPEDA. This is a launch requirement, not a follow-up.

---

## 15. Deployment

| Environment | Setup |
|---|---|
| Local | Supabase CLI, local Postgres, seeded reviewers |
| Preview | Vercel preview deploys + Supabase branching (own database per branch) |
| Production | Vercel production + Supabase production project |

- Migrations live in `supabase/migrations`, committed, applied via CI.
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `SENTRY_DSN`.
- Vercel Analytics on the public side only.
- `robots.txt` disallowing `/review` — belt and braces alongside the auth gate.

---

## 16. Build order

| Phase | Scope | Exit criteria |
|---|---|---|
| **1** | Repo scaffold, Tailwind tokens, type scale, `<ImageSlot>`, Supabase schema + RLS | RLS policies tested with an anon key — confirmed no read access to `applications` |
| **2** | Landing page, all three sections, **static, zero motion** | Composition matches the reference at every breakpoint |
| **3** | `content/job.ts` → form renderer → Zod → submission pipeline → signed-URL uploads | A 40MB PDF submits end to end |
| **4** | Google OAuth, reviewer allowlist, `proxy.ts` gate | Non-allowlisted Google account is rejected at both proxy and RLS |
| **5** | Kanban, drag/persist, detail modal, notes, realtime | Two browsers see each other's stage moves live |
| **6** | Lenis + GSAP pass, Flip transitions, background scrub, reduced-motion branch | 60fps scroll; reduced-motion path verified |
| **7** | Perf pass, a11y audit, retention purge, launch | Lighthouse ≥ 95 on the landing page |

> **Motion is Phase 6, not Phase 2.** Animating an interface you're still restructuring means rebuilding every timeline. Get the static composition exactly right first.

---

## 17. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Large portfolio uploads fail or time out | High | High | Direct-to-storage signed URLs, upload on select, per-file progress, resumable retry |
| Unlisted `/review` URL leaks | High | Low (if RLS correct) | RLS as the real boundary; the URL is convenience only |
| Motion work tanks Core Web Vitals | Medium | Medium | Aggressive image budget, motion deferred to Phase 6, measure before and after |
| Spam submissions after the posting goes public | Medium | Medium | Turnstile + honeypot + rate limit, in place before launch |
| Concurrent kanban edits clobber each other | Medium | Low | `updated_at` guard, realtime sync, `stage_events` audit trail for recovery |
| Design MCP stays unreadable, apply/review UI diverges from spec | Medium | High | Resolve blocker #1 before Phase 3 |
| Retention obligations discovered post-launch | Low | High | Purge job written in Phase 7, not deferred |

---

## Immediate next actions

1. Resolve blocker #1 — paste the Design files, or open the repo in Claude Code with the Design MCP attached.
2. Send assets and confirm the typeface.
3. Draft the role copy and question list, however rough.
4. Provide the Workspace domain and initial reviewer emails.

Once 1–4 land, Phase 1 can start immediately.

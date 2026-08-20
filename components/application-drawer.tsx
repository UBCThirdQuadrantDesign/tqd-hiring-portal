"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { STAGES, type ReviewerNote } from "@/lib/board-types";
import type { ApplicationStage } from "@/lib/schema";
import { application as applicationContent } from "@/content/application";
import { addNote as addNoteAction } from "@/app/(review)/review/actions";
import { useBoardStore } from "@/app/(review)/review/board-store";
import { drawerSkeletonJustShown, useLockBodyScroll } from "@/components/drawer-shell";
import { createClient } from "@/lib/supabase/client";
import { subscribeWithAuth } from "@/lib/supabase/realtime";

/** Must stay in sync with --drawer-duration in globals.css. */
const DRAWER_DURATION_MS = 220;

type Attachment = {
  id: string;
  kind: "resume" | "portfolio";
  filename: string;
};

/** Signed on click, not on panel open — see app/api/reviewer/attachment/[id]. */
function attachmentHref(id: string) {
  return `/api/reviewer/attachment/${id}`;
}

type Note = ReviewerNote;

/** Locally-added notes carry this id prefix until the server broadcast lands. */
const OPTIMISTIC_PREFIX = "optimistic-";

type ApplicationDetail = {
  id: string;
  full_name: string;
  email: string;
  faculty: string;
  year: string;
  subteam: string;
  stage: ApplicationStage;
  starred: boolean;
  created_at: string;
  answers: {
    why_join: string;
    hours_per_week: string;
    other_commitments: string;
  };
};

export function ApplicationDrawer({
  application,
  attachments,
  notes,
  mode,
}: {
  application: ApplicationDetail;
  attachments: Attachment[];
  notes: Note[];
  mode: "modal" | "page";
}) {
  const router = useRouter();
  const { getCard, starCard, setCardStage } = useBoardStore();
  const [localNotes, setLocalNotes] = useState(notes);
  const [draft, setDraft] = useState("");
  const [closing, setClosing] = useState(false);
  // The loading skeleton already slid the panel in — don't replay it.
  const [skipEntrance] = useState(() => mode === "modal" && drawerSkeletonJustShown());
  const [, startTransition] = useTransition();
  const [supabase] = useState(() => createClient());

  // Reopening the panel on a different applicant can reuse this component
  // instance, and the previous applicant's notes would linger. Reseed during
  // render (React's adjust-state-on-prop-change pattern) rather than in an
  // effect, so the stale list never paints.
  const applicationId = application.id;
  const [seededFor, setSeededFor] = useState(applicationId);
  if (seededFor !== applicationId) {
    setSeededFor(applicationId);
    setLocalNotes(notes);
  }

  // Notes stream in too, so a note left by another reviewer appears in an
  // already-open panel. Realtime rows carry author_id, not a name, so resolve
  // it against the reviewer roster the same way getApplicationDetail does. The
  // roster query and the subscription start together, but the channel has to
  // authenticate first, so the map is populated by the time events arrive.
  useEffect(() => {
    let cancelled = false;
    const authors = new Map<string, string>();

    void supabase
      .from("reviewers")
      .select("id, name, email")
      .then(({ data }) => {
        if (cancelled) return;
        for (const r of data ?? []) authors.set(r.id, r.name ?? r.email ?? "Reviewer");
      });

    const unsubscribe = subscribeWithAuth<{
      id: string;
      body: string;
      created_at: string;
      author_id: string;
    }>(
      supabase,
      `notes-${applicationId}`,
      {
        event: "*",
        schema: "public",
        table: "notes",
        filter: `application_id=eq.${applicationId}`,
      },
      (payload) => {
        setLocalNotes((prev) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return id ? prev.filter((n) => n.id !== id) : prev;
          }
          const row = payload.new;
          const note: Note = {
            id: row.id,
            body: row.body,
            created_at: row.created_at,
            author_name: authors.get(row.author_id) ?? "Reviewer",
          };
          if (prev.some((n) => n.id === note.id)) {
            return prev.map((n) => (n.id === note.id ? note : n));
          }
          // Our own note coming back from the server: swap the optimistic copy
          // for the real row instead of rendering it twice.
          const optimistic = prev.findIndex(
            (n) => n.id.startsWith(OPTIMISTIC_PREFIX) && n.body === note.body
          );
          if (optimistic !== -1) {
            const next = [...prev];
            next[optimistic] = { ...note, author_name: "You" };
            return next;
          }
          return [...prev, note];
        });
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [supabase, applicationId]);

  // The board owns stage/starred so both views move together. Falling back to
  // the server props keeps this working if the card somehow isn't in the store.
  const card = getCard(application.id);
  const stage = card?.stage ?? application.stage;
  const starred = card?.starred ?? application.starred;

  // Play the exit animation before unmounting; navigating straight away is
  // what made closing feel like a jump cut.
  const navigatedRef = useRef(false);
  const leave = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.back();
  }, [router]);

  const close = useCallback(() => {
    if (mode !== "modal") {
      router.push("/review");
      return;
    }
    setClosing(true);
  }, [mode, router]);

  // animationend is the primary trigger; this is the backstop for the cases
  // where it never fires (background tab, reduced motion collapsing it).
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(leave, DRAWER_DURATION_MS + 60);
    return () => clearTimeout(t);
  }, [closing, leave]);

  useEffect(() => {
    if (mode !== "modal") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, close]);

  useLockBodyScroll(mode === "modal");

  const changeStage = (next: ApplicationStage) => {
    setCardStage(application.id, next);
  };

  const toggleStar = () => {
    starCard(application.id, !starred);
  };

  const submitNote = () => {
    const body = draft.trim();
    if (!body) return;
    const optimistic: Note = {
      id: `${OPTIMISTIC_PREFIX}${Date.now()}`,
      body,
      created_at: new Date().toISOString(),
      author_name: "You",
    };
    setLocalNotes((prev) => [...prev, optimistic]);
    setDraft("");
    startTransition(() => {
      addNoteAction(application.id, body).catch(() => {});
    });
  };

  const resume = attachments.find((a) => a.kind === "resume");
  const portfolio = attachments.find((a) => a.kind === "portfolio");

  const fields: { label: string; value: string }[] = [
    { label: "Email", value: application.email },
    { label: "Faculty", value: application.faculty },
    { label: "Year", value: application.year },
    { label: "Sub-team", value: application.subteam },
    { label: "Hours / week", value: application.answers.hours_per_week || "—" },
  ];

  const wrapperClass =
    mode === "modal"
      ? `w-[560px] max-w-[92vw] h-full overflow-y-auto bg-bone border-l border-border ${
          closing ? "drawer-panel-out" : skipEntrance ? "" : "drawer-panel-in"
        }`
      : "max-w-[780px] mx-auto";

  const content = (
    <div className={wrapperClass}>
      <div
        className="flex items-start justify-between gap-5 px-8 py-7 border-b border-rule sticky top-0 bg-bone"
      >
        <div>
          <div className="text-[28px] leading-[1.05] font-extrabold tracking-[-0.025em]">
            {application.full_name}
          </div>
          <div className="mt-2 text-[13px] text-[#6b6a62]">
            {applicationContent.title} · applied{" "}
            {new Date(application.created_at).toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={toggleStar}
            className="px-3.5 py-2 border border-border text-[11px] font-bold tracking-[0.12em] uppercase cursor-pointer whitespace-nowrap"
            style={{
              background: starred ? "#E3E8CE" : "transparent",
              color: starred ? "#3F4A22" : "#5C5A51",
            }}
          >
            {starred ? "★ Starred" : "☆ Star"}
          </button>
          <button
            onClick={close}
            className="px-3 py-2 border border-border text-[13px] cursor-pointer hover:bg-sage-pale"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="px-8 py-7 grid gap-8">
        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted mb-3">
            Stage
          </div>
          <div className="flex gap-px bg-rule border border-rule">
            {STAGES.map((s) => (
              <button
                key={s.key}
                onClick={() => changeStage(s.key)}
                className="flex-1 px-2 py-2.5 text-center text-[10px] font-bold tracking-[0.1em] uppercase cursor-pointer"
                style={{
                  background: stage === s.key ? "#1C1C1A" : "#EFEDE6",
                  color: stage === s.key ? "#EFEDE6" : "#5C5A51",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid">
          {fields.map((f) => (
            <div
              key={f.label}
              className="grid grid-cols-[120px_1fr] gap-5 py-3.5 border-b border-rule-faint"
            >
              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
                {f.label}
              </div>
              <div className="text-sm leading-snug break-words">{f.value}</div>
            </div>
          ))}
          <div className="grid grid-cols-[120px_1fr] gap-5 py-3.5 border-b border-rule-faint">
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Résumé</div>
            <div className="text-sm">
              {resume ? (
                <a href={attachmentHref(resume.id)} target="_blank" rel="noreferrer">
                  {resume.filename}
                </a>
              ) : (
                "—"
              )}
            </div>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-5 py-3.5 border-b border-rule-faint">
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Portfolio</div>
            <div className="text-sm">
              {portfolio ? (
                <a href={attachmentHref(portfolio.id)} target="_blank" rel="noreferrer">
                  {portfolio.filename}
                </a>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted mb-3">
            Why Third Quadrant?
          </div>
          <div className="bg-surface border border-rule-soft p-5 text-[15px] leading-relaxed text-body text-pretty">
            {application.answers.why_join}
          </div>
        </div>

        {application.answers.other_commitments && (
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted mb-3">
              Other commitments
            </div>
            <div className="bg-surface border border-rule-soft p-5 text-[15px] leading-relaxed text-body text-pretty">
              {application.answers.other_commitments}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted mb-3">
            Reviewer notes
          </div>
          <div className="grid gap-2.5">
            {localNotes.map((n) => (
              <div key={n.id} className="bg-sage-pale p-3.5 px-4">
                <div className="flex justify-between gap-3 text-[10px] font-bold tracking-[0.12em] uppercase text-olive">
                  <div>{n.author_name}</div>
                  <div>
                    {new Date(n.created_at).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="mt-2 text-sm leading-relaxed text-sage-deep">{n.body}</div>
              </div>
            ))}
            {localNotes.length === 0 && (
              <div className="py-3.5 text-[13px] text-faint">No notes yet.</div>
            )}
          </div>
          <div className="mt-3.5 grid gap-2.5">
            <textarea
              rows={3}
              placeholder="Add a note for the review team"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="p-3.5 text-sm leading-relaxed bg-surface border border-border outline-none focus:border-olive-light focus:bg-white"
            />
            <button
              onClick={submitNote}
              className="justify-self-start px-5 py-3 bg-ink text-bone text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer hover:bg-olive transition-colors"
            >
              Save note
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (mode === "page") {
    return (
      <div className="px-6 sm:px-10 py-10">
        <button
          onClick={() => router.push("/review")}
          className="mb-6 text-[11px] font-bold tracking-[0.14em] uppercase text-muted cursor-pointer"
        >
          ← Back to board
        </button>
        {content}
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex justify-end ${
        closing ? "drawer-scrim-out" : skipEntrance ? "" : "drawer-scrim-in"
      }`}
      style={{ background: "rgba(28,28,26,0.32)" }}
      onAnimationEnd={(e) => {
        // Only the scrim's own animation — not any bubbling from inside.
        if (closing && e.target === e.currentTarget) leave();
      }}
    >
      <div className="flex-1" onClick={close} />
      {content}
    </div>
  );
}

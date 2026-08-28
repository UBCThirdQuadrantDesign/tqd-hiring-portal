"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { submitApplication, type SubmitState } from "./actions";
import { application, question } from "@/content/application";
import { useFileUpload } from "@/lib/use-file-upload";
import { FileDropField } from "@/components/file-drop-field";

const DRAFT_KEY = `tqd-application-draft-${application.cycle}`;
const initialState: SubmitState = { ok: false };

type DraftFields = {
  full_name: string;
  email: string;
  faculty: string;
  year: string;
  subteam: string;
  why_join: string;
  skills: string;
  hours_per_week: string;
  other_commitments: string;
};

const emptyDraft: DraftFields = {
  full_name: "",
  email: "",
  faculty: "",
  year: "",
  subteam: "",
  why_join: "",
  skills: "",
  hours_per_week: "",
  other_commitments: "",
};

function wordCount(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function ApplyForm({ onSubmitted }: { onSubmitted: (name: string) => void }) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [draftId] = useState(() => nanoid());
  // Draft persistence — long-form answers are the thing most likely to be
  // lost to an accidental navigation. The saved draft can only be read after
  // mount: reading it during the initial render makes the client markup differ
  // from the server's (which has no localStorage) and fails hydration.
  const [fields, setFields] = useState<DraftFields>(emptyDraft);
  const draftLoaded = useRef(false);
  const [state, formAction, pending] = useActionState(submitApplication, initialState);

  const resume = useFileUpload("resume", draftId);
  const portfolio = useFileUpload("portfolio", draftId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setFields((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch {
      // ignore
    }
    draftLoaded.current = true;
  }, []);

  useEffect(() => {
    // Don't let the empty first render overwrite a stored draft.
    if (!draftLoaded.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(fields));
    } catch {
      // ignore
    }
  }, [fields]);

  useEffect(() => {
    if (state.ok && state.submittedName) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      onSubmitted(state.submittedName);
    }
  }, [state, onSubmitted]);

  // Native constraint validation is off (see noValidate below) so every
  // rejection comes back from the server action at once. Nothing scrolls the
  // page for us any more, so jump to the first offending field ourselves —
  // otherwise an error 800px down the form is invisible after submit.
  useEffect(() => {
    const form = formRef.current;
    const errors = state.fieldErrors;
    if (!form || !errors || Object.keys(errors).length === 0) return;

    // Server issue order is schema order, not page order — walk the DOM so we
    // land on whichever bad field is physically highest. The file fields have
    // no focusable control of their own, so they carry a data-field-anchor.
    const target = Array.from(
      form.querySelectorAll<HTMLElement>("[name], [data-field-anchor]")
    ).find((el) => {
      const key = el.dataset.fieldAnchor ?? el.getAttribute("name");
      if (!key || !(key in errors)) return false;
      // Skips the hidden *_path inputs, which have no layout box.
      return el.offsetParent !== null || el.getBoundingClientRect().height > 0;
    });
    if (!target) return;

    const anchor = target.closest("label") ?? target;
    const top = window.scrollY + anchor.getBoundingClientRect().top - 120;
    window.scrollTo({ top: Math.max(top, 0), behavior: "auto" });
    // preventScroll so the browser does not re-centre and undo the landing.
    if (typeof (target as HTMLInputElement).focus === "function") {
      (target as HTMLInputElement).focus({ preventScroll: true });
    }
  }, [state]);

  const field = (k: keyof DraftFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  // All label/placeholder/limit copy comes from content/application.ts so the
  // form can't drift from the source of truth (and from the Zod schema, which
  // reads the same word caps).
  const nameQ = question("full_name");
  const emailQ = question("email");
  const facultyQ = question("faculty");
  const yearQ = question("year");
  const subteamQ = question("subteam");
  const whyQ = question("why_join");
  const skillsQ = question("skills");
  const hoursQ = question("hours_per_week");
  const commitQ = question("other_commitments");
  const resumeQ = question("resume");
  const portfolioQ = question("portfolio");
  const whyWords = useMemo(() => wordCount(fields.why_join), [fields.why_join]);
  const skillsWords = useMemo(() => wordCount(fields.skills), [fields.skills]);
  const commitWords = useMemo(() => wordCount(fields.other_commitments), [fields.other_commitments]);

  // The counter is the only thing telling someone they have overrun the limit
  // before they submit — left muted, "300 / 250 words" reads like a progress
  // note rather than a problem, and the first real signal is a bounced submit.
  const counterClass = (count: number, limit: number) =>
    count > limit
      ? "text-[13px] font-semibold text-red-700"
      : "text-[13px] text-muted";

  const inputClass =
    "px-4 py-3.5 text-base text-ink bg-surface border border-border outline-none transition-colors focus:border-olive-light focus:bg-white";
  const labelClass = "text-xs font-bold tracking-[0.1em] uppercase text-body";

  // Native <select> arrows are painted by the UA flush against the right
  // border and ignore padding-right, so we hide the native one and draw our
  // own chevron as a background image we can inset properly.
  const selectClass = `${inputClass} appearance-none bg-no-repeat cursor-pointer pr-11`;
  const selectArrow = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' stroke='%238b897e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    backgroundPosition: "right 1rem center",
    backgroundSize: "12px 8px",
  };

  // A required upload has to have finished; an optional one only blocks while
  // it is still in flight (leaving it empty, or failed and removed, is fine).
  const uploadReady = (status: string, required: boolean) =>
    required ? status === "done" : status !== "uploading";
  const canSubmit =
    uploadReady(resume.state.status, resumeQ.required) &&
    uploadReady(portfolio.state.status, portfolioQ.required) &&
    !pending;

  return (
    <form ref={formRef} id={formId} action={formAction} noValidate className="grid gap-11 w-full">
      {application.meta
        .filter((m) => m.label === "Closes")
        .map((m) => (
          <div key={m.label}>
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
              {m.label}
            </div>
            <div className="mt-2 text-[15px] leading-snug">{m.value}</div>
          </div>
        ))}

      {/* honeypot — hidden from real applicants, screen readers skip via aria-hidden */}
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.error && (
        <p className="text-sm text-red-800 bg-red-100 border border-red-200 px-4 py-3" role="alert">
          {state.error}
        </p>
      )}

      <div className="grid gap-[22px]">
        <label className="grid gap-2 content-start">
          <span className={labelClass}>{nameQ.label}</span>
          <input
            name="full_name"
            type="text"
            placeholder={nameQ.placeholder}
            value={fields.full_name}
            onChange={field("full_name")}
            className={inputClass}
            aria-describedby={state.fieldErrors?.full_name ? `${formId}-full_name-error` : undefined}
          />
          {state.fieldErrors?.full_name && (
            <span id={`${formId}-full_name-error`} className="text-xs text-red-700">
              {state.fieldErrors.full_name}
            </span>
          )}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[22px]">
          <label className="grid gap-2 content-start">
            <span className={labelClass}>{emailQ.label}</span>
            <input
              name="email"
              type="email"
              placeholder={emailQ.placeholder}
              value={fields.email}
              onChange={field("email")}
              className={inputClass}
              aria-describedby={state.fieldErrors?.email ? `${formId}-email-error` : undefined}
            />
            {state.fieldErrors?.email && (
              <span id={`${formId}-email-error`} className="text-xs text-red-700">
                {state.fieldErrors.email}
              </span>
            )}
          </label>
          <label className="grid gap-2 content-start">
            <span className={labelClass}>{facultyQ.label}</span>
            <input
              name="faculty"
              type="text"
              placeholder={facultyQ.placeholder}
              value={fields.faculty}
              onChange={field("faculty")}
              className={inputClass}
              aria-describedby={state.fieldErrors?.faculty ? `${formId}-faculty-error` : undefined}
            />
            {state.fieldErrors?.faculty && (
              <span id={`${formId}-faculty-error`} className="text-xs text-red-700">
                {state.fieldErrors.faculty}
              </span>
            )}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[22px]">
        <label className="grid gap-2 content-start">
          <span className={labelClass}>{yearQ.label}</span>
          <select
            name="year"
            value={fields.year}
            onChange={field("year")}
            className={selectClass}
            style={selectArrow}
            required
            aria-describedby={state.fieldErrors?.year ? `${formId}-year-error` : undefined}
          >
            <option value="" disabled>
              Choose one
            </option>
            {yearQ.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {state.fieldErrors?.year && (
            <span id={`${formId}-year-error`} className="text-xs text-red-700">
              {state.fieldErrors.year}
            </span>
          )}
        </label>
        <label className="grid gap-2 content-start">
          <span className={labelClass}>{subteamQ.label}</span>
          <select
            name="subteam"
            value={fields.subteam}
            onChange={field("subteam")}
            className={selectClass}
            style={selectArrow}
            required
            aria-describedby={state.fieldErrors?.subteam ? `${formId}-subteam-error` : undefined}
          >
            <option value="" disabled>
              Choose one
            </option>
            {subteamQ.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {state.fieldErrors?.subteam && (
            <span id={`${formId}-subteam-error`} className="text-xs text-red-700">
              {state.fieldErrors.subteam}
            </span>
          )}
        </label>
      </div>

      <label className="grid gap-2 content-start">
        <span className={labelClass}>{whyQ.label}</span>
        <textarea
          name="why_join"
          rows={7}
          placeholder={whyQ.placeholder}
          value={fields.why_join}
          onChange={field("why_join")}
          className={inputClass}
          aria-describedby={state.fieldErrors?.why_join ? `${formId}-why_join-error` : undefined}
        />
        <span className={counterClass(whyWords, whyQ.maxWords)} aria-live="polite">
          {whyWords} / {whyQ.maxWords} words
          {whyWords > whyQ.maxWords && " — over the limit"}
        </span>
        {state.fieldErrors?.why_join && (
          <span id={`${formId}-why_join-error`} className="text-xs text-red-700">
            {state.fieldErrors.why_join}
          </span>
        )}
      </label>

      <label className="grid gap-2 content-start">
        <span className={labelClass}>{skillsQ.label}</span>
        <textarea
          name="skills"
          rows={7}
          placeholder={skillsQ.placeholder}
          value={fields.skills}
          onChange={field("skills")}
          className={inputClass}
          aria-describedby={state.fieldErrors?.skills ? `${formId}-skills-error` : undefined}
        />
        <span className={counterClass(skillsWords, skillsQ.maxWords)} aria-live="polite">
          {skillsWords} / {skillsQ.maxWords} words
          {skillsWords > skillsQ.maxWords && " — over the limit"}
        </span>
        {state.fieldErrors?.skills && (
          <span id={`${formId}-skills-error`} className="text-xs text-red-700">
            {state.fieldErrors.skills}
          </span>
        )}
      </label>

      <label className="grid gap-2 content-start">
        <span className={labelClass}>{hoursQ.label}</span>
        <input
          name="hours_per_week"
          type="text"
          placeholder={hoursQ.placeholder}
          value={fields.hours_per_week}
          onChange={field("hours_per_week")}
          className={inputClass}
          aria-describedby={state.fieldErrors?.hours_per_week ? `${formId}-hours_per_week-error` : undefined}
        />
        {state.fieldErrors?.hours_per_week && (
          <span id={`${formId}-hours_per_week-error`} className="text-xs text-red-700">
            {state.fieldErrors.hours_per_week}
          </span>
        )}
      </label>

      <label className="grid gap-2 content-start">
        <span className={labelClass}>{commitQ.label}</span>
        <textarea
          name="other_commitments"
          rows={4}
          placeholder={commitQ.placeholder}
          value={fields.other_commitments}
          onChange={field("other_commitments")}
          className={inputClass}
          aria-describedby={state.fieldErrors?.other_commitments ? `${formId}-other_commitments-error` : undefined}
        />
        <span className={counterClass(commitWords, commitQ.maxWords)} aria-live="polite">
          {commitWords} / {commitQ.maxWords} words
          {commitWords > commitQ.maxWords && " — over the limit"}
        </span>
        {state.fieldErrors?.other_commitments && (
          <span id={`${formId}-other_commitments-error`} className="text-xs text-red-700">
            {state.fieldErrors.other_commitments}
          </span>
        )}
      </label>

      <div className="grid gap-6">
        <div data-field-anchor="resume_path">
          <FileDropField
            label={resumeQ.label}
            accept={resumeQ.accept}
            maxSize={resumeQ.maxSize}
            state={resume.state}
            onFile={resume.upload}
            onRemove={resume.reset}
            error={state.fieldErrors?.resume_path}
            optional={!resumeQ.required}
          />
        </div>
        <div data-field-anchor="portfolio_path">
          <FileDropField
            label={portfolioQ.label}
            accept={portfolioQ.accept}
            maxSize={portfolioQ.maxSize}
            state={portfolio.state}
            onFile={portfolio.upload}
            onRemove={portfolio.reset}
            error={state.fieldErrors?.portfolio_path}
            optional={!portfolioQ.required}
          />
        </div>
        <input type="hidden" name="resume_path" value={resume.state.path ?? ""} />
        <input type="hidden" name="portfolio_path" value={portfolio.state.path ?? ""} />
      </div>

      <div className="flex justify-end flex-col sm:flex-row items-start sm:items-center justify-between gap-8 pt-10">
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-8 py-[18px] bg-ink text-bone text-xs font-bold tracking-[0.16em] uppercase cursor-pointer hover:bg-olive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useRef } from "react";
import type { UploadState } from "@/lib/use-file-upload";

export function FileDropField({
  label,
  accept,
  maxSize,
  state,
  onFile,
  onRemove,
  error,
}: {
  label: string;
  accept: readonly string[];
  maxSize: number;
  state: UploadState;
  onFile: (file: File) => void;
  onRemove: () => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  // Anything but "idle" means there is a selection to clear — a failed or
  // in-flight upload is just as worth backing out of as a finished one.
  const canRemove = state.status !== "idle";

  const handleRemove = () => {
    // Without this the input keeps the old file and re-picking it is a no-op.
    if (inputRef.current) inputRef.current.value = "";
    onRemove();
  };

  // The cap is enforced server-side in /api/upload-url, which rejects with the
  // same MB figure; showing it up front saves the applicant a failed upload.
  const maxSizeLabel = `${Math.round(maxSize / 1_000_000)}MB`;

  // Derived from `accept` so the two never drift — the picker and the prompt
  // are the applicant's only signal about what the field will take.
  const acceptLabel = accept
    .map((type) => type.split("/")[1]?.toUpperCase() ?? type)
    .join(" or ");

  const statusText =
    state.status === "uploading"
      ? `Uploading ${state.filename} — ${state.progress}%`
      : state.status === "done"
      ? `${state.filename}`
      : state.status === "error"
      ? state.error ?? "Upload failed. Try again."
      : `Attach ${acceptLabel} (max ${maxSizeLabel})`;

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-bold tracking-[0.1em] uppercase text-body">
          {label}
        </span>
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="flex items-center gap-4 p-6 bg-surface border border-dashed border-[#b9b6a9] cursor-pointer hover:border-olive-light hover:bg-white transition-colors"
      >
        <div className="px-5 py-2.5 bg-ink text-bone text-[11px] font-bold tracking-[0.14em] uppercase shrink-0">
          Upload file
        </div>
        <div
          className={`text-sm ${
            state.status === "error" ? "text-red-700" : "text-[#6b6a62]"
          }`}
        >
          {statusText}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            aria-label={`Remove ${state.filename ?? label}`}
            className="ml-auto shrink-0 px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] uppercase text-[#6b6a62] border border-[#b9b6a9] hover:text-red-800 hover:border-red-300 hover:bg-red-100 transition-colors"
          >
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}

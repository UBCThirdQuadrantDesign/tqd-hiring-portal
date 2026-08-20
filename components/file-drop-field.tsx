"use client";

import { useRef } from "react";
import type { UploadState } from "@/lib/use-file-upload";

export function FileDropField({
  label,
  accept,
  state,
  onFile,
  error,
}: {
  label: string;
  accept: readonly string[];
  state: UploadState;
  onFile: (file: File) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const statusText =
    state.status === "uploading"
      ? `Uploading ${state.filename} — ${state.progress}%`
      : state.status === "done"
      ? `${state.filename} — attached`
      : state.status === "error"
      ? state.error ?? "Upload failed. Try again."
      : "PDF, up to the size limit — click or drag and drop";

  return (
    <div className="grid gap-2">
      <span className="text-xs font-bold tracking-[0.1em] uppercase text-body">
        {label}
      </span>
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

"use client";

import { useCallback, useState } from "react";

export type UploadState = {
  filename: string | null;
  path: string | null;
  progress: number; // 0-100
  status: "idle" | "uploading" | "done" | "error";
  error: string | null;
};

const initialState: UploadState = {
  filename: null,
  path: null,
  progress: 0,
  status: "idle",
  error: null,
};

/**
 * Uploads begin on file-select, not on submit — a 40MB portfolio that
 * only starts uploading after the applicant hits "Submit" loses people.
 * PUTs direct to Supabase Storage via a signed URL (Vercel Server
 * Actions cap request bodies ~4.5MB, well under a résumé/portfolio).
 * XMLHttpRequest is used instead of fetch for real upload progress.
 */
export function useFileUpload(kind: "resume" | "portfolio", draftId: string) {
  const [state, setState] = useState<UploadState>(initialState);

  const upload = useCallback(
    async (file: File) => {
      setState({ ...initialState, filename: file.name, status: "uploading" });

      try {
        const res = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            filename: file.name,
            size: file.size,
            draftId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not start upload.");

        const { signedUrl, path } = data as { signedUrl: string; path: string };

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signedUrl);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setState((s) => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) }));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error("Upload failed."));
          };
          xhr.onerror = () => reject(new Error("Upload failed."));
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.send(file);
        });

        setState((s) => ({ ...s, status: "done", progress: 100, path }));
      } catch (err) {
        setState((s) => ({
          ...s,
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed.",
        }));
      }
    },
    [kind, draftId]
  );

  const reset = useCallback(() => setState(initialState), []);

  return { state, upload, reset };
}

export const APPLICATIONS_BUCKET = "applications";
export const SIGNED_URL_TTL_SECONDS = 60;

/** Storage path for an in-progress (pre-submit) upload. */
export function draftUploadPath(draftId: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${draftId}/${safeName}`;
}

/** Shape produced by draftUploadPath(): `<nanoid>/<sanitised-name>`. */
export const UPLOAD_PATH_PATTERN = /^[A-Za-z0-9_-]{1,32}\/[A-Za-z0-9._-]{1,255}$/;

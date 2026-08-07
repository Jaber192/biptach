import { supabase } from "./supabase";
import { isOnline } from "./offlineQueue";

/**
 * Media storage strategy (enterprise pattern):
 *
 * Photos and signatures are uploaded to Supabase Storage (S3-compatible
 * object storage) and only their public URLs are stored in the database.
 * This keeps `work_orders` rows tiny and queries fast.
 *
 * Graceful degradation:
 * - Offline, or if an upload fails, the caller falls back to storing the
 *   compressed image inline as a base64 data URL (previous behavior).
 * - Display code uses `<img src={value}>`, which works for both data URLs
 *   and public Storage URLs, so no rendering changes are needed.
 */

const BUCKET = "job-media";

// If one upload fails (e.g. bucket missing/misconfigured), stop attempting
// uploads for the rest of the session and fall back to inline base64.
let storageAvailable = true;

/** True when the stored value is a Supabase Storage public URL. */
export function isStorageUrl(value: string): boolean {
  return typeof value === "string" && value.includes(`/storage/v1/object/public/${BUCKET}/`);
}

/**
 * Upload a compressed job photo to Supabase Storage.
 * Returns the public URL on success, or null when offline/unavailable
 * (caller should fall back to storing the data URL inline).
 */
export async function uploadJobPhoto(workOrderId: string, blob: Blob): Promise<string | null> {
  if (!isOnline() || !storageAvailable) return null;

  const path = `photos/${workOrderId}/${randomName("jpg")}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });

  if (error) {
    console.warn("Photo upload failed (falling back to inline storage):", error.message);
    storageAvailable = false;
    return null;
  }

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Upload a signature (PNG data URL from SignaturePad) to Supabase Storage.
 * Returns the public URL on success, or null when offline/unavailable.
 */
export async function uploadJobSignature(
  workOrderId: string,
  dataUrl: string,
): Promise<string | null> {
  if (!isOnline() || !storageAvailable) return null;

  const blob = await dataUrlToBlob(dataUrl);
  if (!blob) return null;

  const path = `signatures/${workOrderId}/${randomName("png")}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/png" });

  if (error) {
    console.warn("Signature upload failed (falling back to inline storage):", error.message);
    storageAvailable = false;
    return null;
  }

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort deletion of a previously uploaded media object.
 * Only acts on Storage URLs; inline base64 values need no cleanup.
 */
export async function deleteMediaByUrl(url: string): Promise<void> {
  if (!isStorageUrl(url) || !isOnline()) return;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;

  const path = decodeURIComponent(url.slice(idx + marker.length));
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    // Non-fatal: orphaned objects cost little; don't disrupt the UI.
    console.warn("Media cleanup failed:", error.message);
  }
}

/** Generate a collision-safe random object name with the given extension. */
function randomName(ext: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${id}.${ext}`;
}

/** Convert a data URL (e.g. from canvas.toDataURL) into a Blob. */
async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(dataUrl);
    return await response.blob();
  } catch {
    return null;
  }
}

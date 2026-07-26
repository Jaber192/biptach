import { supabase } from "./supabase";

const BUCKET = "job-assets";

export async function uploadJobPhoto(
  workOrderId: string,
  file: File,
): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${workOrderId}/photos/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Photo upload failed:", error.message);
    return null;
  }
  return path;
}

export async function uploadSignature(
  workOrderId: string,
  dataUrl: string,
): Promise<string | null> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${workOrderId}/signatures/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/png", upsert: false });

  if (error) {
    console.error("Signature upload failed:", error.message);
    return null;
  }
  return path;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error("Signed URL failed:", error?.message ?? "unknown");
    return null;
  }
  return data.signedUrl;
}

export async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    paths.map(async (p) => {
      const url = await getSignedUrl(p);
      if (url) map.set(p, url);
    }),
  );
  return map;
}

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "mineral-photos";

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    if (scale === 1 && file.size < 800_000) {
      bitmap.close?.();
      return file;
    }
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return file;
    return blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const isJpeg = blob.type === "image/jpeg" || blob !== file;
  const ext = isJpeg ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase();
  const contentType = isJpeg ? "image/jpeg" : file.type || "image/jpeg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/**
 * UV-Foto: leichtes Kontrast-/Schwarzabgleich-Preset per Canvas anwenden
 * (mehr Kontrast, kräftigere Farben, dunkleres Schwarz) und in den
 * Ordner `{userId}/uv/` hochladen.
 */
async function applyUvPreset(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    // Preset: mehr Kontrast + tiefere Schwarztöne + kräftigere UV-Farben
    ctx.filter = "contrast(1.35) saturate(1.4) brightness(0.92)";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function uploadUvPhoto(userId: string, file: File): Promise<string> {
  const blob = await applyUvPreset(file);
  const path = `${userId}/uv/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deletePhotos(paths: string[]) {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function getPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Signed URL optimized for the zoom/lightbox view: server-side resized to
 * fit within `maxSize` px on the long edge. Much faster than loading the
 * full original (which can be multi-MB) while still high enough quality
 * for pinch-zoom on mobile and desktop inspection.
 */
export async function getZoomPhotoUrl(
  path: string,
  maxSize = 1600,
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60, {
        transform: { width: maxSize, height: maxSize, resize: "contain", quality: 82 },
      });
    if (error) throw error;
    return data.signedUrl;
  } catch {
    return getPhotoUrl(path);
  }
}

/**
 * Returns a signed URL for the ORIGINAL (pre-AI-edit) version of a photo
 * if a backup exists in the `originals/` folder, otherwise falls back to
 * the current (possibly edited) file.
 */
export async function getOriginalPhotoUrl(path: string): Promise<string> {
  const idx = path.indexOf("/");
  if (idx > 0) {
    const userPart = path.slice(0, idx);
    const rest = path.slice(idx + 1);
    const originalPath = `${userPart}/originals/${rest}`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(originalPath, 60 * 60);
    if (!error && data?.signedUrl) {
      try {
        const head = await fetch(data.signedUrl, { method: "HEAD" });
        if (head.ok) return data.signedUrl;
      } catch {
        /* fall through */
      }
    }
  }
  return getPhotoUrl(path);
}

export async function getPhotoUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  return data.map((d) => d.signedUrl ?? "");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex++;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

/**
 * Like getPhotoUrls but requests a small, server-side resized thumbnail
 * via backend image transformation. Drastically reduces bytes downloaded
 * for list views (from ~500 KB–1 MB per full image to ~10–30 KB).
 */
export async function getPhotoThumbUrls(
  paths: string[],
  size = 200,
): Promise<string[]> {
  if (paths.length === 0) return [];
  return mapWithConcurrency(paths, 6, async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60, {
          transform: { width: size, height: size, resize: "cover", quality: 75 },
        });
      if (error) throw error;
      return data.signedUrl;
    } catch {
      return "";
    }
  });
}

export async function fetchPhotoDataUrl(path: string): Promise<string> {
  const url = await getPhotoUrl(path);
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
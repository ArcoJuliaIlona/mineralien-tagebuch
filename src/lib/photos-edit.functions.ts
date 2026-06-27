import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "mineral-photos";

function originalPath(path: string): string {
  const idx = path.indexOf("/");
  if (idx < 0) throw new Error("Ungültiger Pfad");
  const userPart = path.slice(0, idx);
  const rest = path.slice(idx + 1);
  return `${userPart}/originals/${rest}`;
}

function assertOwned(path: string, userId: string) {
  if (!path.startsWith(`${userId}/`)) throw new Error("Zugriff verweigert");
  if (path.includes("..")) throw new Error("Ungültiger Pfad");
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin);
  const type = blob.type || "image/jpeg";
  return `data:${type};base64,${b64}`;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("KI-Antwort ohne Bild");
  const contentType = m[1];
  const bin = atob(m[2]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { blob: new Blob([arr], { type: contentType }), contentType };
}

async function backupExists(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>,
  path: string,
): Promise<boolean> {
  const orig = originalPath(path);
  const slash = orig.lastIndexOf("/");
  const folder = orig.slice(0, slash);
  const name = orig.slice(slash + 1);
  const { data } = await supabase.storage.from(BUCKET).list(folder, { search: name, limit: 1 });
  return !!data?.some((f) => f.name === name);
}

export const hasOriginalBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { path?: unknown };
    if (!i || typeof i.path !== "string") throw new Error("Pfad fehlt");
    return { path: i.path };
  })
  .handler(async ({ data, context }): Promise<{ exists: boolean }> => {
    assertOwned(data.path, context.userId);
    const exists = await backupExists(context.supabase as never, data.path);
    return { exists };
  });

export const blackenPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { path?: unknown };
    if (!i || typeof i.path !== "string") throw new Error("Pfad fehlt");
    return { path: i.path };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    return runEdit(data.path, context, "black");
  });

export const studioBackgroundPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { path?: unknown };
    if (!i || typeof i.path !== "string") throw new Error("Pfad fehlt");
    return { path: i.path };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    return runEdit(data.path, context, "studio");
  });

const PROMPTS = {
  black:
    "Isolate ONLY the mineral, fossil, or rock specimen in this image and place it on a pure solid black (#000000) background. CRITICAL: Completely remove EVERYTHING that is not the specimen itself — including any human hands, fingers, skin, gloves, tweezers, labels, paper, scale bars, tables, cloth, or other objects. Every pixel that is not the actual stone/fossil/mineral specimen must become pure black. FRAMING (MANDATORY — DO NOT IGNORE): The specimen MUST fill at least 92% of the shorter image dimension. Zoom in / scale the specimen UP until its longest edge nearly touches the image borders, leaving only a very thin (~3–5% of image size) uniform black margin on all sides. Never leave large empty black areas around a small specimen — if the original has the specimen small in the frame, you MUST crop and enlarge it. Keep the original aspect ratio of the image. Keep the specimen perfectly intact with its original colors, textures, sharpness, edges, and details — do not alter or recolor it. Return the edited image.",
  studio:
    "Isolate ONLY the mineral, fossil, or rock specimen and place it on a professional museum-style studio background: a smooth dark radial gradient that is slightly lighter neutral dark grey (#2a2a2a to #3a3a3a) behind and around the specimen, fading softly to near-black (#0a0a0a) at the edges and corners. The look should match high-end mineral collector photography (like Cabinet Nr. 40 / mindat showcase photos). CRITICAL: Completely remove EVERYTHING that is not the specimen — human hands, fingers, skin, gloves, tweezers, labels, paper, scale bars, tables, cloth, original background. FRAMING (MANDATORY — DO NOT IGNORE): The specimen MUST fill at least 92% of the shorter image dimension. Zoom in / scale the specimen UP until its longest edge nearly touches the image borders, leaving only a very thin (~3–5% of image size) uniform margin on all sides. Never leave large empty background areas around a small specimen — if the original has the specimen small in the frame, you MUST crop and enlarge it. Keep the original aspect ratio of the image. Keep the specimen perfectly intact with its original colors, textures, sharpness, edges and details — do not alter or recolor it. Add a very subtle soft shadow under the specimen for depth. Return the edited image.",
} as const;

async function runEdit(
  path: string,
  context: { userId: string; supabase: unknown },
  style: keyof typeof PROMPTS,
): Promise<{ ok: true }> {
  assertOwned(path, context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY nicht konfiguriert");

    const supabase = context.supabase as never as ReturnType<
      typeof import("@supabase/supabase-js").createClient
    >;

    // 1. Download current photo
    const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
    if (dlErr || !file) throw new Error("Foto konnte nicht geladen werden");

    // 2. Save backup if not present
    if (!(await backupExists(supabase, path))) {
      const { error: bErr } = await supabase.storage
        .from(BUCKET)
        .upload(originalPath(path), file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
      if (bErr && !/exists/i.test(bErr.message)) {
        throw new Error("Backup fehlgeschlagen: " + bErr.message);
      }
    }

    // 3. Call Gemini image edit
    const dataUrl = await blobToDataUrl(file);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPTS[style] },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Zu viele Anfragen, bitte später erneut versuchen.");
    if (res.status === 402) throw new Error("KI-Guthaben aufgebraucht.");
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`KI-Anfrage fehlgeschlagen (${res.status}) ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { images?: Array<{ image_url?: { url?: string } }>; content?: string };
      }>;
    };
    const imgUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imgUrl || !imgUrl.startsWith("data:")) {
      throw new Error("KI hat kein Bild zurückgegeben");
    }
    const { blob, contentType } = dataUrlToBlob(imgUrl);

    // 4. Upload over original path
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType, upsert: true });
    if (upErr) throw new Error("Upload fehlgeschlagen: " + upErr.message);

    return { ok: true };
}

export const restorePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { path?: unknown };
    if (!i || typeof i.path !== "string") throw new Error("Pfad fehlt");
    return { path: i.path };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    assertOwned(data.path, context.userId);
    const supabase = context.supabase as never as ReturnType<
      typeof import("@supabase/supabase-js").createClient
    >;

    const orig = originalPath(data.path);
    const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(orig);
    if (dlErr || !file) throw new Error("Kein Original-Backup vorhanden");

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(data.path, file, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
    if (upErr) throw new Error("Wiederherstellen fehlgeschlagen: " + upErr.message);

    await supabase.storage.from(BUCKET).remove([orig]);
    return { ok: true };
  });
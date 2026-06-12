import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "mineral-photos";

const EDIT_PROMPT =
  "Replace the entire background with solid pure black (#000000). Keep the main subject (mineral, fossil, crystal, or rock specimen) perfectly sharp, in focus, with all its natural color, texture and details unchanged. Clean cutout edges, no shadows, no gradient, no reflections, no text, no watermark. Museum studio display on pitch black backdrop. Square framing if possible.";

type GatewayResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; code?: string };
};

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

export const blackenPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { path: string }) => {
    if (!data || typeof data.path !== "string" || data.path.length < 3 || data.path.length > 512) {
      throw new Error("Ungültiger Foto-Pfad");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Owner check via path prefix
    if (!data.path.startsWith(`${userId}/`)) {
      throw new Error("Zugriff verweigert");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Bildbearbeitung ist nicht verfügbar (kein API-Key).");

    // 1. Download original
    const { data: blob, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(data.path);
    if (dlErr || !blob) throw new Error(`Foto nicht gefunden: ${dlErr?.message ?? ""}`);

    const inputBytes = new Uint8Array(await blob.arrayBuffer());
    const inputMime = blob.type || "image/jpeg";
    const dataUrl = `data:${inputMime};base64,${uint8ToBase64(inputBytes)}`;

    // 2. Call gateway (Gemini image edit, OpenRouter chat-completions shape)
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EDIT_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (res.status === 429) throw new Error("Zu viele Anfragen. Bitte kurz warten.");
    if (res.status === 402) throw new Error("KI-Guthaben aufgebraucht.");
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Bildbearbeitung fehlgeschlagen (${res.status}): ${txt.slice(0, 200)}`);
    }

    const payload = (await res.json()) as GatewayResponse;
    const b64 = payload.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(payload.error?.message ?? "Keine Bilddaten zurückerhalten.");
    }

    const outBytes = base64ToUint8(b64);

    // 3. Re-upload, overwriting the same path (PNG output from Gemini)
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(data.path, outBytes, {
        contentType: "image/png",
        upsert: true,
      });
    if (upErr) throw new Error(`Speichern fehlgeschlagen: ${upErr.message}`);

    return { ok: true };
  });
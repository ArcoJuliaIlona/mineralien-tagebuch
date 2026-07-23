import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Systematics = {
  crystal_system: string | null;
  strunz_class: string | null;
  streak: string | null;
  luster: string | null;
};

const CRYSTAL = [
  "Kubisch","Tetragonal","Hexagonal","Trigonal","Orthorhombisch","Monoklin","Triklin","Amorph",
];
const LUSTER = [
  "Glasglanz","Diamantglanz","Metallglanz","Perlmuttglanz","Seidenglanz","Fettglanz","Wachsglanz","Harzglanz","Matt",
];

export const fetchSystematics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { name?: unknown };
    if (!i || typeof i.name !== "string" || !i.name.trim()) {
      throw new Error("Mineralname fehlt");
    }
    return { name: i.name.trim() };
  })
  .handler(async ({ data }): Promise<Systematics> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY nicht konfiguriert");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Du bist ein Mineralogie-Experte. Antworte ausschließlich als kompaktes JSON-Objekt mit den Feldern crystal_system, strunz_class, streak, luster für das angefragte Mineral. " +
              `crystal_system muss exakt einer dieser Werte sein oder null: ${CRYSTAL.join(", ")}. ` +
              `luster muss exakt einer dieser Werte sein oder null: ${LUSTER.join(", ")}. ` +
              "strunz_class ist die Nickel-Strunz-Klassifikation (z. B. \"4.DA.05\") oder null. " +
              "streak ist die Strichfarbe kurz auf Deutsch (z. B. \"weiß\") oder null. " +
              "Wenn ein Wert nicht eindeutig bekannt ist, gib null. Keine Erklärung, kein Markdown, nur JSON.",
          },
          { role: "user", content: data.name },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Zu viele Anfragen, bitte später erneut versuchen.");
    if (res.status === 402) throw new Error("KI-Guthaben aufgebraucht. Bitte im Workspace aufladen.");
    if (!res.ok) throw new Error(`KI-Anfrage fehlgeschlagen (${res.status})`);

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]) as Record<string, unknown>; } catch { parsed = {}; }
      }
    }

    const str = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      if (!t || t === "-" || t.toLowerCase() === "null" || t.toLowerCase() === "unbekannt") return null;
      return t;
    };
    const oneOf = (v: unknown, list: string[]): string | null => {
      const t = str(v);
      if (!t) return null;
      const hit = list.find((x) => x.toLowerCase() === t.toLowerCase());
      return hit ?? null;
    };

    return {
      crystal_system: oneOf(parsed.crystal_system, CRYSTAL),
      strunz_class: str(parsed.strunz_class),
      streak: str(parsed.streak),
      luster: oneOf(parsed.luster, LUSTER),
    };
  });
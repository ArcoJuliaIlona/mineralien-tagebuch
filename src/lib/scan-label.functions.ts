import { createServerFn } from "@tanstack/react-start";

export type ScannedLabel = {
  mineral_name: string | null;
  chemical_formula: string | null;
  companion_minerals: string | null;
  location: string | null;
  hardness: string | null;
  collection_name: string | null;
  value: number | null;
  size: string | null;
};

export const scanLabel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = input as { imageDataUrl?: unknown };
    if (!i || typeof i.imageDataUrl !== "string" || !i.imageDataUrl.startsWith("data:image/")) {
      throw new Error("Bild fehlt oder ungültig");
    }
    if (i.imageDataUrl.length > 8_000_000) {
      throw new Error("Bild ist zu groß. Bitte kleineres Foto verwenden.");
    }
    return { imageDataUrl: i.imageDataUrl };
  })
  .handler(async ({ data }): Promise<{ result: ScannedLabel }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY nicht konfiguriert");

    const system =
      "Du bist ein Experte für Mineralien-, Fossilien- und Gesteinsetiketten (gedruckt oder handgeschrieben, deutsch/englisch). " +
      "Analysiere das Etikett auf dem Bild und extrahiere die Felder. " +
      "Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown, ohne Erklärung. " +
      "Schema: {\"mineral_name\": string|null, \"chemical_formula\": string|null, \"companion_minerals\": string|null, \"location\": string|null, \"hardness\": string|null, \"collection_name\": string|null, \"value\": number|null, \"size\": string|null}. " +
      "Regeln: " +
      "mineral_name = Hauptmineral/Fossil/Gestein (z. B. \"Bergkristall\"). " +
      "chemical_formula = chemische Summenformel in Klartext, Zahlen normal (z. B. SiO2, CaCO3, CuSO4*5H2O). " +
      "companion_minerals = kommagetrennte Begleitmineralien. " +
      "location = Fundort (Ort, Region, Land) so vollständig wie auf dem Etikett. " +
      "hardness = Mohshärte als Zahl oder Bereich (z. B. \"7\" oder \"6,5-7\"). " +
      "collection_name = Name der Sammlung, falls angegeben. " +
      "value = numerischer Wert in Euro ohne Währungssymbol. " +
      "size = Größe/Abmessungen als Freitext mit Einheit (z. B. \"5 × 3 × 2 cm\" oder \"7 cm\"). " +
      "Wenn ein Feld nicht erkennbar ist, setze null. Keine Felder erfinden.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: "Bitte das folgende Etikett auslesen und als JSON zurückgeben." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Zu viele Anfragen, bitte später erneut versuchen.");
    if (res.status === 402) throw new Error("KI-Guthaben aufgebraucht. Bitte im Workspace aufladen.");
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`KI-Anfrage fehlgeschlagen (${res.status}) ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Antwort der KI konnte nicht gelesen werden.");
    }

    const str = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      if (!t || t === "-" || t.toLowerCase() === "null") return null;
      return t;
    };
    const num = (v: unknown): number | null => {
      if (typeof v === "number" && isFinite(v)) return v;
      if (typeof v === "string") {
        const n = Number(v.replace(",", ".").replace(/[^0-9.\-]/g, ""));
        return isFinite(n) ? n : null;
      }
      return null;
    };

    return {
      result: {
        mineral_name: str(parsed.mineral_name),
        chemical_formula: str(parsed.chemical_formula),
        companion_minerals: str(parsed.companion_minerals),
        location: str(parsed.location),
        hardness: str(parsed.hardness),
        collection_name: str(parsed.collection_name),
        value: num(parsed.value),
        size: str(parsed.size),
      },
    };
  });
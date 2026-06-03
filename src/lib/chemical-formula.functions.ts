import { createServerFn } from "@tanstack/react-start";

export const fetchChemicalFormula = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = input as { name?: unknown };
    if (!i || typeof i.name !== "string" || !i.name.trim()) {
      throw new Error("Mineralname fehlt");
    }
    return { name: i.name.trim() };
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY nicht konfiguriert");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Du bist ein Mineralogie-Experte. Antworte ausschließlich mit der chemischen Summenformel des angefragten Minerals/Gesteins/Fossils im Klartext (z. B. SiO2, CaCO3, Fe2O3). Keine Erklärung, keine Einheiten, keine Tags. Wenn keine eindeutige Formel existiert, antworte mit einem einzelnen Bindestrich: -.",
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
    const cleaned = raw.replace(/^["'`*\s]+|["'`*\s]+$/g, "");
    if (!cleaned || cleaned === "-") return { formula: null as string | null };
    return { formula: cleaned };
  });
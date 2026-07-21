import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Upload, Trash2, CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/lib/auth-context";
import { parseFile, type ImportRow } from "@/lib/import-parse";
import { createMineral, CATEGORY_LABEL, type Category } from "@/lib/minerals";
import { toast } from "sonner";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Listen importieren – Mineralien-Tagebuch" },
      { name: "description", content: "Excel-, CSV- und Word-Listen in dein Mineralien-Tagebuch importieren." },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <ImportPage />
      </AppShell>
    </AuthGate>
  ),
});

function ImportPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const onPick = async (f: File | null) => {
    if (!f) return;
    try {
      const parsed = await parseFile(f);
      const filtered = parsed.filter((r) => r.mineral_name);
      if (filtered.length === 0) {
        toast.error("Keine gültigen Zeilen gefunden. Bitte Spaltenüberschriften prüfen.");
        return;
      }
      setRows(filtered);
      toast.success(`${filtered.length} Zeilen erkannt`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Einlesen");
    }
  };

  const update = (i: number, patch: Partial<ImportRow>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const doImport = async () => {
    if (!session?.user) return;
    setBusy(true);
    setProgress({ done: 0, total: rows.length });
    let ok = 0;
    for (const row of rows) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _row, ...input } = row;
        await createMineral(session.user.id, input);
        ok++;
      } catch (e) {
        console.error("Import row failed", row._row, e);
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setBusy(false);
    toast.success(`${ok} von ${rows.length} importiert`);
    setRows([]);
    navigate({ to: "/" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/export">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="font-serif text-3xl">Listen importieren</h1>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
        <p className="mb-2">
          Unterstützt: <strong>.xlsx</strong>, <strong>.csv</strong>, <strong>.docx</strong> (mit Tabelle).
        </p>
        <p>
          Spalten werden automatisch zugeordnet. Erkannte Überschriften (nicht case-sensitive):
          Kategorie, Nummer, Mineral/Fossil/Gestein, Formel, Härte, Begleitmineralien,
          Fundort, Land, Ursprung, Zeitalter, Größe, Besonderheiten, Wert, Sammlung,
          Etage, Schrank, Ebene, Radioaktiv.
        </p>
        <p className="mt-2">
          Für „Kategorie" verwende <em>Mineral</em>, <em>Fossil</em> oder <em>Gestein</em>.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.docx"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <Button
          variant="outline"
          onClick={() => {
            setRows([]);
            if (fileRef.current) fileRef.current.value = "";
          }}
          disabled={rows.length === 0}
        >
          Zurücksetzen
        </Button>
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rows.length} Zeilen bereit. Werte in der Vorschau editierbar.
            </p>
            <Button onClick={doImport} disabled={busy} className="gap-2">
              <CheckCircle2 className="size-4" />
              {busy ? `Importiere ${progress.done}/${progress.total}…` : `${rows.length} importieren`}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2">#</th>
                  <th className="p-2">Kategorie</th>
                  <th className="p-2">Nr.</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Formel</th>
                  <th className="p-2">Härte</th>
                  <th className="p-2">Fundort</th>
                  <th className="p-2">Land</th>
                  <th className="p-2">Wert</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="p-1 text-muted-foreground">{r._row}</td>
                    <td className="p-1">
                      <select
                        value={r.category}
                        onChange={(e) => update(i, { category: e.target.value as Category })}
                        className="w-24 rounded bg-background px-1 py-1"
                      >
                        <option value="mineral">{CATEGORY_LABEL.mineral}</option>
                        <option value="fossil">{CATEGORY_LABEL.fossil}</option>
                        <option value="rock">{CATEGORY_LABEL.rock}</option>
                      </select>
                    </td>
                    <td className="p-1">
                      <Cell v={r.custom_number ?? ""} onChange={(v) => update(i, { custom_number: v || null })} w="w-20" />
                    </td>
                    <td className="p-1">
                      <Cell v={r.mineral_name} onChange={(v) => update(i, { mineral_name: v })} w="w-40" />
                    </td>
                    <td className="p-1">
                      <Cell v={r.chemical_formula ?? ""} onChange={(v) => update(i, { chemical_formula: v || null })} w="w-28" />
                    </td>
                    <td className="p-1">
                      <Cell v={r.hardness ?? ""} onChange={(v) => update(i, { hardness: v || null })} w="w-16" />
                    </td>
                    <td className="p-1">
                      <Cell v={r.location ?? ""} onChange={(v) => update(i, { location: v || null })} w="w-40" />
                    </td>
                    <td className="p-1">
                      <Cell v={r.country ?? ""} onChange={(v) => update(i, { country: v || null })} w="w-28" />
                    </td>
                    <td className="p-1">
                      <Cell
                        v={r.value?.toString() ?? ""}
                        onChange={(v) => update(i, { value: v ? Number(v.replace(",", ".")) : null })}
                        w="w-16"
                      />
                    </td>
                    <td className="p-1">
                      <Button variant="ghost" size="icon" onClick={() => remove(i)} className="h-7 w-7">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-muted-foreground">
          <Upload className="mx-auto mb-2 size-8" />
          Wähle eine Excel-, CSV- oder Word-Datei aus.
        </div>
      )}
    </div>
  );
}

function Cell({ v, onChange, w }: { v: string; onChange: (v: string) => void; w: string }) {
  return (
    <input
      value={v}
      onChange={(e) => onChange(e.target.value)}
      className={`${w} rounded bg-background px-1 py-1`}
    />
  );
}
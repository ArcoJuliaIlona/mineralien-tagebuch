import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Database, FileDown, Hash, QrCode } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { exportJsonBackup, exportAllPdf } from "@/lib/export-data";
import { generateAllQrSheetPdf } from "@/lib/qr-pdf";
import {
  generateNumberSheetPdf,
  type NumberSelection,
  type NumberSelectionMode,
} from "@/lib/number-pdf";
import { CATEGORY_LABEL_PLURAL, type Category } from "@/lib/minerals";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/export")({
  head: () => ({ meta: [{ title: "Daten-Export" }] }),
  component: () => (
    <AuthGate>
      <AppShell>
        <ExportPage />
      </AppShell>
    </AuthGate>
  ),
});

type PdfSort = "category" | "collection" | "location" | "name";

const SORT_LABELS: Record<PdfSort, string> = {
  category: "Kategorie (Mineral / Fossil / Gestein)",
  collection: "Sammlung",
  location: "Fundort",
  name: "Name (Alphabetisch)",
};

const ALL_CATEGORIES = "__ALLE__";

function ExportPage() {
  const [busyJson, setBusyJson] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [busyQr, setBusyQr] = useState(false);
  const [busyNum, setBusyNum] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pdfSort, setPdfSort] = useState<PdfSort>("category");
  const [pdfCategory, setPdfCategory] = useState<string>(ALL_CATEGORIES);
  const [pdfFrom, setPdfFrom] = useState<string>("");
  const [pdfTo, setPdfTo] = useState<string>("");

  type NumMode = NumberSelectionMode;
  type NumState = { mode: NumMode; from: string; to: string; list: string };
  const initNum: NumState = { mode: "all", from: "", to: "", list: "" };
  const [numMineral, setNumMineral] = useState<NumState>(initNum);
  const [numFossil, setNumFossil] = useState<NumState>(initNum);
  const [numRock, setNumRock] = useState<NumState>(initNum);

  const toSelection = (s: NumState): NumberSelection => {
    if (s.mode === "range") {
      return {
        mode: "range",
        from: s.from.trim() === "" ? null : Number(s.from),
        to: s.to.trim() === "" ? null : Number(s.to),
      };
    }
    if (s.mode === "list") {
      const list = s.list
        .split(/[,\s]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0);
      return { mode: "list", list };
    }
    return { mode: s.mode };
  };

  const onJson = async () => {
    setBusyJson(true);
    try {
      const n = await exportJsonBackup();
      toast.success(`Backup mit ${n} Einträgen gespeichert`);
    } catch {
      toast.error("Backup fehlgeschlagen");
    } finally {
      setBusyJson(false);
    }
  };

  const onQrSheet = async () => {
    setBusyQr(true);
    try {
      const n = await generateAllQrSheetPdf();
      toast.success(`QR-Bogen mit ${n} Codes erstellt`);
    } catch {
      toast.error("QR-Bogen fehlgeschlagen");
    } finally {
      setBusyQr(false);
    }
  };

  const onNumberSheet = async () => {
    setBusyNum(true);
    try {
      const n = await generateNumberSheetPdf({
        mineral: toSelection(numMineral),
        fossil: toSelection(numFossil),
        rock: toSelection(numRock),
      });
      if (n === 0) {
        toast.error("Keine Nummern in Auswahl");
        return;
      }
      toast.success(`Nummern-Bogen für ${n} Funde erstellt`);
    } catch {
      toast.error("Nummern-Bogen fehlgeschlagen");
    } finally {
      setBusyNum(false);
    }
  };

  const onPdf = async () => {
    setBusyPdf(true);
    setProgress({ done: 0, total: 0 });
    try {
      const cat: Category | undefined =
        pdfCategory === ALL_CATEGORIES ? undefined : (pdfCategory as Category);
      const fromN = pdfFrom.trim() === "" ? null : Number(pdfFrom);
      const toN = pdfTo.trim() === "" ? null : Number(pdfTo);
      const n = await exportAllPdf(
        pdfSort,
        cat,
        (done, total) => setProgress({ done, total }),
        {
          from: Number.isFinite(fromN as number) ? (fromN as number) : null,
          to: Number.isFinite(toN as number) ? (toN as number) : null,
        },
      );
      toast.success(`PDF mit ${n} Einträgen erstellt`);
    } catch {
      toast.error("PDF-Export fehlgeschlagen");
    } finally {
      setBusyPdf(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zur Liste
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daten-Export</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sichere deine Sammlung als Backup-Datei oder als gedrucktes PDF.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <Database className="mt-1 size-6 shrink-0 text-primary" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Backup (JSON)</h2>
            <p className="text-sm text-muted-foreground">
              Vollständige Daten als JSON-Datei zur sicheren Aufbewahrung. Fotos sind als
              Referenzen enthalten.
            </p>
          </div>
        </div>
        <Button onClick={onJson} disabled={busyJson} size="lg" className="h-14 w-full gap-2 text-base">
          <FileDown className="size-5" />
          {busyJson ? "Erstelle Backup…" : "Backup herunterladen"}
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <FileDown className="mt-1 size-6 shrink-0 text-primary" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Gesamt-PDF</h2>
            <p className="text-sm text-muted-foreground">
              Alle Einträge mit Foto und Details in einem PDF-Dokument, inklusive Übersicht.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Select value={pdfCategory} onValueChange={(v) => setPdfCategory(v)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>Alle Kategorien</SelectItem>
              <SelectItem value="mineral">{CATEGORY_LABEL_PLURAL.mineral}</SelectItem>
              <SelectItem value="fossil">{CATEGORY_LABEL_PLURAL.fossil}</SelectItem>
              <SelectItem value="rock">{CATEGORY_LABEL_PLURAL.rock}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pdfSort} onValueChange={(v) => setPdfSort(v as PdfSort)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Sortierung wählen" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as PdfSort[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">Sammlungsnummer (optional)</p>
            <p className="text-xs text-muted-foreground">
              Nur Einträge mit Nummer von – bis. Leer lassen für alle. Die Kategorie-Auswahl oben
              entscheidet, ob nur Mineralien, Fossilien oder Gesteine gefiltert werden.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="pdf-from" className="text-xs">Von</Label>
                <Input
                  id="pdf-from"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="z. B. 1"
                  value={pdfFrom}
                  onChange={(e) => setPdfFrom(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pdf-to" className="text-xs">Bis</Label>
                <Input
                  id="pdf-to"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="z. B. 50"
                  value={pdfTo}
                  onChange={(e) => setPdfTo(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </div>
          </div>
          <Button onClick={onPdf} disabled={busyPdf} size="lg" className="h-14 w-full gap-2 text-base">
            <FileDown className="size-5" />
            {busyPdf
              ? progress && progress.total
                ? `Erstelle PDF… (${progress.done}/${progress.total})`
                : "Erstelle PDF…"
              : "PDF herunterladen"}
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <QrCode className="mt-1 size-6 shrink-0 text-primary" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">QR-Code-Bogen</h2>
            <p className="text-sm text-muted-foreground">
              Druckbarer A4-Bogen mit 5 × 5 mm QR-Codes für alle Funde — ideal zum Aufkleben am Stein.
            </p>
          </div>
        </div>
        <Button onClick={onQrSheet} disabled={busyQr} size="lg" className="h-14 w-full gap-2 text-base">
          <QrCode className="size-5" />
          {busyQr ? "Erstelle Bogen…" : "QR-Bogen herunterladen"}
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <Hash className="mt-1 size-6 shrink-0 text-primary" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Nummern-Bogen</h2>
            <p className="text-sm text-muted-foreground">
              Sehr kompakter A4-Bogen (~8 × 5 mm) mit nur der Sammlungsnummer — jede Nummer 3× zum
              Ausschneiden. Klassische Museumsmethode: kleiner Lackpunkt auf den Stein, Etikett
              draufkleben, mit Klarlack versiegeln.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {(
            [
              { cat: "mineral" as Category, state: numMineral, set: setNumMineral },
              { cat: "fossil" as Category, state: numFossil, set: setNumFossil },
              { cat: "rock" as Category, state: numRock, set: setNumRock },
            ]
          ).map(({ cat, state, set }) => (
            <div key={cat} className="rounded-lg border bg-background p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">{CATEGORY_LABEL_PLURAL[cat]}</Label>
                <Select
                  value={state.mode}
                  onValueChange={(v) => set({ ...state, mode: v as NumMode })}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="range">Von – Bis</SelectItem>
                    <SelectItem value="list">Einzelne</SelectItem>
                    <SelectItem value="none">Keine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {state.mode === "range" && (
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    placeholder="von"
                    value={state.from}
                    onChange={(e) => set({ ...state, from: e.target.value })}
                  />
                  <Input
                    inputMode="numeric"
                    placeholder="bis"
                    value={state.to}
                    onChange={(e) => set({ ...state, to: e.target.value })}
                  />
                </div>
              )}
              {state.mode === "list" && (
                <Input
                  placeholder="z. B. 1, 3, 7, 12"
                  value={state.list}
                  onChange={(e) => set({ ...state, list: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        <Button onClick={onNumberSheet} disabled={busyNum} size="lg" className="h-14 w-full gap-2 text-base">
          <Hash className="size-5" />
          {busyNum ? "Erstelle Bogen…" : "Nummern-Bogen herunterladen"}
        </Button>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Database, FileDown, Hash, QrCode } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { exportJsonBackup, exportAllPdf } from "@/lib/export-data";
import { generateAllQrSheetPdf } from "@/lib/qr-pdf";
import { generateNumberSheetPdf } from "@/lib/number-pdf";
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

function ExportPage() {
  const [busyJson, setBusyJson] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [busyQr, setBusyQr] = useState(false);
  const [busyNum, setBusyNum] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pdfSort, setPdfSort] = useState<PdfSort>("category");

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
      const n = await generateNumberSheetPdf();
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
      const n = await exportAllPdf(pdfSort, (done, total) => setProgress({ done, total }));
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
        <Button onClick={onNumberSheet} disabled={busyNum} size="lg" className="h-14 w-full gap-2 text-base">
          <Hash className="size-5" />
          {busyNum ? "Erstelle Bogen…" : "Nummern-Bogen herunterladen"}
        </Button>
      </div>
    </div>
  );
}

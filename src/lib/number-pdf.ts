import jsPDF from "jspdf";
import { listMinerals, formatCollectionNumber, type Category } from "./minerals";

export type NumberSelectionMode = "all" | "range" | "list" | "none";

export type NumberSelection = {
  mode: NumberSelectionMode;
  from?: number | null;
  to?: number | null;
  list?: number[]; // einzelne Nummern
};

export type NumberSheetOptions = Partial<Record<Category, NumberSelection>>;

function selectionMatches(n: number, sel: NumberSelection | undefined): boolean {
  if (!sel || sel.mode === "none") return false;
  if (sel.mode === "all") return true;
  if (sel.mode === "range") {
    const from = sel.from ?? -Infinity;
    const to = sel.to ?? Infinity;
    return n >= from && n <= to;
  }
  if (sel.mode === "list") return (sel.list ?? []).includes(n);
  return false;
}

// Kompakter A4-Bogen mit ausschließlich der Sammlungsnummer.
// Sehr klein (~8 × 5 mm Etiketten), gedacht zum Ausschneiden und mit
// Klarlack auf den Stein zu kleben – die klassische Museumsmethode.
export async function generateNumberSheetPdf(options?: NumberSheetOptions) {
  const allMinerals = await listMinerals();
  const defaults: NumberSheetOptions = {
    mineral: { mode: "all" },
    fossil: { mode: "all" },
    rock: { mode: "all" },
  };
  const opts: NumberSheetOptions = options ?? defaults;
  const minerals = allMinerals.filter((m) =>
    selectionMatches(m.collection_number, opts[m.category]),
  );
  if (minerals.length === 0) return 0;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Etikettenmaße
  const cellW = 14; // mm Spaltenbreite (inkl. Abstand)
  const cellH = 7; // mm Zeilenhöhe (inkl. Abstand)
  const marginX = 8;
  const marginY = 12;
  const cols = Math.floor((W - 2 * marginX) / cellW);
  const rows = Math.floor((H - 2 * marginY) / cellH);
  const perPage = cols * rows;

  const sorted = [...minerals].sort(
    (a, b) => a.category.localeCompare(b.category) || a.collection_number - b.collection_number,
  );

  // Jede Nummer 3× drucken (eine fürs Stück, eine als Reserve, eine fürs Schächtelchen)
  const COPIES = 3;
  const entries: string[] = [];
  for (const m of sorted) {
    const label = formatCollectionNumber(m.collection_number, m.category);
    for (let c = 0; c < COPIES; c++) entries.push(label);
  }

  for (let i = 0; i < entries.length; i++) {
    const onPage = i % perPage;
    if (i > 0 && onPage === 0) doc.addPage();

    if (onPage === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(12, 36, 64);
      doc.text("Sammlung Arco Böhme · Nummern-Etiketten", marginX, 8);
    }

    const col = onPage % cols;
    const row = Math.floor(onPage / cols);
    const x = marginX + col * cellW;
    const y = marginY + row * cellH;

    // dezenter Schneidrahmen
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.rect(x, y, cellW - 1, cellH - 1);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(entries[i], x + (cellW - 1) / 2, y + (cellH - 1) / 2 + 1.4, { align: "center" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`Nummern-Bogen-${stamp}.pdf`);
  return sorted.length;
}
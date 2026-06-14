import type { Mineral, Category } from "./minerals";
import { CATEGORY_LABEL, CATEGORY_LABEL_PLURAL, formatCollectionNumber } from "./minerals";
import { listMinerals } from "./minerals";
import { fetchPhotoDataUrl } from "./photos";
import jsPDF from "jspdf";

export async function exportJsonBackup() {
  const minerals = await listMinerals();
  const payload = {
    exported_at: new Date().toISOString(),
    version: 1,
    count: minerals.length,
    minerals,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Sammlung-Backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return minerals.length;
}

type FToken = { type: "text" | "sub" | "sup"; value: string };
function tokenizeFormula(input: string): FToken[] {
  const tokens: FToken[] = [];
  let buf = "";
  const flush = () => {
    if (buf) {
      tokens.push({ type: "text", value: buf });
      buf = "";
    }
  };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const prev = input[i - 1];
    if (c === "*") {
      flush();
      tokens.push({ type: "text", value: " · " });
      continue;
    }
    if (c === "^") {
      flush();
      let j = i + 1;
      let sup = "";
      while (j < input.length && /[0-9+\-]/.test(input[j])) {
        sup += input[j];
        j++;
      }
      if (sup) tokens.push({ type: "sup", value: sup });
      i = j - 1;
      continue;
    }
    if (/[0-9]/.test(c) && prev && /[A-Za-z\)\]]/.test(prev)) {
      flush();
      let j = i;
      let sub = "";
      while (j < input.length && /[0-9.]/.test(input[j])) {
        sub += input[j];
        j++;
      }
      tokens.push({ type: "sub", value: sub });
      i = j - 1;
      continue;
    }
    buf += c;
  }
  flush();
  return tokens;
}

function drawFormula(
  doc: jsPDF,
  formula: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
): number {
  const tokens = tokenizeFormula(formula);
  const lineHeight = fontSize * 0.5;
  const subSize = fontSize * 0.7;
  const subDy = fontSize * 0.18;
  const supDy = -fontSize * 0.25;
  let cursorX = x;
  let cursorY = y;
  doc.setFont("helvetica", "normal");
  for (const t of tokens) {
    const size = t.type === "text" ? fontSize : subSize;
    doc.setFontSize(size);
    const w = doc.getTextWidth(t.value);
    if (cursorX + w > x + maxWidth && cursorX > x) {
      cursorY += lineHeight;
      cursorX = x;
    }
    const drawY =
      t.type === "sub" ? cursorY + subDy : t.type === "sup" ? cursorY + supDy : cursorY;
    doc.text(t.value, cursorX, drawY);
    cursorX += w;
  }
  doc.setFontSize(fontSize);
  return cursorY;
}

export async function exportAllPdf(
  sortBy: "category" | "collection" | "location" | "name" = "category",
  onProgress?: (done: number, total: number) => void,
) {
  const minerals = await listMinerals();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Deckblatt
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(12, 36, 64);
  doc.text("Sammlung Arco Böhme", W / 2, 40, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(18, 52, 80);
  doc.text(
    `Vollständiger Export · ${new Date().toLocaleDateString("de-DE")}`,
    W / 2,
    50,
    { align: "center" },
  );
  doc.text(`${minerals.length} Einträge`, W / 2, 58, { align: "center" });

  // Übersichtstabelle
  let y = 75;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(12, 36, 64);
  doc.text("Übersicht", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.text("Nr.", margin, y);
  doc.text("Name", margin + 14, y);
  doc.text("Kategorie", margin + 70, y);
  doc.text("Fundort", margin + 100, y);
  y += 2;
  doc.setDrawColor(160, 180, 200);
  doc.line(margin, y, W - margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");

  const collator = new Intl.Collator("de-DE", { sensitivity: "base" });
  const sorted = [...minerals].sort((a, b) => {
    switch (sortBy) {
      case "collection":
        return (
          collator.compare(a.collection_name || "", b.collection_name || "") ||
          a.category.localeCompare(b.category) ||
          a.collection_number - b.collection_number
        );
      case "location":
        return (
          collator.compare(a.location || "", b.location || "") ||
          a.category.localeCompare(b.category) ||
          a.collection_number - b.collection_number
        );
      case "name":
        return (
          collator.compare(a.mineral_name || "", b.mineral_name || "") ||
          a.category.localeCompare(b.category) ||
          a.collection_number - b.collection_number
        );
      case "category":
      default:
        return (
          a.category.localeCompare(b.category) ||
          a.collection_number - b.collection_number
        );
    }
  });
  for (const m of sorted) {
    if (y > H - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(formatCollectionNumber(m.collection_number, m.category), margin, y);
    doc.text(doc.splitTextToSize(m.mineral_name, 52)[0] ?? "", margin + 14, y);
    doc.text(CATEGORY_LABEL[m.category], margin + 70, y);
    doc.text(doc.splitTextToSize(m.location ?? "—", 80)[0] ?? "", margin + 100, y);
    y += 5;
  }

  // Detailseiten
  let i = 0;
  for (const m of sorted) {
    doc.addPage();
    let py = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(12, 36, 64);
    doc.text(m.mineral_name, margin, py);
    py += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(26, 74, 110);
    doc.text(
      `${CATEGORY_LABEL[m.category]} · Nr. ${formatCollectionNumber(m.collection_number, m.category)}`,
      margin,
      py,
    );
    py += 7;

    // Foto
    if (m.photo_paths.length > 0) {
      try {
        const dataUrl = await fetchPhotoDataUrl(m.photo_paths[0]);
        const size = 60;
        doc.addImage(dataUrl, "JPEG", margin, py, size, size, undefined, "FAST");
        py += size + 5;
      } catch {
        /* skip */
      }
    }

    doc.setTextColor(18, 40, 60);
    doc.setFontSize(10);
    const rows: Array<[string, string | null]> = [
      ["Begleitmineralien", m.companion_minerals],
      ["Fundort", m.location],
      ["Sammlung", m.collection_name],
      [
        "Wert",
        m.value != null
          ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(m.value)
          : null,
      ],
      [
        "GPS",
        m.latitude != null && m.longitude != null
          ? `${m.latitude.toFixed(5)}, ${m.longitude.toFixed(5)}`
          : null,
      ],
    ];
    for (const [label, val] of rows) {
      if (!val) continue;
      if (py > H - margin - 10) {
        doc.addPage();
        py = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, margin, py);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(val, W - margin * 2 - 30);
      doc.text(wrapped, margin + 32, py);
      py += Math.max(5, wrapped.length * 5) + 1;
    }

    if (m.chemical_formula) {
      if (py > H - margin - 14) {
        doc.addPage();
        py = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.text("Formel:", margin, py);
      drawFormula(doc, m.chemical_formula, margin + 32, py, W - margin * 2 - 30, 10);
      py += 7;
    }

    i++;
    onProgress?.(i, sorted.length);
  }

  // Seitenzahlen
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(130, 150, 170);
    doc.text(`Seite ${p} / ${pageCount}`, W - margin, H - 6, { align: "right" });
    doc.text("Sammlung Arco Böhme", margin, H - 6);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`Sammlung-Gesamt-${stamp}.pdf`);
  return minerals.length;
}
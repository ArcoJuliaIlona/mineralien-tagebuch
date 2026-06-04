import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { Mineral } from "./minerals";
import { listMinerals } from "./minerals";

function fundUrl(id: string) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://mineralien-tagebuch.lovable.app";
  return `${origin}/fund/${id}`;
}

async function qrDataUrl(text: string): Promise<string> {
  // hohe Auflösung, damit das 5×5 mm Druckbild scharf bleibt
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: "L",
    margin: 0,
    width: 600,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

// Einzelnes 5×5 mm QR-Etikett (mittig auf A8) zum Aufkleben am Stein
export async function generateSingleQrPdf(m: Mineral) {
  const url = fundUrl(m.id);
  const data = await qrDataUrl(url);
  // A8 = 52 × 74 mm — klein und passt in jeden Drucker
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [30, 30] });
  const W = doc.internal.pageSize.getWidth();
  const size = 5; // mm
  const x = (W - size) / 2;
  const y = 5;
  doc.addImage(data, "PNG", x, y, size, size, undefined, "NONE");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(12, 36, 64);
  doc.text(`Nr. ${m.collection_number}`, W / 2, y + size + 3, { align: "center" });
  doc.text(m.mineral_name.slice(0, 22), W / 2, y + size + 6, { align: "center" });
  doc.save(`QR-${m.collection_number}-${m.mineral_name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}

// Bogen mit allen QR-Codes (5×5 mm) auf A4, je mit Sammlungsnummer.
export async function generateAllQrSheetPdf() {
  const minerals = await listMinerals();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const qrSize = 5; // mm — wie gewünscht
  const labelH = 3; // mm Beschriftung darunter
  const cellW = 18; // Spaltenabstand
  const cellH = qrSize + labelH + 4;
  const marginX = 10;
  const marginY = 12;
  const cols = Math.floor((W - 2 * marginX) / cellW);
  const rows = Math.floor((H - 2 * marginY) / cellH);
  const perPage = cols * rows;

  const sorted = [...minerals].sort(
    (a, b) => a.category.localeCompare(b.category) || a.collection_number - b.collection_number,
  );

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const onPage = i % perPage;
    if (i > 0 && onPage === 0) doc.addPage();

    if (onPage === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(12, 36, 64);
      doc.text("Sammlung Arco Böhme · QR-Codes (5×5 mm)", marginX, 8);
    }

    const col = onPage % cols;
    const row = Math.floor(onPage / cols);
    const x = marginX + col * cellW;
    const y = marginY + row * cellH;

    const data = await qrDataUrl(fundUrl(m.id));
    doc.addImage(data, "PNG", x + (cellW - qrSize) / 2, y, qrSize, qrSize, undefined, "NONE");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(18, 40, 60);
    doc.text(`Nr. ${m.collection_number}`, x + cellW / 2, y + qrSize + 1.8, { align: "center" });
    doc.text(m.mineral_name.slice(0, 14), x + cellW / 2, y + qrSize + 3.4, { align: "center" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`QR-Bogen-${stamp}.pdf`);
  return sorted.length;
}
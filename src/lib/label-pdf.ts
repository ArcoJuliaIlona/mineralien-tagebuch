import jsPDF from "jspdf";
import type { Mineral } from "./minerals";
import { fetchPhotoDataUrl } from "./photos";

export async function generateLabelPdf(m: Mineral) {
  // A6 landscape ~ 148 x 105 mm — schöne Etikettengröße
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a6" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Rahmen
  doc.setDrawColor(120, 80, 50);
  doc.setLineWidth(0.6);
  doc.rect(4, 4, W - 8, H - 8);

  // Foto links
  const photoSize = 55;
  const photoX = 8;
  const photoY = 8;
  if (m.photo_paths.length > 0) {
    try {
      const dataUrl = await fetchPhotoDataUrl(m.photo_paths[0]);
      doc.addImage(dataUrl, "JPEG", photoX, photoY, photoSize, photoSize, undefined, "FAST");
    } catch {
      doc.setFillColor(240, 235, 225);
      doc.rect(photoX, photoY, photoSize, photoSize, "F");
    }
  }

  // Text rechts
  const textX = m.photo_paths.length > 0 ? photoX + photoSize + 6 : 10;
  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(60, 35, 20);
  doc.text(m.mineral_name, textX, y);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 30, 20);

  const lines: Array<[string, string | null]> = [
    ["Begleitmineralien:", m.companion_minerals],
    ["Fundort:", m.location],
    ["Sammlung:", m.collection_name],
    [
      "GPS:",
      m.latitude != null && m.longitude != null
        ? `${m.latitude.toFixed(5)}, ${m.longitude.toFixed(5)}`
        : null,
    ],
  ];

  for (const [label, val] of lines) {
    if (!val) continue;
    doc.setFont("helvetica", "bold");
    doc.text(label, textX, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(val, W - textX - 8);
    doc.text(wrapped, textX, y + 4.5);
    y += 4.5 + wrapped.length * 4.5 + 2;
  }

  doc.save(`Etikett-${m.mineral_name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}
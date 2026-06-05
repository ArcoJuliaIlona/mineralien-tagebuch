import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { Mineral } from "./minerals";
import { CATEGORY_LABEL, formatCollectionNumber } from "./minerals";
import { fetchPhotoDataUrl } from "./photos";

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

// Zeichnet eine chemische Formel mit echten tief-/hochgestellten Ziffern.
// Bricht bei Bedarf an Token-Grenzen um. Gibt das Y nach der letzten Zeile zurück.
function drawFormula(
  doc: jsPDF,
  formula: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
): number {
  const tokens = tokenizeFormula(formula);
  const lineHeight = fontSize * 0.5; // grob mm bei pt -> mm
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
    doc.setFontSize(size);
    doc.text(t.value, cursorX, drawY);
    cursorX += w;
  }
  doc.setFontSize(fontSize);
  return cursorY;
}

export async function generateLabelPdf(m: Mineral) {
  // A6 landscape ~ 148 x 105 mm — schöne Etikettengröße
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a6" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Rahmen
  doc.setDrawColor(26, 74, 110);
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
      doc.setFillColor(232, 240, 248);
      doc.rect(photoX, photoY, photoSize, photoSize, "F");
    }
  }

  // Text rechts
  const textX = m.photo_paths.length > 0 ? photoX + photoSize + 6 : 10;
  let y = 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(12, 36, 64);
  doc.text(m.mineral_name, textX, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(26, 74, 110);
  doc.text(
    `${CATEGORY_LABEL[m.category]} · Nr. ${formatCollectionNumber(m.collection_number, m.category)}`,
    textX,
    y,
  );
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(18, 40, 60);

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

  // Formel separat mit echten tiefgestellten Ziffern rendern
  if (m.chemical_formula) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Formel:", textX, y);
    const endY = drawFormula(doc, m.chemical_formula, textX, y + 4.5, W - textX - 8, 10);
    y = endY + 6.5;
  }

  // Sammlungsname unten links
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(26, 74, 110);
  doc.text("Sammlung Arco Böhme", 8, H - 7);

  // QR-Code unten rechts
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://mineralien-tagebuch.lovable.app";
    const qr = await QRCode.toDataURL(`${origin}/fund/${m.id}`, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 600,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const qrSize = 18;
    const qrX = W - qrSize - 8;
    const qrY = H - qrSize - 10;
    doc.addImage(qr, "PNG", qrX, qrY, qrSize, qrSize, undefined, "NONE");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(26, 74, 110);
    doc.text("Scan für Details", qrX + qrSize / 2, H - 7, { align: "center" });
  } catch {
    /* QR optional */
  }

  doc.save(`Etikett-${m.mineral_name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}
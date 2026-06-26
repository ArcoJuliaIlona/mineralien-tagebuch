import jsPDF from "jspdf";
import type { Mineral } from "./minerals";
import { formatCollectionNumber } from "./minerals";
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
      while (j < input.length && /[0-9+-]/.test(input[j])) {
        sup += input[j];
        j++;
      }
      if (sup) tokens.push({ type: "sup", value: sup });
      i = j - 1;
      continue;
    }
    if (/[0-9]/.test(c) && prev && /[A-Za-z)\]]/.test(prev)) {
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

  doc.setFont("times", "normal");

  for (const t of tokens) {
    const size = t.type === "text" ? fontSize : subSize;
    doc.setFontSize(size);
    const w = doc.getTextWidth(t.value);
    if (cursorX + w > x + maxWidth && cursorX > x) {
      cursorY += lineHeight;
      cursorX = x;
    }
    const drawY = t.type === "sub" ? cursorY + subDy : t.type === "sup" ? cursorY + supDy : cursorY;
    doc.setFontSize(size);
    doc.text(t.value, cursorX, drawY);
    cursorX += w;
  }
  doc.setFontSize(fontSize);
  return cursorY;
}

// Zeichnet einen dekorativen Rahmen im Stil des Fotos (blaue Fächer/Dreiecke).
function drawDecorativeBorder(doc: jsPDF, W: number, H: number) {
  const margin = 4;
  const inset = 7;
  const blue = { r: 42, g: 78, b: 112 };
  const blueLight = { r: 110, g: 145, b: 175 };

  // Cremefarbener Hintergrund
  doc.setFillColor(245, 232, 210);
  doc.rect(0, 0, W, H, "F");

  // Äußerer dünner Rahmen
  doc.setDrawColor(blue.r, blue.g, blue.b);
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, W - 2 * margin, H - 2 * margin);

  // Innerer Rahmen
  doc.setLineWidth(0.3);
  doc.rect(inset, inset, W - 2 * inset, H - 2 * inset);

  // Dekorative Dreiecke/Fächer entlang der Kanten
  const triSize = 2.2;
  const step = 3.2;
  const x0 = inset + 0.5;
  const x1 = W - inset - 0.5;
  const y0 = inset + 0.5;
  const y1 = H - inset - 0.5;

  doc.setFillColor(blue.r, blue.g, blue.b);

  // Oben & Unten
  for (let x = x0 + step / 2; x < x1 - 1; x += step) {
    // oben (Spitze nach unten)
    doc.triangle(x - triSize / 2, y0, x + triSize / 2, y0, x, y0 + triSize, "F");
    // unten (Spitze nach oben)
    doc.triangle(x - triSize / 2, y1, x + triSize / 2, y1, x, y1 - triSize, "F");
  }
  // Links & Rechts
  for (let y = y0 + step / 2; y < y1 - 1; y += step) {
    doc.triangle(x0, y - triSize / 2, x0, y + triSize / 2, x0 + triSize, y, "F");
    doc.triangle(x1, y - triSize / 2, x1, y + triSize / 2, x1 - triSize, y, "F");
  }

  // Eckornamente (kleine Fächer)
  const corners: Array<[number, number]> = [
    [inset + 4, inset + 4],
    [W - inset - 4, inset + 4],
    [inset + 4, H - inset - 4],
    [W - inset - 4, H - inset - 4],
  ];
  doc.setFillColor(blueLight.r, blueLight.g, blueLight.b);
  for (const [cx, cy] of corners) {
    doc.circle(cx, cy, 1.4, "F");
    doc.setDrawColor(blue.r, blue.g, blue.b);
    doc.setLineWidth(0.3);
    doc.circle(cx, cy, 1.4, "S");
  }

  // Innenfeld (helleres Cremerechteck wie auf dem Foto)
  doc.setFillColor(250, 240, 222);
  doc.rect(inset + 3, inset + 3, W - 2 * (inset + 3), H - 2 * (inset + 3), "F");
}

function convertPhotoToPdfJpeg(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
      const sx = ((img.naturalWidth || img.width) - size) / 2;
      const sy = ((img.naturalHeight || img.height) - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Foto konnte nicht vorbereitet werden."));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("Foto konnte nicht geladen werden."));
    img.src = dataUrl;
  });
}

export async function generateLabelPdf(m: Mineral) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a6" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  drawDecorativeBorder(doc, W, H);

  const ink: [number, number, number] = [30, 25, 20];

  // Foto oben rechts (falls vorhanden)
  // Foto oben links (falls vorhanden)
  let photoLeftEdge = 0;
  const photoSize = 36;
  const photoX = 14;
  const photoY = 14;
  if (m.photo_paths.length > 0) {
    try {
      const dataUrl = await fetchPhotoDataUrl(m.photo_paths[0]);
      const pdfPhoto = await convertPhotoToPdfJpeg(dataUrl);
      // Heller Hintergrund + dünner blauer Rahmen
      doc.setFillColor(255, 255, 255);
      doc.rect(photoX - 0.8, photoY - 0.8, photoSize + 1.6, photoSize + 1.6, "F");
      doc.addImage(pdfPhoto, "JPEG", photoX, photoY, photoSize, photoSize);
      doc.setDrawColor(42, 78, 112);
      doc.setLineWidth(0.4);
      doc.rect(photoX - 0.8, photoY - 0.8, photoSize + 1.6, photoSize + 1.6);
      photoLeftEdge = photoX + photoSize + 3;
    } catch {
      /* Foto optional */
    }
  }

  const hasPhoto = photoLeftEdge > 0;
  const fullLeft = 16;
  const fullRight = W - 16;
  const fullWidth = fullRight - fullLeft;

  // Rechts neben dem Foto: Begleitmineralien zuerst, danach weitere Daten bündig darunter
  const rightLeft = hasPhoto ? photoLeftEdge : fullLeft;
  const rightWidth = fullRight - rightLeft;
  let ry = photoY + 2;
  const lineGap = 5.5;

  doc.setTextColor(...ink);

  const writeRightLine = (label: string, value: string) => {
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(`${label}:`, rightLeft, ry);
    const labelW = doc.getTextWidth(`${label}: `);
    doc.setFont("times", "normal");
    const wrapped = doc.splitTextToSize(value, rightWidth - labelW);
    doc.text(wrapped, rightLeft + labelW, ry);
    ry += Math.max(lineGap, wrapped.length * lineGap);
  };

  if (m.companion_minerals) writeRightLine("Begleitmin.", m.companion_minerals);

  if (m.category === "mineral" && m.chemical_formula) {
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text("Formel:", rightLeft, ry);
    const labelW = doc.getTextWidth("Formel: ");
    drawFormula(doc, m.chemical_formula, rightLeft + labelW, ry, rightWidth - labelW, 11);
    ry += lineGap;
  }
  if (m.category === "mineral" && m.hardness) writeRightLine("Härte", String(m.hardness));
  if (m.category === "rock" && m.origin) writeRightLine("Ursprung", m.origin);
  if (m.notable) writeRightLine("Besonders", m.notable);
  if (m.country) writeRightLine("Land", m.country);
  if (m.location) writeRightLine("Fundort", m.location);

  // Unter Foto / rechtem Block: Nummer und Name linksbündig
  let y = Math.max(photoY + photoSize + 6, ry + 4);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text(formatCollectionNumber(m.collection_number, m.category), fullLeft, y);
  y += 7;
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text(m.mineral_name, fullLeft, y, { maxWidth: fullWidth });

  // Coll: Arco Boehme – unten mittig
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text("Coll: Arco Boehme", W / 2, H - 11, { align: "center" });

  doc.save(`Etikett-${m.mineral_name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}

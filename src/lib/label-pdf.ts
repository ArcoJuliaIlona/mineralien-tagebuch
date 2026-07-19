import jsPDF from "jspdf";
import type { Mineral } from "./minerals";
import { formatCollectionNumber } from "./minerals";
import { fetchPhotoDataUrl } from "./photos";

type FToken = { type: "text" | "sub" | "sup"; value: string };
type Box = { x: number; y: number; W: number; H: number };

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
  const lineHeight = fontSize * 0.5;
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

// Zeichnet einen dekorativen Rahmen im Stil des Fotos (blaue Fächer/Dreiecke),
// skaliert an die Etikettengröße.
function drawDecorativeBorder(doc: jsPDF, box: Box) {
  const { x, y, W, H } = box;
  const minDim = Math.min(W, H);
  const margin = 1.2;
  const inset = 2.2;
  const triSize = 1.1;
  const step = 2.6;
  const blue = { r: 42, g: 78, b: 112 };
  const blueLight = { r: 110, g: 145, b: 175 };

  // Cremefarbener Hintergrund
  doc.setFillColor(245, 232, 210);
  doc.rect(x, y, W, H, "F");

  // Äußerer dünner Rahmen
  doc.setDrawColor(blue.r, blue.g, blue.b);
  doc.setLineWidth(0.5);
  doc.rect(x + margin, y + margin, W - 2 * margin, H - 2 * margin);

  // Innerer Rahmen
  doc.setLineWidth(0.3);
  doc.rect(x + inset, y + inset, W - 2 * inset, H - 2 * inset);

  const x0 = x + inset + 0.5;
  const x1 = x + W - inset - 0.5;
  const y0 = y + inset + 0.5;
  const y1 = y + H - inset - 0.5;

  doc.setFillColor(blue.r, blue.g, blue.b);

  // Oben & Unten
  for (let cx = x0 + step / 2; cx < x1 - 1; cx += step) {
    doc.triangle(cx - triSize / 2, y0, cx + triSize / 2, y0, cx, y0 + triSize, "F");
    doc.triangle(cx - triSize / 2, y1, cx + triSize / 2, y1, cx, y1 - triSize, "F");
  }
  // Links & Rechts
  for (let cy = y0 + step / 2; cy < y1 - 1; cy += step) {
    doc.triangle(x0, cy - triSize / 2, x0, cy + triSize / 2, x0 + triSize, cy, "F");
    doc.triangle(x1, cy - triSize / 2, x1, cy + triSize / 2, x1 - triSize, cy, "F");
  }

  // Eckornamente (kleine Fächer)
  const corners: Array<[number, number]> = [
    [x0 + 3, y0 + 3],
    [x1 - 3, y0 + 3],
    [x0 + 3, y1 - 3],
    [x1 - 3, y1 - 3],
  ];
  doc.setFillColor(blueLight.r, blueLight.g, blueLight.b);
  for (const [cx, cy] of corners) {
    doc.circle(cx, cy, 0.7, "F");
    doc.setDrawColor(blue.r, blue.g, blue.b);
    doc.setLineWidth(0.3);
    doc.circle(cx, cy, 0.7, "S");
  }

  // Innenfeld (helleres Cremerechteck wie auf dem Foto)
  doc.setFillColor(250, 240, 222);
  doc.rect(x + inset + 1.2, y + inset + 1.2, W - 2 * (inset + 1.2), H - 2 * (inset + 1.2), "F");
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

async function drawLabelContent(doc: jsPDF, m: Mineral, box: Box) {
  const { x, y, W, H } = box;
  const ink: [number, number, number] = [30, 25, 20];

  // Innerer Zeichenbereich (innerhalb des dekorativen Rahmens)
  const padX = 4.0;
  const padY = 4.0;
  const innerX = x + padX;
  const innerY = y + padY;
  const innerW = W - 2 * padX;
  const innerH = H - 2 * padY;

  // Foto oben links – klein halten, damit rechts Platz für Text bleibt
  const photoSize = 17;
  const photoX = innerX;
  const photoY = innerY;
  const photoRightEdge = photoX + photoSize;
  let hasPhoto = false;
  if (m.photo_paths.length > 0) {
    try {
      const dataUrl = await fetchPhotoDataUrl(m.photo_paths[0]);
      const pdfPhoto = await convertPhotoToPdfJpeg(dataUrl);
      doc.setFillColor(255, 255, 255);
      doc.rect(photoX - 0.4, photoY - 0.4, photoSize + 0.8, photoSize + 0.8, "F");
      doc.addImage(pdfPhoto, "JPEG", photoX, photoY, photoSize, photoSize);
      doc.setDrawColor(42, 78, 112);
      doc.setLineWidth(0.2);
      doc.rect(photoX - 0.4, photoY - 0.4, photoSize + 0.8, photoSize + 0.8);
      hasPhoto = true;
    } catch {
      /* Foto optional */
    }
  }

  const rightColumnX = photoRightEdge + 2;
  const fullLeft = innerX;
  const fullRight = innerX + innerW;
  const fullWidth = fullRight - fullLeft;

  const rightLeft = rightColumnX;
  const rightWidth = fullRight - rightLeft;
  let ry = photoY + 2;
  const lineGap = 2.4;
  const rightMaxY = photoY + photoSize + 0.5;
  const detailFontSize = 5.5;

  doc.setTextColor(...ink);

  const writeRightLine = (label: string, value: string) => {
    if (ry > rightMaxY) return;
    doc.setFont("times", "bold");
    doc.setFontSize(detailFontSize);
    const labelText = `${label}: `;
    doc.text(labelText, rightLeft, ry);
    const labelW = doc.getTextWidth(labelText);
    doc.setFont("times", "normal");
    const wrapped = doc.splitTextToSize(value, rightWidth - labelW);
    const maxLines = Math.max(1, Math.floor((rightMaxY - ry) / lineGap) + 1);
    const limited = wrapped.slice(0, maxLines);
    doc.text(limited, rightLeft + labelW, ry);
    ry += Math.max(lineGap, limited.length * lineGap);
  };

  if (m.companion_minerals) writeRightLine("Begleitmin.", m.companion_minerals);

  if (m.category === "mineral" && m.chemical_formula && ry <= rightMaxY) {
    doc.setFont("times", "bold");
    doc.setFontSize(detailFontSize);
    doc.text("Formel:", rightLeft, ry);
    const labelW = doc.getTextWidth("Formel: ");
    drawFormula(doc, m.chemical_formula, rightLeft + labelW, ry, rightWidth - labelW, detailFontSize);
    ry += lineGap;
  }
  if (m.category === "mineral" && m.hardness) writeRightLine("Härte", String(m.hardness));
  if (m.category === "rock" && m.origin) writeRightLine("Ursprung", m.origin);
  if (m.notable) writeRightLine("Besonders", m.notable);
  if (m.country) writeRightLine("Land", m.country);
  if (m.location) writeRightLine("Fundort", m.location);
  if (m.uv_photos && m.uv_photos.length > 0) writeRightLine("UV", "aktiv");

  // Nummer und Name unter dem Foto (zweispaltig: Nummer links klein, Name daneben)
  const bottomY = innerY + innerH;
  const collFooterHeight = 3;
  let yPos = photoY + photoSize + 3;
  doc.setFont("times", "bold");
  doc.setFontSize(7);
  const numLabel = formatCollectionNumber(m.collection_number, m.category);
  doc.text(numLabel, fullLeft, yPos);
  const numW = doc.getTextWidth(numLabel);

  doc.setFont("times", "bold");
  doc.setFontSize(9);
  const nameMax = fullWidth - numW - 1.5;
  const nameLines = doc.splitTextToSize(m.mineral_name, nameMax);
  doc.text(nameLines.slice(0, 2), fullLeft + numW + 1.5, yPos);

  // Coll: Arco Boehme – unten mittig
  doc.setFont("times", "italic");
  doc.setFontSize(5.5);
  doc.setTextColor(...ink);
  doc.text("Coll: Arco Boehme", x + W / 2, bottomY + collFooterHeight - 0.5, { align: "center" });
}

async function drawLabelPage(doc: jsPDF, m: Mineral) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const box: Box = { x: 0, y: 0, W, H };
  drawDecorativeBorder(doc, box);
  await drawLabelContent(doc, m, box);
}

export async function generateLabelPdf(m: Mineral) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [70, 37] });
  await drawLabelPage(doc, m);
  doc.save(`Etikett-${m.mineral_name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}

export async function generateLabelsPdf(
  minerals: Mineral[],
  onProgress?: (done: number, total: number) => void,
) {
  if (minerals.length === 0) return 0;

  const labelW = 70;
  const labelH = 37;
  const cols = 3;
  const rows = 8;
  const perPage = cols * rows;
  const topMargin = 0.5;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < minerals.length; i++) {
    if (i > 0 && i % perPage === 0) {
      doc.addPage("a4", "portrait");
    }

    const pageIndex = i % perPage;
    const col = pageIndex % cols;
    const row = Math.floor(pageIndex / cols);
    const box: Box = {
      x: col * labelW,
      y: topMargin + row * labelH,
      W: labelW,
      H: labelH,
    };

    drawDecorativeBorder(doc, box);
    await drawLabelContent(doc, minerals[i], box);
    onProgress?.(i + 1, minerals.length);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`Etiketten-${stamp}.pdf`);
  return minerals.length;
}

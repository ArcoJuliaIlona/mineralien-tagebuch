import * as XLSX from "xlsx";
import mammoth from "mammoth";
import type { Category, MineralInput } from "@/lib/minerals";

export type ImportRow = MineralInput & { _row: number };

// Canonical field keys used internally
const FIELDS = [
  "category",
  "custom_number",
  "mineral_name",
  "chemical_formula",
  "hardness",
  "companion_minerals",
  "companion_formula",
  "companion_hardness",
  "location",
  "country",
  "origin",
  "era",
  "size",
  "notable",
  "value",
  "collection_name",
  "storage_floor",
  "storage_cabinet",
  "storage_shelf",
  "radioactive",
  "previous_owner",
  "acquired_at",
  "acquisition_type",
  "acquisition_price",
  "description",
] as const;

type Field = (typeof FIELDS)[number];

// Map many possible header labels to canonical field names
const HEADER_MAP: Record<string, Field> = {};
const add = (f: Field, aliases: string[]) => {
  aliases.forEach((a) => (HEADER_MAP[normalizeHeader(a)] = f));
};
add("category", ["kategorie", "typ", "art", "category"]);
add("custom_number", ["nummer", "nr", "no", "alt nummer", "alternative nummer", "sammlungsnummer", "custom", "custom number"]);
add("mineral_name", ["mineral", "name", "mineralname", "fossil", "fossilname", "gestein", "gesteinname", "bezeichnung"]);
add("chemical_formula", ["formel", "chemische formel", "chemical formula", "summenformel"]);
add("hardness", ["haerte", "härte", "mohs", "hardness"]);
add("companion_minerals", ["begleitmineral", "begleitmineralien", "begleiter", "companion", "matrix", "weitere fossilien", "besonderheiten"]);
add("companion_formula", ["begleitformel", "companion formula"]);
add("companion_hardness", ["begleithärte", "begleithaerte", "companion hardness"]);
add("location", ["fundort", "ort", "location", "locality"]);
add("country", ["land", "country", "staat"]);
add("origin", ["ursprung", "origin", "entstehung"]);
add("era", ["zeitalter", "era", "epoche", "alter"]);
add("size", ["groesse", "größe", "size", "maße", "masse", "dimensionen"]);
add("notable", ["notable", "besonderheit", "bemerkung", "anmerkung", "notiz", "notes"]);
add("value", ["wert", "preis", "value", "price", "eur", "€"]);
add("collection_name", ["sammlung", "collection", "collection name"]);
add("storage_floor", ["etage", "floor", "stockwerk"]);
add("storage_cabinet", ["schrank", "cabinet", "kasten"]);
add("storage_shelf", ["ebene", "shelf", "fach", "regal"]);
add("radioactive", ["radioaktiv", "radioactive", "strahlend"]);
add("previous_owner", ["vorbesitzer", "herkunftssammlung", "provenienz", "previous owner", "provenance"]);
add("acquired_at", ["erwerbsdatum", "kaufdatum", "datum", "acquired", "acquired at"]);
add("acquisition_type", ["erwerbsart", "erwerb", "acquisition", "acquisition type"]);
add("acquisition_price", ["erwerbspreis", "kaufpreis", "acquisition price"]);
add("description", ["beschreibung", "description", "kuratorentext", "text"]);

function normalizeHeader(s: string): string {
  return s
    .toString()
    .toLowerCase()
    .replace(/[._\-/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCategory(v: unknown): Category {
  const s = String(v ?? "").toLowerCase().trim();
  if (!s) return "mineral";
  if (s.startsWith("f") || s.includes("foss")) return "fossil";
  if (s.startsWith("g") || s.includes("gestein") || s.includes("rock")) return "rock";
  return "mineral";
}

function parseValue(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/[^\d,.\-]/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseBool(v: unknown): boolean {
  const s = String(v ?? "").toLowerCase().trim();
  return ["1", "ja", "yes", "true", "x", "wahr", "y"].includes(s);
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function rowsToImport(rows: Record<string, unknown>[]): ImportRow[] {
  return rows.map((raw, idx) => {
    const mapped: Partial<Record<Field, unknown>> = {};
    for (const [k, v] of Object.entries(raw)) {
      const f = HEADER_MAP[normalizeHeader(k)];
      if (f) mapped[f] = v;
    }
    const row: ImportRow = {
      _row: idx + 2, // header = row 1
      category: parseCategory(mapped.category),
      custom_number: str(mapped.custom_number),
      mineral_name: str(mapped.mineral_name) ?? "",
      chemical_formula: str(mapped.chemical_formula),
      hardness: str(mapped.hardness),
      companion_minerals: str(mapped.companion_minerals),
      companion_formula: str(mapped.companion_formula),
      companion_hardness: str(mapped.companion_hardness),
      location: str(mapped.location),
      country: str(mapped.country),
      origin: str(mapped.origin),
      era: str(mapped.era),
      size: str(mapped.size),
      notable: str(mapped.notable),
      value: parseValue(mapped.value),
      collection_name: str(mapped.collection_name),
      storage_floor: str(mapped.storage_floor),
      storage_cabinet: str(mapped.storage_cabinet),
      storage_shelf: str(mapped.storage_shelf),
      radioactive: parseBool(mapped.radioactive),
      photo_paths: [],
      video_paths: [],
      uv_photos: [],
      uv_types: [],
      latitude: null,
      longitude: null,
      previous_owner: str(mapped.previous_owner),
      acquired_at: str(mapped.acquired_at),
      acquisition_type: str(mapped.acquisition_type),
      acquisition_price: parseValue(mapped.acquisition_price),
      description: str(mapped.description),
    };
    return row;
  });
}

export async function parseFile(file: File): Promise<ImportRow[]> {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    const wb = XLSX.read(buf, { type: "array" });
    const first = wb.SheetNames[0];
    if (!first) return [];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[first], { defval: "" });
    return rowsToImport(json);
  }

  if (name.endsWith(".docx")) {
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) throw new Error("Im Word-Dokument wurde keine Tabelle gefunden. Bitte Listen als Tabelle formatieren.");
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length < 2) return [];
    const headers = Array.from(rows[0].querySelectorAll("th,td")).map((c) => c.textContent?.trim() ?? "");
    const data: Record<string, unknown>[] = rows.slice(1).map((tr) => {
      const cells = Array.from(tr.querySelectorAll("td,th"));
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => (obj[h] = cells[i]?.textContent?.trim() ?? ""));
      return obj;
    });
    return rowsToImport(data);
  }

  throw new Error("Nicht unterstütztes Dateiformat. Verwende .xlsx, .csv oder .docx.");
}

export const IMPORT_FIELDS = FIELDS;
import { supabase } from "@/integrations/supabase/client";

export type Category = "mineral" | "fossil" | "rock";

export const CATEGORY_LABEL: Record<Category, string> = {
  mineral: "Mineral",
  fossil: "Fossil",
  rock: "Gestein",
};

export const CATEGORY_LABEL_PLURAL: Record<Category, string> = {
  mineral: "Mineralien",
  fossil: "Fossilien",
  rock: "Gesteine",
};

export const CATEGORY_SUFFIX: Record<Category, string> = {
  mineral: "M",
  fossil: "F",
  rock: "G",
};

export function formatCollectionNumber(
  n: number | null | undefined,
  category: Category,
): string {
  return `${n ?? 0}${CATEGORY_SUFFIX[category]}`;
}

export function formatDisplayNumber(
  n: number | null | undefined,
  category: Category,
  custom?: string | null,
): string {
  const auto = formatCollectionNumber(n, category);
  const c = (custom ?? "").trim();
  return c ? `${auto} (${c})` : auto;
}

export type Mineral = {
  id: string;
  user_id: string;
  mineral_name: string;
  companion_minerals: string | null;
  location: string | null;
  collection_name: string | null;
  photo_paths: string[];
  category: Category;
  latitude: number | null;
  longitude: number | null;
  collection_number: number;
  custom_number: string | null;
  value: number | null;
  chemical_formula: string | null;
  created_at: string;
  updated_at: string;
  video_paths: string[];
  hardness: string | null;
  size: string | null;
  era: string | null;
  origin: string | null;
  notable: string | null;
  country: string | null;
  uv_photos: string[];
  uv_types: string[];
  companion_formula: string | null;
  companion_hardness: string | null;
  radioactive: boolean;
  storage_floor: string | null;
  storage_cabinet: string | null;
  storage_shelf: string | null;
};

export async function listMinerals(): Promise<Mineral[]> {
  const { data, error } = await supabase
    .from("minerals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Mineral[];
}

export async function getMineral(id: string): Promise<Mineral> {
  const { data, error } = await supabase
    .from("minerals")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Mineral;
}

export type MineralInput = {
  mineral_name: string;
  companion_minerals: string | null;
  location: string | null;
  collection_name: string | null;
  photo_paths: string[];
  category: Category;
  latitude: number | null;
  longitude: number | null;
  value: number | null;
  chemical_formula: string | null;
  video_paths: string[];
  hardness: string | null;
  size: string | null;
  era: string | null;
  origin: string | null;
  notable: string | null;
  country: string | null;
  uv_photos: string[];
  uv_types: string[];
  companion_formula: string | null;
  companion_hardness: string | null;
  radioactive: boolean;
  custom_number: string | null;
  storage_floor: string | null;
  storage_cabinet: string | null;
  storage_shelf: string | null;
};

export async function createMineral(userId: string, input: MineralInput) {
  const { error, data } = await supabase
    .from("minerals")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Mineral;
}

export async function updateMineral(id: string, input: MineralInput) {
  const { error } = await supabase.from("minerals").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteMineral(id: string) {
  const { error } = await supabase.from("minerals").delete().eq("id", id);
  if (error) throw error;
}
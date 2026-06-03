import { supabase } from "@/integrations/supabase/client";

export type Mineral = {
  id: string;
  user_id: string;
  mineral_name: string;
  companion_minerals: string | null;
  location: string | null;
  collection_name: string | null;
  photo_paths: string[];
  created_at: string;
  updated_at: string;
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
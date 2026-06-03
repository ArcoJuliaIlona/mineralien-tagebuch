import { useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoThumb } from "./PhotoThumb";
import { uploadPhoto, deletePhotos } from "@/lib/photos";
import { toast } from "sonner";
import type { MineralInput } from "@/lib/minerals";

type Props = {
  userId: string;
  initial?: Partial<MineralInput>;
  submitLabel: string;
  onSubmit: (input: MineralInput, removedPhotoPaths: string[]) => Promise<void>;
};

export function MineralForm({ userId, initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.mineral_name ?? "");
  const [companion, setCompanion] = useState(initial?.companion_minerals ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [collection, setCollection] = useState(initial?.collection_name ?? "");
  const [photos, setPhotos] = useState<string[]>(initial?.photo_paths ?? []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const f of Array.from(files)) {
        const p = await uploadPhoto(userId, f);
        paths.push(p);
      }
      setPhotos((prev) => [...prev, ...paths]);
    } catch (e: unknown) {
      toast.error("Hochladen fehlgeschlagen: " + (e instanceof Error ? e.message : ""));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (path: string) => {
    setPhotos((prev) => prev.filter((p) => p !== path));
    setRemoved((prev) => [...prev, path]);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Bitte Mineralname angeben.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(
        {
          mineral_name: name.trim(),
          companion_minerals: companion.trim() || null,
          location: location.trim() || null,
          collection_name: collection.trim() || null,
          photo_paths: photos,
        },
        removed,
      );
      if (removed.length > 0) await deletePhotos(removed);
    } catch (e: unknown) {
      toast.error("Speichern fehlgeschlagen: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Field label="Mineralname *">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Bergkristall"
          className="h-12 text-base"
        />
      </Field>
      <Field label="Begleitmineralien">
        <Input
          value={companion ?? ""}
          onChange={(e) => setCompanion(e.target.value)}
          placeholder="z. B. Pyrit, Calcit"
          className="h-12 text-base"
        />
      </Field>
      <Field label="Fundort">
        <Textarea
          value={location ?? ""}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ort, Region, Land"
          className="min-h-[80px] text-base"
        />
      </Field>
      <Field label="Sammlungsname">
        <Input
          value={collection ?? ""}
          onChange={(e) => setCollection(e.target.value)}
          placeholder="z. B. Alpine Klüfte"
          className="h-12 text-base"
        />
      </Field>

      <div className="space-y-3">
        <Label className="text-base">Fotos</Label>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div key={p} className="relative">
                <PhotoThumb path={p} className="aspect-square w-full" />
                <button
                  type="button"
                  onClick={() => removePhoto(p)}
                  aria-label="Foto entfernen"
                  className="absolute right-1 top-1 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card text-base font-medium text-foreground transition hover:bg-accent/40">
            <Camera className="size-5" /> Kamera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
          <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card text-base font-medium text-foreground transition hover:bg-accent/40">
            <ImagePlus className="size-5" /> Galerie
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>
        {uploading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Foto wird hochgeladen…
          </p>
        )}
      </div>

      <Button
        size="lg"
        className="h-14 w-full text-lg"
        onClick={submit}
        disabled={saving || uploading}
      >
        {saving ? "Speichere…" : submitLabel}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      {children}
    </div>
  );
}
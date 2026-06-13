import { useState, useEffect } from "react";
import {
  Camera,
  ImagePlus,
  Loader2,
  MapPin,
  Sparkles,
  Trash2,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { fetchChemicalFormula } from "@/lib/chemical-formula.functions";
import { fetchHardness } from "@/lib/hardness.functions";
import { FormulaText } from "@/lib/format-formula";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoThumb } from "./PhotoThumb";
import { ZoomablePhoto } from "./ZoomablePhoto";
import { uploadPhoto, deletePhotos, getPhotoUrl } from "@/lib/photos";
import { uploadVideo, deleteVideos, getVideoUrl } from "@/lib/videos";
import { toast } from "sonner";
import type { Category, MineralInput } from "@/lib/minerals";
import { CATEGORY_LABEL } from "@/lib/minerals";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Props = {
  userId: string;
  initial?: Partial<MineralInput>;
  submitLabel: string;
  onSubmit: (input: MineralInput, removedPhotoPaths: string[]) => Promise<void>;
};

export function MineralForm({ userId, initial, submitLabel, onSubmit }: Props) {
  const [category, setCategory] = useState<Category>(initial?.category ?? "mineral");
  const [name, setName] = useState(initial?.mineral_name ?? "");
  const [companion, setCompanion] = useState(initial?.companion_minerals ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [collection, setCollection] = useState(initial?.collection_name ?? "");
  const [value, setValue] = useState<string>(
    initial?.value != null ? String(initial.value) : "",
  );
  const [formula, setFormula] = useState<string>(initial?.chemical_formula ?? "");
  const [fetchingFormula, setFetchingFormula] = useState(false);
  const fetchFormulaFn = useServerFn(fetchChemicalFormula);
  const [hardness, setHardness] = useState<string>(initial?.hardness ?? "");
  const [fetchingHardness, setFetchingHardness] = useState(false);
  const fetchHardnessFn = useServerFn(fetchHardness);
  const [origin, setOrigin] = useState<string>(initial?.origin ?? "");
  const [notable, setNotable] = useState<string>(initial?.notable ?? "");
  const [size, setSize] = useState<string>(initial?.size ?? "");
  const [era, setEra] = useState<string>(initial?.era ?? "");
  const [photos, setPhotos] = useState<string[]>(initial?.photo_paths ?? []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>(initial?.video_paths ?? []);
  const [removedVideos, setRemovedVideos] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [latitude, setLatitude] = useState<number | null>(initial?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initial?.longitude ?? null);
  const [coordsInput, setCoordsInput] = useState(() => {
    if (initial?.latitude != null && initial?.longitude != null) {
      return `${initial.latitude.toFixed(5)}, ${initial.longitude.toFixed(5)}`;
    }
    return "";
  });
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!zoomPhoto) {
      setZoomUrl(null);
      return;
    }
    let active = true;
    getPhotoUrl(zoomPhoto)
      .then((url) => {
        if (active) setZoomUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [zoomPhoto]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = videos.filter((p) => !videoUrls[p]);
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (p) => [p, await getVideoUrl(p)] as const),
      );
      if (!cancelled) {
        setVideoUrls((prev) => {
          const next = { ...prev };
          for (const [p, u] of entries) next[p] = u;
          return next;
        });
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [videos, videoUrls]);

  const autoFetchFormula = async () => {
    if (!name.trim()) {
      toast.error("Bitte zuerst einen Namen eingeben.");
      return;
    }
    setFetchingFormula(true);
    try {
      const res = await fetchFormulaFn({ data: { name: name.trim() } });
      if (res.formula) {
        setFormula(res.formula);
        toast.success("Formel ergänzt");
      } else {
        toast.info("Keine eindeutige Formel gefunden.");
      }
    } catch (e: unknown) {
      toast.error("Formel konnte nicht ermittelt werden: " + (e instanceof Error ? e.message : ""));
    } finally {
      setFetchingFormula(false);
    }
  };

  const autoFetchHardness = async () => {
    if (!name.trim()) {
      toast.error("Bitte zuerst einen Namen eingeben.");
      return;
    }
    setFetchingHardness(true);
    try {
      const res = await fetchHardnessFn({ data: { name: name.trim() } });
      if (res.hardness) {
        setHardness(res.hardness);
        toast.success("Härte ergänzt");
      } else {
        toast.info("Keine eindeutige Härte gefunden.");
      }
    } catch (e: unknown) {
      toast.error("Härte konnte nicht ermittelt werden: " + (e instanceof Error ? e.message : ""));
    } finally {
      setFetchingHardness(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const f of selected) {
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

  const handleVideoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingVideo(true);
    try {
      const paths: string[] = [];
      for (const f of Array.from(files)) {
        const p = await uploadVideo(userId, f);
        paths.push(p);
      }
      setVideos((prev) => [...prev, ...paths]);
    } catch (e: unknown) {
      toast.error("Video-Upload fehlgeschlagen: " + (e instanceof Error ? e.message : ""));
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeVideo = (path: string) => {
    setVideos((prev) => prev.filter((p) => p !== path));
    setRemovedVideos((prev) => [...prev, path]);
  };

  const captureGps = () => {
    if (!("geolocation" in navigator)) {
      toast.error("GPS wird von diesem Gerät nicht unterstützt.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setCoordsInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setLocating(false);
        toast.success("Koordinaten übernommen");
      },
      (err) => {
        setLocating(false);
        toast.error("Standort nicht verfügbar: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const clearGps = () => {
    setLatitude(null);
    setLongitude(null);
    setCoordsInput("");
  };


  const applyCoordsInput = () => {
    const raw = coordsInput.trim();
    if (!raw) {
      setLatitude(null);
      setLongitude(null);
      return;
    }
    // Support formats: "49.2345, 8.1234", "49.2345 8.1234", "49.2345° N, 8.1234° E"
    const cleaned = raw
      .replace(/[°\s]+/g, " ")
      .replace(/[NSWE]/gi, "")
      .trim();
    const parts = cleaned.split(/[,\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      const lat = Number(parts[0].replace(",", "."));
      const lng = Number(parts[1].replace(",", "."));
      if (isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setLatitude(lat);
        setLongitude(lng);
        setCoordsInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        toast.success("Koordinaten übernommen");
        return;
      }
    }
    toast.error("Koordinaten nicht erkannt. Format: 49.2345, 8.1234");
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Bitte Mineralname angeben.");
      return;
    }
    const parsedValue = value.trim() === "" ? null : Number(value.replace(",", "."));
    if (parsedValue != null && (!isFinite(parsedValue) || parsedValue < 0)) {
      toast.error("Bitte einen gültigen Wert eingeben.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(
        {
          mineral_name: name.trim(),
          companion_minerals: companion.trim() || null,
          location: location.trim() || null,
          country: country.trim() || null,
          collection_name: collection.trim() || null,
          photo_paths: photos,
          category,
          latitude,
          longitude,
          value: parsedValue,
          chemical_formula: formula.trim() || null,
          video_paths: videos,
          hardness: hardness.trim() || null,
          size: size.trim() || null,
          era: era.trim() || null,
          origin: origin.trim() || null,
          notable: notable.trim() || null,
        },
        removed,
      );
      if (removed.length > 0) await deletePhotos(removed);
      if (removedVideos.length > 0) await deleteVideos(removedVideos);
    } catch (e: unknown) {
      toast.error("Speichern fehlgeschlagen: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Field label="Kategorie *">
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mineral">{CATEGORY_LABEL.mineral}</SelectItem>
            <SelectItem value="fossil">{CATEGORY_LABEL.fossil}</SelectItem>
            <SelectItem value="rock">{CATEGORY_LABEL.rock}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Name *">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Bergkristall"
          className="h-12 text-base"
        />
      </Field>
      <Field label={category === "fossil" ? "Weitere Fossilien & Besonderheiten" : "Begleitmineralien"}>
        <Input
          value={companion ?? ""}
          onChange={(e) => setCompanion(e.target.value)}
          placeholder={
            category === "fossil"
              ? "z. B. Ammonit, Belemnit – Besonderheiten"
              : "z. B. Pyrit, Calcit"
          }
          className="h-12 text-base"
        />
      </Field>
      {category === "mineral" && (
      <Field label="Chemische Formel">
        <div className="space-y-2">
          <Input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="z. B. SiO₂"
            className="h-12 text-base"
          />
          {formula.trim() && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-base">
              <span className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">
                Vorschau:
              </span>
              <FormulaText value={formula} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Tipp: Zahlen werden automatisch tiefgestellt (H2O → H₂O). Für Ladungen{" "}
            <code>^</code> nutzen (Ca^2+), für Hydrate <code>*</code> (CuSO4*5H2O).
          </p>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-12 w-full gap-2 text-base"
            onClick={autoFetchFormula}
            disabled={fetchingFormula}
          >
            {fetchingFormula ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Sparkles className="size-5" />
            )}
            Formel automatisch ermitteln
          </Button>
        </div>
      </Field>
      )}
      {category === "mineral" && (
      <Field label="Härte (Mohs)">
        <div className="space-y-2">
          <Input
            value={hardness}
            onChange={(e) => setHardness(e.target.value)}
            placeholder="z. B. 7 oder 6,5–7"
            className="h-12 text-base"
          />
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-12 w-full gap-2 text-base"
            onClick={autoFetchHardness}
            disabled={fetchingHardness}
          >
            {fetchingHardness ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Sparkles className="size-5" />
            )}
            Härte automatisch ermitteln
          </Button>
        </div>
      </Field>
      )}
      {category === "rock" && (
      <Field label="Ursprung">
        <Input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="z. B. Vulkanisch, Sedimentär, Metamorph"
          className="h-12 text-base"
        />
      </Field>
      )}
      <Field label="Land">
        <Input
          value={country ?? ""}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="z. B. Deutschland"
          className="h-12 text-base"
        />
      </Field>
      <Field label="Fundort">
        <Textarea
          value={location ?? ""}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ort, Region"
          className="min-h-[80px] text-base"
        />
      </Field>
      {category === "fossil" && (
      <Field label="Zeitalter">
        <Input
          value={era}
          onChange={(e) => setEra(e.target.value)}
          placeholder="z. B. Oberjura, Tithonium (ca. 150 Mio. Jahre)"
          className="h-12 text-base"
        />
      </Field>
      )}
      <Field label="GPS-Koordinaten">
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-12 w-full gap-2 text-base"
            onClick={captureGps}
            disabled={locating}
          >
            {locating ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <MapPin className="size-5" />
            )}
            {latitude != null && longitude != null
              ? "Standort aktualisieren"
              : "Aktuellen Standort übernehmen"}
          </Button>
          <div className="flex gap-2">
            <Input
              value={coordsInput}
              onChange={(e) => setCoordsInput(e.target.value)}
              onBlur={applyCoordsInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCoordsInput();
                }
              }}
              placeholder="z. B. 49.2345, 8.1234"
              className="h-12 flex-1 text-base"
            />
            <Button
              type="button"
              variant="outline"
              className="h-12 px-4 text-base"
              onClick={applyCoordsInput}
            >
              Übernehmen
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Format: Breite, Länge (z. B. 49.2345, 8.1234). Einfach aus Google Maps kopieren und einfügen.
          </p>
          {latitude != null && longitude != null && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-mono">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
              <button
                type="button"
                onClick={clearGps}
                aria-label="Koordinaten entfernen"
                className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>
      </Field>
      <Field label="Sammlungsname">
        <Input
          value={collection ?? ""}
          onChange={(e) => setCollection(e.target.value)}
          placeholder="z. B. Alpine Klüfte"
          className="h-12 text-base"
        />
      </Field>
      <Field label="Wert (€)">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z. B. 25.00"
          className="h-12 text-base"
        />
      </Field>
      <Field label="Größe">
        <Input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="z. B. 5 × 3 × 2 cm"
          className="h-12 text-base"
        />
      </Field>
      <Field label="Besonders">
        <Textarea
          value={notable}
          onChange={(e) => setNotable(e.target.value)}
          placeholder="Besonderheiten, Anmerkungen, auffällige Merkmale…"
          className="min-h-[80px] text-base"
        />
      </Field>

      <div className="space-y-3">
        <Label className="text-base">Fotos</Label>
        <div className="flex items-start justify-between gap-3 rounded-lg border bg-card/60 px-3 py-2">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Hintergrund automatisch schwärzen</p>
            <p className="text-xs text-muted-foreground">
              Beim Hochladen wird der Hintergrund per KI durch reines Schwarz ersetzt (Museumsvitrinen-Look).
            </p>
          </div>
          <Switch checked={blackenBg} onCheckedChange={setBlackenBg} aria-label="Hintergrund automatisch schwärzen" />
        </div>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div key={p} className="relative">
                <div
                  className="cursor-pointer"
                  onClick={() => setZoomPhoto(p)}
                >
                  <PhotoThumb path={p} className="aspect-square w-full" />
                </div>
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
          <label className={`flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card text-base font-medium text-foreground transition ${photos.length >= 4 ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent/40"}`}>
            <Camera className="size-5" /> Kamera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={photos.length >= 4}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
          <label className={`flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card text-base font-medium text-foreground transition ${photos.length >= 4 ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent/40"}`}>
            <ImagePlus className="size-5" /> Galerie
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={photos.length >= 4}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{photos.length} / 4 Fotos</p>
        {uploading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Foto wird hochgeladen…
          </p>
        )}
        {blackening && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Hintergrund wird per KI geschwärzt…
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-base">Videos</Label>
        {videos.length > 0 && (
          <div className="space-y-2">
            {videos.map((p) => (
              <div key={p} className="relative overflow-hidden rounded-lg border bg-card">
                {videoUrls[p] ? (
                  <video src={videoUrls[p]} controls playsInline className="w-full" />
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" /> Lade Video…
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeVideo(p)}
                  aria-label="Video entfernen"
                  className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card text-base font-medium text-foreground transition hover:bg-accent/40">
            <Camera className="size-5" /> Aufnehmen
            <input
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleVideoFiles(e.target.files)}
            />
          </label>
          <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card text-base font-medium text-foreground transition hover:bg-accent/40">
            <VideoIcon className="size-5" /> Galerie
            <input
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => handleVideoFiles(e.target.files)}
            />
          </label>
        </div>
        {uploadingVideo && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Video wird hochgeladen…
          </p>
        )}
      </div>

      <Button
        size="lg"
        className="h-14 w-full text-lg"
        onClick={submit}
        disabled={saving || uploading || uploadingVideo || blackening}
      >
        {saving ? "Speichere…" : submitLabel}
      </Button>

      {zoomPhoto && (
        <div
          role="dialog"
          aria-label="Foto vergrößert"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2"
          onClick={() => setZoomPhoto(null)}
        >
          <button
            type="button"
            aria-label="Schließen"
            onClick={(e) => { e.stopPropagation(); setZoomPhoto(null); }}
            className="absolute right-3 top-3 rounded-full bg-background/90 p-2 text-foreground shadow"
          >
            <X className="size-5" />
          </button>
          {zoomUrl ? (
            <ZoomablePhoto src={zoomUrl} alt="Vergrößertes Foto" />
          ) : (
            <Loader2 className="size-10 animate-spin text-white" />
          )}
        </div>
      )}
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
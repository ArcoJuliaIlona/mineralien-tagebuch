import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ScanLine } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { MineralForm } from "@/components/MineralForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { createMineral, type MineralInput } from "@/lib/minerals";
import { scanLabel } from "@/lib/scan-label.functions";
import { toast } from "sonner";

const searchSchema = z.object({
  category: z.enum(["mineral", "fossil", "rock"]).optional(),
});

export const Route = createFileRoute("/neu")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Neuer Fund" }] }),
  component: () => (
    <AuthGate>
      <AppShell>
        <NewPage />
      </AppShell>
    </AuthGate>
  ),
});

function NewPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const scanFn = useServerFn(scanLabel);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const { category } = Route.useSearch();
  const [initial, setInitial] = useState<Partial<MineralInput> | undefined>(
    category ? { category } : undefined
  );
  const [formKey, setFormKey] = useState(0);

  if (!session) return null;

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
      fr.readAsDataURL(file);
    });

  const downscale = async (dataUrl: string): Promise<string> => {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Bild konnte nicht geladen werden."));
      img.src = dataUrl;
    });
    const maxSide = 1600;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const tw = Math.round(w * scale);
    const th = Math.round(h * scale);
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, tw, th);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const onScanFile = async (file: File) => {
    setScanning(true);
    try {
      const raw = await fileToDataUrl(file);
      const small = await downscale(raw);
      const { result } = await scanFn({ data: { imageDataUrl: small } });
      setInitial((prev) => ({
        ...prev,
        mineral_name: result.mineral_name ?? "",
        chemical_formula: result.chemical_formula,
        companion_minerals: result.companion_minerals,
        location: result.location,
        country: result.country,
        hardness: result.hardness,
        collection_name: result.collection_name,
        value: result.value,
        size: result.size,
        era: result.era,
        origin: result.origin,
        notable: result.notable,
      }));
      setFormKey((k) => k + 1);
      toast.success("Etikett erkannt – bitte prüfen.");
    } catch (e: unknown) {
      toast.error("Scan fehlgeschlagen: " + (e instanceof Error ? e.message : ""));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Neuer Fund</h1>

      <div className="rounded-xl border bg-card p-3 space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onScanFile(f);
          }}
        />
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="h-12 w-full gap-2 text-base"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
        >
          {scanning ? <Loader2 className="size-5 animate-spin" /> : <ScanLine className="size-5" />}
          {scanning ? "Etikett wird gelesen…" : "Etikett scannen"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Foto vom Etikett (auch handgeschrieben) machen – die Felder werden automatisch ausgefüllt.
          Bitte vor dem Speichern prüfen.
        </p>
      </div>

      <MineralForm
        key={formKey}
        userId={session.user.id}
        initial={initial}
        submitLabel="Fund speichern"
        onSubmit={async (input) => {
          const m = await createMineral(session.user.id, input);
          qc.invalidateQueries({ queryKey: ["minerals"] });
          toast.success("Fund gespeichert");
          navigate({ to: "/fund/$id", params: { id: m.id } });
        }}
      />
    </div>
  );
}
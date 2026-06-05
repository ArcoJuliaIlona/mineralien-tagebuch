import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileDown, Pencil, QrCode, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PhotoThumb } from "@/components/PhotoThumb";
import { LocationMap } from "@/components/LocationMap";
import { getMineral, deleteMineral, CATEGORY_LABEL, formatCollectionNumber } from "@/lib/minerals";
import { FormulaText } from "@/lib/format-formula";
import { deletePhotos } from "@/lib/photos";
import { deleteVideos, getVideoUrls } from "@/lib/videos";
import { generateLabelPdf } from "@/lib/label-pdf";
import { generateSingleQrPdf } from "@/lib/qr-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/fund/$id")({
  head: () => ({ meta: [{ title: "Funddetails" }] }),
  component: FundRoute,
});

function FundRoute() {
  const isEditRoute = useRouterState({
    select: (state) => state.location.pathname.endsWith("/bearbeiten"),
  });

  if (isEditRoute) return <Outlet />;

  return (
    <AuthGate>
      <AppShell>
        <DetailPage />
      </AppShell>
    </AuthGate>
  );
}

function DetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: m, isLoading } = useQuery({
    queryKey: ["minerals", id],
    queryFn: () => getMineral(id),
  });

  const { data: videoUrls } = useQuery({
    queryKey: ["mineral-videos", id, m?.video_paths],
    queryFn: () => getVideoUrls(m?.video_paths ?? []),
    enabled: !!m && (m?.video_paths?.length ?? 0) > 0,
  });

  if (isLoading) return <p className="py-12 text-center text-muted-foreground">Lade…</p>;
  if (!m) return <p className="py-12 text-center text-muted-foreground">Nicht gefunden.</p>;

  const onDelete = async () => {
    setBusy(true);
    try {
      await deleteMineral(m.id);
      await deletePhotos(m.photo_paths);
      await deleteVideos(m.video_paths ?? []);
      qc.invalidateQueries({ queryKey: ["minerals"] });
      toast.success("Fund gelöscht");
      navigate({ to: "/" });
    } catch (e: unknown) {
      toast.error("Löschen fehlgeschlagen");
      setBusy(false);
    }
  };

  const onPdf = async () => {
    try {
      setBusy(true);
      await generateLabelPdf(m);
    } catch {
      toast.error("PDF konnte nicht erstellt werden");
    } finally {
      setBusy(false);
    }
  };

  const onQr = async () => {
    try {
      setBusy(true);
      await generateSingleQrPdf(m);
    } catch {
      toast.error("QR-Code konnte nicht erstellt werden");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zur Liste
      </Link>

      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">
          {CATEGORY_LABEL[m.category]} · Nr. {formatCollectionNumber(m.collection_number, m.category)}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{m.mineral_name}</h1>
      </div>

      {m.photo_paths.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {m.photo_paths.map((p) => (
            <PhotoThumb key={p} path={p} className="aspect-square w-full" />
          ))}
        </div>
      )}

      {m.video_paths && m.video_paths.length > 0 && (
        <div className="space-y-2">
          {(videoUrls ?? []).map((url, i) =>
            url ? (
              <video
                key={m.video_paths[i]}
                src={url}
                controls
                playsInline
                className="w-full overflow-hidden rounded-xl border bg-card"
              />
            ) : null,
          )}
        </div>
      )}

      <dl className="space-y-3 rounded-xl border bg-card p-4">
        <DataRow label="Begleitmineralien" value={m.companion_minerals} />
        <FormulaRow label="Chemische Formel" value={m.chemical_formula} />
        <DataRow label="Fundort" value={m.location} />
        <DataRow label="Sammlung" value={m.collection_name} />
        <DataRow
          label="Wert"
          value={
            m.value != null
              ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(m.value)
              : null
          }
        />
        {m.latitude != null && m.longitude != null && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground">GPS-Koordinaten</dt>
            <dd className="text-lg font-mono">
              {m.latitude.toFixed(5)}, {m.longitude.toFixed(5)}
            </dd>
            <div className="mt-3">
              <LocationMap latitude={m.latitude} longitude={m.longitude} />
            </div>
          </div>
        )}
      </dl>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          size="lg"
          className="h-14 gap-2 text-base"
          onClick={onPdf}
          disabled={busy}
        >
          <FileDown className="size-5" /> Etikett (PDF)
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 gap-2 text-base"
          onClick={onQr}
          disabled={busy}
        >
          <QrCode className="size-5" /> QR-Code (5 mm)
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-14 w-full gap-2 text-base">
          <Link to="/fund/$id/bearbeiten" params={{ id: m.id }}>
            <Pencil className="size-5" /> Bearbeiten
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-full gap-2 text-base"
              disabled={busy}
            >
              <Trash2 className="size-5" /> Löschen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Wirklich löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Dieser Fund und alle zugehörigen Fotos werden dauerhaft entfernt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Endgültig löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-lg">{value || "—"}</dd>
    </div>
  );
}

function FormulaRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg">
        {value ? <FormulaText value={value} /> : "—"}
      </dd>
    </div>
  );
}
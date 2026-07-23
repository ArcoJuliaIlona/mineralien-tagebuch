import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, FileDown, Focus, Image as ImageIcon, Loader2, Maximize2, Pencil, QrCode, Ruler, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { blackenPhoto, hasOriginalBackup, restorePhoto, studioBackgroundPhoto } from "@/lib/photos-edit.functions";
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
import { ZoomablePhoto } from "@/components/ZoomablePhoto";
import { MeasureDialog } from "@/components/MeasureDialog";
import { getMineral, deleteMineral, updateMineral, CATEGORY_LABEL, formatCollectionNumber } from "@/lib/minerals";
import { FormulaText } from "@/lib/format-formula";
import { deletePhotos, getOriginalPhotoUrl, getPhotoUrl, getZoomPhotoUrl } from "@/lib/photos";
import { getPhotoThumbUrls } from "@/lib/photos";
import { deleteVideos, getVideoUrls } from "@/lib/videos";
import { generateLabelPdf } from "@/lib/label-pdf";
import { generateSingleQrPdf } from "@/lib/qr-pdf";
import { sharpenImageUrl } from "@/lib/sharpen";
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
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomIsUv, setZoomIsUv] = useState(false);
  const [presentUrl, setPresentUrl] = useState<string | null>(null);
  const [presentLoading, setPresentLoading] = useState(false);
  const [presentBaseUrl, setPresentBaseUrl] = useState<string | null>(null);
  const [sharpened, setSharpened] = useState(false);
  const [sharpening, setSharpening] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [hasBackup, setHasBackup] = useState(false);
  const [editing, setEditing] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const blackenFn = useServerFn(blackenPhoto);
  const studioFn = useServerFn(studioBackgroundPhoto);
  const restoreFn = useServerFn(restorePhoto);
  const checkBackupFn = useServerFn(hasOriginalBackup);

  useEffect(() => {
    if (!zoomPhoto) {
      setZoomUrl(null);
      return;
    }
    let active = true;
    getZoomPhotoUrl(zoomPhoto)
      .then((url) => { if (active) setZoomUrl(`${url}${url.includes("?") ? "&" : "?"}v=${photoVersion}`); })
      .catch(() => {});
    return () => { active = false; };
  }, [zoomPhoto, photoVersion]);

  useEffect(() => {
    if (!zoomPhoto) { setHasBackup(false); return; }
    let active = true;
    checkBackupFn({ data: { path: zoomPhoto } })
      .then((r) => { if (active) setHasBackup(r.exists); })
      .catch(() => { if (active) setHasBackup(false); });
    return () => { active = false; };
  }, [zoomPhoto, photoVersion, checkBackupFn]);

  const applyEdit = async (fn: (a: { data: { path: string } }) => Promise<unknown>, successMsg: string) => {
    if (!zoomPhoto) return;
    setEditing(true);
    try {
      await fn({ data: { path: zoomPhoto } });
      const nextPhotoVersion = Date.now();
      localStorage.setItem("photo-refresh-version", String(nextPhotoVersion));
      setPhotoVersion(nextPhotoVersion);
      qc.invalidateQueries({ queryKey: ["minerals", id] });
      qc.invalidateQueries({ queryKey: ["minerals"] });
      qc.invalidateQueries({ queryKey: ["thumb-urls"] });
      toast.success(successMsg);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bearbeitung fehlgeschlagen");
    } finally {
      setEditing(false);
    }
  };

  const onBlacken = () => applyEdit(blackenFn, "Hintergrund geschwärzt");
  const onStudio = () => applyEdit(studioFn, "Studio-Hintergrund angewendet");

  const onRestore = () => applyEdit(restoreFn, "Original wiederhergestellt");

  const { data: m, isLoading } = useQuery({
    queryKey: ["minerals", id],
    queryFn: () => getMineral(id),
  });

  const { data: videoUrls } = useQuery({
    queryKey: ["mineral-videos", id, m?.video_paths],
    queryFn: () => getVideoUrls(m?.video_paths ?? []),
    enabled: !!m && (m?.video_paths?.length ?? 0) > 0,
  });

  const { data: photoThumbUrls } = useQuery({
    queryKey: ["mineral-photo-thumbs", id, m?.photo_paths, photoVersion],
    queryFn: () => getPhotoThumbUrls(m?.photo_paths ?? [], 600),
    enabled: !!m && (m?.photo_paths?.length ?? 0) > 0,
    staleTime: 50 * 60 * 1000,
  });

  const { data: uvThumbUrls } = useQuery({
    queryKey: ["mineral-uv-thumbs", id, m?.uv_photos, photoVersion],
    queryFn: () => getPhotoThumbUrls(m?.uv_photos ?? [], 600),
    enabled: !!m && (m?.uv_photos?.length ?? 0) > 0,
    staleTime: 50 * 60 * 1000,
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
      toast.success("Etikett-PDF heruntergeladen");
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
      toast.success("QR-Code-PDF heruntergeladen");
    } catch {
      toast.error("QR-Code konnte nicht erstellt werden");
    } finally {
      setBusy(false);
    }
  };

  const onPresent = async () => {
    if (!m || m.photo_paths.length === 0) return;
    setPresentLoading(true);
    try {
      // Prefer the pre-edit ORIGINAL backup (up to 2000px) over the
      // studio-edited file (capped at 1024px by the AI) for maximum sharpness.
      const url = await getOriginalPhotoUrl(m.photo_paths[0]);
      const versioned = `${url}${url.includes("?") ? "&" : "?"}v=${photoVersion}`;
      setPresentBaseUrl(versioned);
      setPresentUrl(versioned);
      setSharpened(false);
      try { await document.documentElement.requestFullscreen?.(); } catch { /* ignore */ }
    } catch {
      toast.error("Foto konnte nicht geladen werden");
    } finally {
      setPresentLoading(false);
    }
  };

  const closePresent = () => {
    setPresentUrl(null);
    setPresentBaseUrl(null);
    setSharpened(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  const toggleSharpen = async () => {
    if (!presentBaseUrl) return;
    if (sharpened) {
      setPresentUrl(presentBaseUrl);
      setSharpened(false);
      return;
    }
    setSharpening(true);
    try {
      const sharp = await sharpenImageUrl(presentBaseUrl, 0.6);
      setPresentUrl(sharp);
      setSharpened(true);
    } catch {
      toast.error("Schärfen fehlgeschlagen");
    } finally {
      setSharpening(false);
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

      {/* Katalog-Ansicht: großes Foto auf schwarz + Museums-Tafel */}
      <section className="overflow-hidden rounded-xl border border-primary/20 bg-black shadow-2xl">
        <div className="grid gap-0 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {m.photo_paths.length > 0 ? (
            <button
              type="button"
              onClick={() => { setZoomIsUv(false); setZoomPhoto(m.photo_paths[0]); }}
              className="group relative block cursor-zoom-in bg-black focus:outline-none"
              aria-label="Foto vergrößern"
            >
              <PhotoThumb
                path={m.photo_paths[0]}
                url={photoThumbUrls?.[0] ?? null}
                className="aspect-square w-full md:aspect-[4/5] md:h-full"
                version={photoVersion}
                trim
              />
            </button>
          ) : (
            <div className="aspect-square w-full bg-black md:aspect-[4/5]" />
          )}

          <div className="flex flex-col justify-center gap-4 bg-black px-6 py-8 text-neutral-100 md:px-8 md:py-10">
            <p className="smallcaps text-[13px] text-primary">
              {CATEGORY_LABEL[m.category]} · Nr. {formatCollectionNumber(m.collection_number, m.category)}
              {m.custom_number ? ` · ${m.custom_number}` : ""}
            </p>
            <h1 className="font-serif text-4xl italic leading-[1.05] tracking-tight text-neutral-50 md:text-5xl">
              {m.mineral_name}
            </h1>
            <hr className="gold-rule w-24" aria-hidden />
            <dl className="font-serif text-[15px] leading-relaxed text-neutral-200">
              {m.category === "mineral" && m.chemical_formula && (
                <CatalogRow label="Formel">
                  <FormulaText value={m.chemical_formula} />
                </CatalogRow>
              )}
              {m.category === "mineral" && m.hardness && (
                <CatalogRow label="Härte">{m.hardness} <span className="text-neutral-400">Mohs</span></CatalogRow>
              )}
              {m.category === "rock" && m.origin && (
                <CatalogRow label="Ursprung">{m.origin}</CatalogRow>
              )}
              {m.category === "fossil" && m.era && (
                <CatalogRow label="Zeitalter">{m.era}</CatalogRow>
              )}
              {m.size && <CatalogRow label="Maße">{m.size}</CatalogRow>}
              {(m.location || m.country) && (
                <CatalogRow label="Fundort">
                  {[m.location, m.country].filter(Boolean).join(", ")}
                </CatalogRow>
              )}
              {m.collection_name && <CatalogRow label="Sammlung">{m.collection_name}</CatalogRow>}
              {(m.storage_floor || m.storage_cabinet || m.storage_shelf) && (
                <CatalogRow label="Ort">
                  {[
                    m.storage_floor ? `Etage ${m.storage_floor}` : null,
                    m.storage_cabinet ? `Schrank ${m.storage_cabinet}` : null,
                    m.storage_shelf ? `Ebene ${m.storage_shelf}` : null,
                  ].filter(Boolean).join(" · ")}
                </CatalogRow>
              )}
            </dl>
            {m.radioactive && (
              <p className="inline-flex w-fit items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-400">
                ☢ radioaktiv
              </p>
            )}
          </div>
        </div>

        {m.photo_paths.length > 1 && (
          <div className="grid grid-cols-4 gap-1 border-t border-primary/10 bg-black p-1 sm:grid-cols-6">
            {m.photo_paths.slice(1).map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => { setZoomIsUv(false); setZoomPhoto(p); }}
                className="block cursor-zoom-in overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <PhotoThumb
                  path={p}
                  url={photoThumbUrls?.[i + 1] ?? null}
                  className="aspect-square w-full"
                  version={photoVersion}
                  trim
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {m.uv_photos && m.uv_photos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-400">
            Unter UV-Licht
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-black p-2">
            {m.uv_photos.map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => { setZoomIsUv(true); setZoomPhoto(p); }}
                className="relative block cursor-zoom-in overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <PhotoThumb
                  path={p}
                  url={uvThumbUrls?.[i] ?? null}
                  className="aspect-square w-full"
                  version={photoVersion}
                />
                <span className="pointer-events-none absolute left-1 top-1 rounded bg-purple-600/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {m.uv_types?.[i]?.trim() || "UV"}
                </span>
              </button>
            ))}
          </div>
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

      <dl className="space-y-4 rounded-xl border bg-card p-4">
        {m.category === "mineral" && (
          <div className="space-y-2">
            <dt className="smallcaps text-[13px] text-primary">Hauptmineral</dt>
            <hr className="gold-rule w-16" aria-hidden />
            <FormulaRow label="Chemische Formel" value={m.chemical_formula} />
            <DataRow label="Härte (Mohs)" value={m.hardness} />
          </div>
        )}
        {m.category === "rock" && <DataRow label="Ursprung" value={m.origin} />}

        <div className="space-y-2">
          <dt className="smallcaps text-[13px] text-primary">
            {m.category === "fossil" ? "Weitere Fossilien & Besonderheiten" : "Begleitmineralien"}
          </dt>
          <hr className="gold-rule w-16" aria-hidden />
          <DataRow
            label={m.category === "fossil" ? "Weitere Fossilien & Besonderheiten" : "Begleitmineralien"}
            value={m.companion_minerals}
          />
          {m.category === "mineral" && (
            <>
              <FormulaRow label="Chemische Formel" value={m.companion_formula} />
              <DataRow label="Härte (Mohs)" value={m.companion_hardness} />
            </>
          )}
        </div>

        <DataRow label="Größe" value={m.size} />
        <DataRow label="Besonders" value={m.notable} />
        <DataRow label="Land" value={m.country} />
        <DataRow label="Fundort" value={m.location} />
        {m.category === "fossil" && <DataRow label="Zeitalter" value={m.era} />}
        <DataRow label="Sammlung" value={m.collection_name} />
        <DataRow
          label="Wert"
          value={
            m.value != null
              ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(m.value)
              : null
          }
        />
        {(m.previous_owner || m.acquired_at || m.acquisition_type || m.acquisition_price != null) && (
          <div className="space-y-2">
            <dt className="smallcaps text-[13px] text-primary">Herkunft &amp; Erwerb</dt>
            <hr className="gold-rule w-16" aria-hidden />
            <DataRow label="Vorbesitzer" value={m.previous_owner} />
            <DataRow
              label="Erwerbsdatum"
              value={m.acquired_at ? new Date(m.acquired_at).toLocaleDateString("de-DE") : null}
            />
            <DataRow label="Erwerbsart" value={m.acquisition_type} />
            <DataRow
              label="Erwerbspreis"
              value={
                m.acquisition_price != null
                  ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(m.acquisition_price)
                  : null
              }
            />
          </div>
        )}
        {m.description && (
          <div className="space-y-2">
            <dt className="smallcaps text-[13px] text-primary">Beschreibung</dt>
            <hr className="gold-rule w-16" aria-hidden />
            <dd className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
              {m.description}
            </dd>
          </div>
        )}
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
        {m.photo_paths.length > 0 && (
          <Button
            size="lg"
            variant="default"
            className="h-14 gap-2 text-base sm:col-span-2"
            onClick={onPresent}
            disabled={presentLoading}
          >
            {presentLoading ? <Loader2 className="size-5 animate-spin" /> : <Maximize2 className="size-5" />}
            Präsentationsmodus
          </Button>
        )}
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
          <QrCode className="size-5" /> QR-Code (8 mm)
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-14 w-full gap-2 text-base">
          <Link to="/fund/$id/bearbeiten" params={{ id: m.id }}>
            <Pencil className="size-5" /> Bearbeiten
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-14 w-full gap-2 text-base">
          <Link to="/neu" search={{ from: m.id }}>
            <Copy className="size-5" /> Duplizieren (nur neue Fotos)
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
          <div
            className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="sm" onClick={onBlacken} disabled={editing} className="gap-2">
              {editing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Schwarz
            </Button>
            {!zoomIsUv && (
              <Button size="sm" onClick={onStudio} disabled={editing} className="gap-2">
                {editing ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
                Studio-Hintergrund
              </Button>
            )}
            {hasBackup && (
              <Button size="sm" variant="secondary" onClick={onRestore} disabled={editing} className="gap-2">
                <RotateCcw className="size-4" /> Original
              </Button>
            )}
            {!zoomIsUv && (
              <Button size="sm" variant="secondary" onClick={() => setMeasuring(true)} className="gap-2">
                <Ruler className="size-4" /> Messen
              </Button>
            )}
          </div>
          {zoomUrl ? (
            <ZoomablePhoto src={zoomUrl} alt="Vergrößertes Foto" />
          ) : (
            <Loader2 className="size-10 animate-spin text-white" />
          )}
          {measuring && zoomUrl && m && (
            <MeasureDialog
              src={zoomUrl}
              onClose={() => setMeasuring(false)}
              onApply={async (sizeText) => {
                await updateMineral(m.id, {
                  mineral_name: m.mineral_name,
                  companion_minerals: m.companion_minerals,
                  location: m.location,
                  country: m.country,
                  collection_name: m.collection_name,
                  photo_paths: m.photo_paths,
                  category: m.category,
                  latitude: m.latitude,
                  longitude: m.longitude,
                  value: m.value,
                  chemical_formula: m.chemical_formula,
                  video_paths: m.video_paths,
                  hardness: m.hardness,
                  size: sizeText,
                  era: m.era,
                  origin: m.origin,
                  notable: m.notable,
                  uv_photos: m.uv_photos ?? [],
                  uv_types: m.uv_types ?? [],
                  companion_formula: m.companion_formula ?? null,
                  companion_hardness: m.companion_hardness ?? null,
                  radioactive: m.radioactive ?? false,
                  custom_number: m.custom_number ?? null,
                  storage_floor: m.storage_floor ?? null,
                  storage_cabinet: m.storage_cabinet ?? null,
                  storage_shelf: m.storage_shelf ?? null,
                  previous_owner: m.previous_owner ?? null,
                  acquired_at: m.acquired_at ?? null,
                  acquisition_type: m.acquisition_type ?? null,
                  acquisition_price: m.acquisition_price ?? null,
                  description: m.description ?? null,
                });
                qc.invalidateQueries({ queryKey: ["minerals", m.id] });
                qc.invalidateQueries({ queryKey: ["minerals"] });
                toast.success(`Größe gespeichert: ${sizeText}`);
              }}
            />
          )}
        </div>
      )}

      {presentUrl && (
        <div
          role="dialog"
          aria-label="Präsentationsmodus"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black"
          onClick={closePresent}
        >
          <button
            type="button"
            aria-label="Schließen"
            onClick={(e) => { e.stopPropagation(); closePresent(); }}
            className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-2 text-foreground shadow"
          >
            <X className="size-5" />
          </button>
          <div className="h-full w-full" onClick={(e) => e.stopPropagation()}>
            <ZoomablePhoto src={presentUrl} alt="Präsentation" />
          </div>
          <div
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant={sharpened ? "default" : "secondary"}
              onClick={toggleSharpen}
              disabled={sharpening}
              className="gap-2"
            >
              {sharpening ? <Loader2 className="size-4 animate-spin" /> : <Focus className="size-4" />}
              {sharpened ? "Schärfen aus" : "Schärfen"}
            </Button>
          </div>
        </div>
      )}
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

function CatalogRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 border-b border-primary/10 py-1.5 last:border-b-0">
      <dt className="text-[10px] font-sans font-semibold uppercase tracking-[0.24em] text-primary/80">
        {label}
      </dt>
      <dd className="text-neutral-100">{children}</dd>
    </div>
  );
}
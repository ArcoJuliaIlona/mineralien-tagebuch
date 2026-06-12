import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, ArrowLeft, CheckCircle2, AlertCircle, Square } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { PhotoThumb } from "@/components/PhotoThumb";
import { listMinerals } from "@/lib/minerals";
import { blackenPhoto } from "@/lib/photos-blacken.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/fotos-schwaerzen")({
  head: () => ({ meta: [{ title: "Fotohintergründe schwärzen" }] }),
  component: () => (
    <AuthGate>
      <AppShell>
        <BatchBlackenPage />
      </AppShell>
    </AuthGate>
  ),
});

type Status = "pending" | "running" | "done" | "error";

function BatchBlackenPage() {
  const { data: minerals = [], isLoading } = useQuery({
    queryKey: ["minerals"],
    queryFn: listMinerals,
  });

  const allPaths = useMemo(
    () =>
      Array.from(
        new Set(minerals.flatMap((m) => m.photo_paths ?? []).filter(Boolean)),
      ),
    [minerals],
  );

  const [status, setStatus] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [version, setVersion] = useState(0);
  const blackenFn = useServerFn(blackenPhoto);

  const done = Object.values(status).filter((s) => s === "done").length;
  const failed = Object.values(status).filter((s) => s === "error").length;
  const total = allPaths.length;

  const runAll = async () => {
    if (running || allPaths.length === 0) return;
    setRunning(true);
    const pending = allPaths.filter((p) => status[p] !== "done");
    const init: Record<string, Status> = { ...status };
    pending.forEach((p) => (init[p] = "pending"));
    setStatus(init);
    setErrors({});

    for (const path of pending) {
      setStatus((s) => ({ ...s, [path]: "running" }));
      try {
        await blackenFn({ data: { path } });
        setStatus((s) => ({ ...s, [path]: "done" }));
        setVersion((v) => v + 1);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setStatus((s) => ({ ...s, [path]: "error" }));
        setErrors((er) => ({ ...er, [path]: msg }));
      }
    }
    setRunning(false);
    toast.success("Stapelverarbeitung beendet");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/" aria-label="Zurück">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="font-serif text-2xl">Fotohintergründe schwärzen</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Alle bestehenden Fotos werden per KI freigestellt und auf reinem Schwarz
        gespeichert. Die Originale werden ersetzt – das lässt sich nicht
        rückgängig machen.
      </p>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isLoading ? "Lade…" : `${total} Fotos insgesamt`}
          </span>
          <span className="font-medium">
            {done} fertig{failed > 0 ? ` · ${failed} Fehler` : ""}
          </span>
        </div>
        <Button
          size="lg"
          className="h-12 w-full gap-2 text-base"
          onClick={runAll}
          disabled={running || total === 0}
        >
          {running ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Sparkles className="size-5" />
          )}
          {running
            ? `Verarbeite… (${done}/${total})`
            : done === total && total > 0
            ? "Alle erneut bearbeiten"
            : `Alle schwärzen (${total})`}
        </Button>
      </div>

      {allPaths.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {allPaths.map((p) => {
            const s = status[p];
            return (
              <div key={p} className="relative">
                <PhotoThumb
                  key={`${p}-${version}`}
                  path={p}
                  className="aspect-square w-full"
                />
                {s === "running" && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/60">
                    <Loader2 className="size-6 animate-spin text-white" />
                  </div>
                )}
                {s === "done" && (
                  <div className="absolute right-1 top-1 rounded-full bg-emerald-600 p-1 text-white shadow">
                    <CheckCircle2 className="size-4" />
                  </div>
                )}
                {s === "error" && (
                  <div
                    className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                    title={errors[p]}
                  >
                    <AlertCircle className="size-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
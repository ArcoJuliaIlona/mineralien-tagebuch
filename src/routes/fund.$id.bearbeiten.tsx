import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { MineralForm } from "@/components/MineralForm";
import { useAuth } from "@/lib/auth-context";
import { getMineral, updateMineral } from "@/lib/minerals";
import { toast } from "sonner";

export const Route = createFileRoute("/fund/$id/bearbeiten")({
  head: () => ({ meta: [{ title: "Fund bearbeiten" }] }),
  component: () => (
    <AuthGate>
      <AppShell>
        <EditPage />
      </AppShell>
    </AuthGate>
  ),
});

function EditPage() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: m, isLoading } = useQuery({
    queryKey: ["minerals", id],
    queryFn: () => getMineral(id),
  });

  if (!session) return null;
  if (isLoading || !m) return <p className="py-12 text-center text-muted-foreground">Lade…</p>;

  return (
    <div className="space-y-4">
      <Link
        to="/fund/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zurück
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Fund bearbeiten</h1>
      <MineralForm
        userId={session.user.id}
        submitLabel="Änderungen speichern"
        initial={{
          mineral_name: m.mineral_name,
          companion_minerals: m.companion_minerals,
          location: m.location,
          collection_name: m.collection_name,
          photo_paths: m.photo_paths,
          category: m.category,
          latitude: m.latitude,
          longitude: m.longitude,
          value: m.value,
          chemical_formula: m.chemical_formula,
          video_paths: m.video_paths,
          hardness: m.hardness,
          origin: m.origin,
          notable: m.notable,
        }}
        onSubmit={async (input) => {
          await updateMineral(m.id, input);
          qc.invalidateQueries({ queryKey: ["minerals"] });
          qc.invalidateQueries({ queryKey: ["minerals", m.id] });
          toast.success("Gespeichert");
          navigate({ to: "/fund/$id", params: { id: m.id } });
        }}
      />
    </div>
  );
}
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { MineralForm } from "@/components/MineralForm";
import { useAuth } from "@/lib/auth-context";
import { createMineral } from "@/lib/minerals";
import { toast } from "sonner";

export const Route = createFileRoute("/neu")({
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
  if (!session) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Neuer Fund</h1>
      <MineralForm
        userId={session.user.id}
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
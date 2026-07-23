import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Library } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PhotoThumb } from "@/components/PhotoThumb";
import { listMinerals } from "@/lib/minerals";

export const Route = createFileRoute("/vitrinen")({
  head: () => ({
    meta: [
      { title: "Vitrinen · Kuratierte Sammlungen" },
      { name: "description", content: "Kuratierte Sammlungen und Vitrinen." },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <VitrinenPage />
      </AppShell>
    </AuthGate>
  ),
});

function VitrinenPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["minerals"],
    queryFn: listMinerals,
  });

  const vitrines = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; cover: string | null }
    >();
    for (const m of items) {
      const name = (m.collection_name ?? "").trim();
      if (!name) continue;
      const cur = map.get(name) ?? { name, count: 0, cover: null };
      cur.count += 1;
      if (!cur.cover && m.photo_paths?.[0]) cur.cover = m.photo_paths[0];
      map.set(name, cur);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "de"),
    );
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-4">
        <div className="smallcaps text-[11px] tracking-[0.28em] text-muted-foreground">
          Kuratierte Sammlungen
        </div>
        <h1 className="font-serif text-3xl italic">Vitrinen</h1>
        <div className="gold-rule mt-3" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Lade…</div>
      ) : vitrines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          <Library className="mx-auto mb-2 size-6 opacity-60" />
          Noch keine Vitrinen angelegt. Trage im Formular eines Fundes einen
          Sammlungs-Namen unter <em>„Sammlung"</em> ein — er erscheint hier
          automatisch als Vitrine.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {vitrines.map((v) => (
            <li key={v.name}>
              <Link
                to="/vitrinen/$name"
                params={{ name: v.name }}
                className="group flex items-center gap-4 rounded-lg border border-border/60 bg-card p-3 transition hover:border-primary/60"
              >
                <PhotoThumb
                  path={v.cover ?? undefined}
                  className="size-20 shrink-0"
                  trim
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-xl italic">
                    {v.name}
                  </div>
                  <div className="smallcaps mt-1 text-[11px] tracking-[0.24em] text-muted-foreground">
                    {v.count} {v.count === 1 ? "Fundstück" : "Fundstücke"}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

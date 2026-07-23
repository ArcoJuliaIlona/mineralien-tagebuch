import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PhotoThumb } from "@/components/PhotoThumb";
import {
  listMinerals,
  formatCollectionNumber,
  CATEGORY_LABEL_PLURAL,
} from "@/lib/minerals";

export const Route = createFileRoute("/vitrinen/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `Vitrine · ${params.name}` },
      {
        name: "description",
        content: `Kuratierte Sammlung „${params.name}" aus dem Mineralien-Cabinet.`,
      },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <VitrineDetail />
      </AppShell>
    </AuthGate>
  ),
});

function VitrineDetail() {
  const { name } = Route.useParams();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["minerals"],
    queryFn: listMinerals,
  });

  const entries = useMemo(
    () =>
      items
        .filter((m) => (m.collection_name ?? "").trim() === name)
        .sort((a, b) =>
          a.mineral_name.localeCompare(b.mineral_name, "de", {
            sensitivity: "base",
          }),
        ),
    [items, name],
  );

  const counts = useMemo(() => {
    const c = { mineral: 0, fossil: 0, rock: 0 } as Record<string, number>;
    for (const e of entries) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, [entries]);

  return (
    <div className="space-y-6">
      <Link
        to="/vitrinen"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Alle Vitrinen
      </Link>

      <div className="border-b border-border/60 pb-4">
        <div className="smallcaps text-[11px] tracking-[0.28em] text-muted-foreground">
          Vitrine
        </div>
        <h1 className="font-serif text-3xl italic">{name}</h1>
        <div className="gold-rule mt-3" />
        <div className="smallcaps mt-3 text-[11px] tracking-[0.24em] text-muted-foreground">
          {(["mineral", "fossil", "rock"] as const)
            .filter((k) => counts[k])
            .map((k) => `${counts[k]} ${CATEGORY_LABEL_PLURAL[k]}`)
            .join(" · ") || "—"}
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Lade…</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Keine Fundstücke in dieser Vitrine.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((m) => (
            <li key={m.id}>
              <Link
                to="/fund/$id"
                params={{ id: m.id }}
                className="group block overflow-hidden rounded-lg border border-border/60 bg-card transition hover:border-primary/60"
              >
                <PhotoThumb
                  path={m.photo_paths?.[0]}
                  className="aspect-square w-full"
                  trim
                />
                <div className="space-y-1 p-2">
                  <div className="smallcaps text-[10px] tracking-[0.24em] text-muted-foreground">
                    Nr. {formatCollectionNumber(m.collection_number, m.category)}
                  </div>
                  <div className="truncate font-serif text-base italic">
                    {m.mineral_name}
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

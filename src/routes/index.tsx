import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Gem } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PhotoThumb } from "@/components/PhotoThumb";
import { listMinerals, CATEGORY_LABEL_PLURAL, type Category } from "@/lib/minerals";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Meine Mineraliensammlung" }],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <ListPage />
      </AppShell>
    </AuthGate>
  ),
});

const ALL = "__ALLE__";

function ListPage() {
  const { data: minerals = [], isLoading } = useQuery({
    queryKey: ["minerals"],
    queryFn: listMinerals,
  });

  const [search, setSearch] = useState("");
  const [filterName, setFilterName] = useState(ALL);
  const [filterLocation, setFilterLocation] = useState(ALL);
  const [tab, setTab] = useState<Category>("mineral");

  const inTab = useMemo(
    () => minerals.filter((m) => m.category === tab),
    [minerals, tab],
  );

  const names = useMemo(
    () => Array.from(new Set(inTab.map((m) => m.mineral_name).filter(Boolean))).sort(),
    [inTab],
  );
  const locations = useMemo(
    () => Array.from(new Set(inTab.map((m) => m.location || "").filter(Boolean))).sort(),
    [inTab],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inTab.filter((m) => {
      if (filterName !== ALL && m.mineral_name !== filterName) return false;
      if (filterLocation !== ALL && (m.location || "") !== filterLocation) return false;
      if (!q) return true;
      return [
        m.mineral_name,
        m.companion_minerals,
        m.location,
        m.collection_name,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [inTab, search, filterName, filterLocation]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Meine Sammlung</h1>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as Category); setFilterName(ALL); setFilterLocation(ALL); }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mineral">{CATEGORY_LABEL_PLURAL.mineral}</TabsTrigger>
          <TabsTrigger value="fossil">{CATEGORY_LABEL_PLURAL.fossil}</TabsTrigger>
          <TabsTrigger value="rock">{CATEGORY_LABEL_PLURAL.rock}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3 rounded-xl border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-10 text-base"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={filterName} onValueChange={setFilterName}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle {CATEGORY_LABEL_PLURAL[tab]}</SelectItem>
              {names.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Fundort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle Fundorte</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">Lade…</p>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={inTab.length > 0} category={tab} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => (
            <li key={m.id}>
              <Link
                to="/fund/$id"
                params={{ id: m.id }}
                className="flex items-center gap-4 rounded-xl border bg-card p-3 transition hover:bg-accent/40 active:scale-[0.99]"
              >
                <PhotoThumb path={m.photo_paths[0]} className="h-20 w-20 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{m.mineral_name}</p>
                  {m.location && (
                    <p className="truncate text-sm text-muted-foreground">{m.location}</p>
                  )}
                  {m.collection_name && (
                    <p className="truncate text-xs text-muted-foreground/80">
                      Sammlung: {m.collection_name}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card py-16 text-center">
      <Gem className="size-12 text-primary/60" />
      <p className="text-lg font-medium">
        {hasAny ? "Keine Treffer für deine Suche." : "Noch keine Funde."}
      </p>
      {!hasAny && (
        <Link to="/neu">
          <Button size="lg" className="h-12 gap-2 text-base">
            <Plus className="size-5" /> Ersten Fund anlegen
          </Button>
        </Link>
      )}
    </div>
  );
}

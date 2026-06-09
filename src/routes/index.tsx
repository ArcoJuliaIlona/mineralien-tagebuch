import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Gem } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PhotoThumb } from "@/components/PhotoThumb";
import { listMinerals, CATEGORY_LABEL_PLURAL, formatCollectionNumber, type Category } from "@/lib/minerals";
import { getPhotoUrls } from "@/lib/photos";
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
  component: () => {
    const [tab, setTab] = useState<TabValue>("mineral");
    const newButtonLabel = tab === "fossil" ? "Neues Fossil" : tab === "rock" ? "Neues Gestein" : "Neues Mineral";
    const newCategory: Category = tab === "fossil" ? "fossil" : tab === "rock" ? "rock" : "mineral";
    return (
      <AuthGate>
        <AppShell newLabel={newButtonLabel} newSearch={{ category: newCategory }}>
          <ListPage tab={tab} setTab={setTab} newCategory={newCategory} />
        </AppShell>
      </AuthGate>
    );
  },
});

const ALL = "__ALLE__";
const ALL_TAB = "__ALL__";
type TabValue = Category | typeof ALL_TAB;

function ListPage({ tab, setTab, newCategory }: { tab: TabValue; setTab: (v: TabValue) => void; newCategory: Category }) {
  const { data: minerals = [], isLoading } = useQuery({
    queryKey: ["minerals"],
    queryFn: listMinerals,
  });

  const thumbPaths = useMemo(
    () =>
      Array.from(
        new Set(minerals.map((m) => m.photo_paths[0]).filter(Boolean) as string[]),
      ),
    [minerals],
  );

  const { data: thumbUrlMap } = useQuery({
    queryKey: ["thumb-urls", thumbPaths],
    queryFn: async () => {
      const urls = await getPhotoUrls(thumbPaths);
      const map: Record<string, string> = {};
      thumbPaths.forEach((p, i) => {
        map[p] = urls[i] ?? "";
      });
      return map;
    },
    enabled: thumbPaths.length > 0,
    staleTime: 50 * 60 * 1000,
  });

  const [search, setSearch] = useState("");
  const [filterName, setFilterName] = useState(ALL);
  const [filterLocation, setFilterLocation] = useState(ALL);
  const [tab, setTab] = useState<TabValue>("mineral");
  const [showValue, setShowValue] = useState(false);

  const inTab = useMemo(
    () => (tab === ALL_TAB ? minerals : minerals.filter((m) => m.category === tab)),
    [minerals, tab],
  );

  const totalValue = useMemo(
    () => inTab.reduce((sum, m) => sum + (m.value ?? 0), 0),
    [inTab],
  );
  const formatEUR = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

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

  const categoryLabel = tab === ALL_TAB ? "Objekte" : CATEGORY_LABEL_PLURAL[tab as Category];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Meine Sammlung</h1>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as TabValue); setFilterName(ALL); setFilterLocation(ALL); }}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mineral">{CATEGORY_LABEL_PLURAL.mineral}</TabsTrigger>
          <TabsTrigger value="fossil">{CATEGORY_LABEL_PLURAL.fossil}</TabsTrigger>
          <TabsTrigger value="rock">{CATEGORY_LABEL_PLURAL.rock}</TabsTrigger>
          <TabsTrigger value={ALL_TAB}>Alle</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {categoryLabel} gesamt
          </p>
          <p className="text-lg font-semibold">{inTab.length} Stück</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Gesamtwert</p>
          {showValue ? (
            <button
              type="button"
              onClick={() => setShowValue(false)}
              className="text-lg font-semibold text-primary"
            >
              {formatEUR(totalValue)}
            </button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowValue(true)}
              className="h-8"
            >
              Anzeigen
            </Button>
          )}
        </div>
      </div>

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
              <SelectItem value={ALL}>Alle {categoryLabel}</SelectItem>
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
                <PhotoThumb
                  path={m.photo_paths[0]}
                  url={m.photo_paths[0] ? thumbUrlMap?.[m.photo_paths[0]] ?? null : null}
                  className="h-20 w-20 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-lg font-semibold">
                      <span className="mr-2 font-mono text-sm text-muted-foreground">
                        #{formatCollectionNumber(m.collection_number, m.category)}
                      </span>
                      {m.mineral_name}
                    </p>
                    {m.value != null && (
                      <span className="shrink-0 text-sm font-medium text-primary">
                        {formatEUR(m.value)}
                      </span>
                    )}
                  </div>
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

function EmptyState({ hasAny, category }: { hasAny: boolean; category: TabValue }) {
  const label = category === ALL_TAB ? "Objekte" : CATEGORY_LABEL_PLURAL[category];
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card py-16 text-center">
      <Gem className="size-12 text-primary/60" />
      <p className="text-lg font-medium">
        {hasAny
          ? "Keine Treffer für deine Suche."
          : `Noch keine ${label}.`}
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

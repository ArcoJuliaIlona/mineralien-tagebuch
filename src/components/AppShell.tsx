import { Link, useNavigate } from "@tanstack/react-router";
import { Download, Gem, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";
import type { Category } from "@/lib/minerals";

export function AppShell({ children, newLabel = "Neu", newSearch }: { children: ReactNode; newLabel?: string; newSearch?: { category?: Category } }) {
  const { session } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/anmelden" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <Gem className="size-6 text-primary" />
            <span className="flex flex-col leading-none">
              <span className="font-serif text-2xl tracking-tight">Mineralien</span>
              <span className="mt-0.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Cabinet &amp; Tagebuch
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/export" aria-label="Daten-Export">
              <Button size="icon" variant="ghost" className="h-12 w-12">
                <Download className="size-5" />
              </Button>
            </Link>
            <Link to="/neu" search={newSearch}>
              <Button size="lg" className="h-12 gap-2 text-base">
                <Plus className="size-5" /> {newLabel}
              </Button>
            </Link>
            {session && (
              <Button
                size="icon"
                variant="ghost"
                onClick={logout}
                aria-label="Abmelden"
                className="h-12 w-12"
              >
                <LogOut className="size-5" />
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">{children}</main>
    </div>
  );
}
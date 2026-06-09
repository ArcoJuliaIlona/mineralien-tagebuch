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
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Gem className="size-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">Mineralien</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/export" aria-label="Daten-Export">
              <Button size="icon" variant="ghost" className="h-12 w-12">
                <Download className="size-5" />
              </Button>
            </Link>
            <Link to="/neu">
              <Button size="lg" className="h-12 gap-2 text-base">
                <Plus className="size-5" /> Neu
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
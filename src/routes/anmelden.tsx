import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/anmelden")({
  head: () => ({ meta: [{ title: "Anmelden – Mineraliensammlung" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error("Anmeldung fehlgeschlagen: " + error.message);
    navigate({ to: "/" });
  };

  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setBusy(false);
    if (error) return toast.error("Registrierung fehlgeschlagen: " + error.message);
    toast.success("Konto erstellt. Bitte E-Mail bestätigen und dann anmelden.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (r.error) toast.error("Google-Anmeldung fehlgeschlagen");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Gem className="size-12 text-primary" />
          <h1 className="text-2xl font-bold">Mineraliensammlung</h1>
          <p className="text-sm text-muted-foreground">
            Melde dich an, um deine Funde zu verwalten.
          </p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid h-12 w-full grid-cols-2">
            <TabsTrigger value="signin" className="h-10 text-base">Anmelden</TabsTrigger>
            <TabsTrigger value="signup" className="h-10 text-base">Registrieren</TabsTrigger>
          </TabsList>

          {(["signin", "signup"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor={`email-${tab}`} className="text-base">E-Mail</Label>
                <Input
                  id={`email-${tab}`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pw-${tab}`} className="text-base">Passwort</Label>
                <Input
                  id={`pw-${tab}`}
                  type="password"
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <Button
                size="lg"
                className="h-12 w-full text-base"
                disabled={busy || !email || !password}
                onClick={tab === "signin" ? signIn : signUp}
              >
                {tab === "signin" ? "Anmelden" : "Konto erstellen"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">oder</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full text-base"
          onClick={google}
        >
          Mit Google anmelden
        </Button>
      </div>
    </div>
  );
}
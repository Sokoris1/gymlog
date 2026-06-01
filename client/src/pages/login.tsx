import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { lang, setLang } = useLang();
  const { toast } = useToast();

  const handleLogin = async (u?: string) => {
    const name = (u ?? username).trim();
    if (!name) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username: name });
      const data = await res.json();
      if (data.user) login(data.user.id, data.user);
    } catch {
      toast({ title: t("login.loginFailed", lang), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Lang toggle */}
      <div className="absolute top-5 right-5">
        <button
          data-testid="button-lang-toggle"
          onClick={() => setLang(lang === "ru" ? "en" : "ru")}
          className="px-3 py-1.5 rounded-xl bg-card border border-card-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {lang === "ru" ? "EN" : "RU"}
        </button>
      </div>

      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
            <rect x="4" y="17" width="6" height="6" rx="2" fill="hsl(var(--primary))" />
            <rect x="30" y="17" width="6" height="6" rx="2" fill="hsl(var(--primary))" />
            <rect x="2" y="14" width="4" height="12" rx="1.5" fill="hsl(var(--primary))" opacity="0.5" />
            <rect x="34" y="14" width="4" height="12" rx="1.5" fill="hsl(var(--primary))" opacity="0.5" />
            <rect x="10" y="16" width="20" height="8" rx="2" fill="hsl(var(--primary))" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">GymLog</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("login.subtitle", lang)}</p>
        </div>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <Input
            data-testid="input-username"
            placeholder={t("login.placeholder", lang)}
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="h-12 text-base bg-card border-card-border"
          />
          <Button
            data-testid="button-login"
            className="w-full h-12 font-semibold"
            onClick={() => handleLogin()}
            disabled={loading || !username.trim()}
          >
            {loading ? t("login.loading", lang) : t("login.continue", lang)}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground">{t("login.orTryDemo", lang)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            data-testid="button-demo-alex"
            variant="outline"
            className="h-10 text-sm border-border"
            onClick={() => handleLogin("alexp")}
            disabled={loading}
          >
            {t("login.demoAlex", lang)}
          </Button>
          <Button
            data-testid="button-demo-maria"
            variant="outline"
            className="h-10 text-sm border-border"
            onClick={() => handleLogin("mvolkova")}
            disabled={loading}
          >
            {t("login.demomaria", lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}

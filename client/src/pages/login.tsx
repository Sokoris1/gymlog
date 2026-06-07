import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useLang } from "@/App";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

type Mode = "check" | "login" | "register" | "set-password";

const Logo = () => (
  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
    <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
      <rect x="4" y="17" width="6" height="6" rx="2" fill="hsl(var(--primary))" />
      <rect x="30" y="17" width="6" height="6" rx="2" fill="hsl(var(--primary))" />
      <rect x="2" y="14" width="4" height="12" rx="1.5" fill="hsl(var(--primary))" opacity="0.5" />
      <rect x="34" y="14" width="4" height="12" rx="1.5" fill="hsl(var(--primary))" opacity="0.5" />
      <rect x="10" y="16" width="20" height="8" rx="2" fill="hsl(var(--primary))" />
    </svg>
  </div>
);

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("check");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { lang, setLang } = useLang();
  const { toast } = useToast();

  const ru = lang === "ru";

  const labels = {
    subtitle:      ru ? "Дневник тренировок" : "Training Diary",
    usernamePh:    ru ? "Никнейм" : "Username",
    namePh:        ru ? "Имя (необязательно)" : "Name (optional)",
    passwordPh:    ru ? "Пароль" : "Password",
    confirmPh:     ru ? "Подтвердите пароль" : "Confirm password",
    continue:      ru ? "Продолжить" : "Continue",
    loginBtn:      ru ? "Войти" : "Log in",
    registerBtn:   ru ? "Зарегистрироваться" : "Create account",
    setPassBtn:    ru ? "Установить пароль" : "Set password",
    loading:       ru ? "Загрузка..." : "Loading...",
    backToLogin:   ru ? "← Назад" : "← Back",
    noAccount:     ru ? "Нет аккаунта? " : "No account? ",
    hasAccount:    ru ? "Уже есть аккаунт? " : "Have an account? ",
    signUp:        ru ? "Зарегистрироваться" : "Sign up",
    signIn:        ru ? "Войти" : "Sign in",
    loginTitle:    ru ? "Вход" : "Sign in",
    registerTitle: ru ? "Регистрация" : "Create account",
    setPassTitle:  ru ? "Установите пароль" : "Set a password",
    setPassDesc:   ru
      ? "Ваш аккаунт найден, но пароль ещё не установлен. Придумайте пароль для защиты аккаунта."
      : "Your account was found, but has no password yet. Set one to protect it.",
  };

  const reset = () => {
    setMode("check");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
  };

  // Step 1: check if username exists
  const handleCheck = async () => {
    const u = username.trim();
    if (!u) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/check", { username: u });
      const data = await res.json();
      if (!data.exists) {
        setMode("register");
      } else if (!data.hasPassword) {
        setMode("set-password");
      } else {
        setMode("login");
      }
    } catch {
      toast({ title: ru ? "Ошибка сервера" : "Server error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 2a: login
  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username: username.trim(), password });
      const data = await res.json();
      if (data.user) {
        login(data.user.id, data.user);
      } else if (data.error === "wrong_credentials") {
        toast({ title: ru ? "Неверный пароль" : "Wrong password", variant: "destructive" });
      } else {
        toast({ title: ru ? "Ошибка входа" : "Login failed", variant: "destructive" });
      }
    } catch {
      toast({ title: ru ? "Ошибка сервера" : "Server error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: register
  const handleRegister = async () => {
    if (!password) return;
    if (password !== confirmPassword) {
      toast({ title: ru ? "Пароли не совпадают" : "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: ru ? "Пароль минимум 6 символов" : "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", {
        username: username.trim(),
        name: displayName.trim() || username.trim(),
        password,
      });
      const data = await res.json();
      if (data.user) {
        login(data.user.id, data.user);
      } else if (data.error === "username_taken") {
        toast({ title: ru ? "Этот никнейм уже занят" : "Username already taken", variant: "destructive" });
        reset();
      } else {
        toast({ title: ru ? "Ошибка регистрации" : "Registration failed", variant: "destructive" });
      }
    } catch {
      toast({ title: ru ? "Ошибка сервера" : "Server error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 2c: set password for existing account without one
  const handleSetPassword = async () => {
    if (!password) return;
    if (password !== confirmPassword) {
      toast({ title: ru ? "Пароли не совпадают" : "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: ru ? "Пароль минимум 6 символов" : "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/set-password", { username: username.trim(), password });
      const data = await res.json();
      if (data.user) {
        login(data.user.id, data.user);
      } else {
        toast({ title: ru ? "Ошибка" : "Error", variant: "destructive" });
      }
    } catch {
      toast({ title: ru ? "Ошибка сервера" : "Server error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            if (mode === "login") handleLogin();
            else if (mode === "register") handleRegister();
            else if (mode === "set-password") handleSetPassword();
          }
        }}
        className="h-12 text-base bg-card border-card-border pr-11"
      />
      <button type="button" onClick={() => setShowPassword(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Lang toggle */}
      <div className="absolute top-5 right-5">
        <button onClick={() => setLang(lang === "ru" ? "en" : "ru")}
          className="px-3 py-1.5 rounded-xl bg-card border border-card-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
          {ru ? "EN" : "RU"}
        </button>
      </div>

      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <Logo />
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">GymLog</h1>
          <p className="text-muted-foreground text-sm mt-1">{labels.subtitle}</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">

        {/* ── STEP 1: Enter username ── */}
        {mode === "check" && (
          <>
            <div className="space-y-3">
              <Input
                data-testid="input-username"
                placeholder={labels.usernamePh}
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCheck()}
                className="h-12 text-base bg-card border-card-border"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <Button className="w-full h-12 font-semibold" onClick={handleCheck}
                disabled={loading || !username.trim()}>
                {loading ? labels.loading : labels.continue}
              </Button>
            </div>
          </>
        )}

        {/* ── STEP 2a: Login ── */}
        {mode === "login" && (
          <>
            <div className="bg-card border border-card-border rounded-2xl px-4 py-3 mb-1">
              <p className="text-xs text-muted-foreground">{ru ? "Никнейм" : "Username"}</p>
              <p className="font-semibold text-sm">@{username}</p>
            </div>
            <div className="space-y-3">
              <PasswordInput value={password} onChange={setPassword} placeholder={labels.passwordPh} />
              <Button className="w-full h-12 font-semibold" onClick={handleLogin}
                disabled={loading || !password}>
                {loading ? labels.loading : labels.loginBtn}
              </Button>
              <button onClick={reset} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                {labels.backToLogin}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2b: Register ── */}
        {mode === "register" && (
          <>
            <div className="bg-card border border-card-border rounded-2xl px-4 py-3 mb-1">
              <p className="text-xs text-muted-foreground">{ru ? "Никнейм" : "Username"}</p>
              <p className="font-semibold text-sm">@{username}</p>
            </div>
            <div className="space-y-3">
              <Input placeholder={labels.namePh} value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="h-12 text-base bg-card border-card-border" />
              <PasswordInput value={password} onChange={setPassword} placeholder={labels.passwordPh} />
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder={labels.confirmPh} />
              <Button className="w-full h-12 font-semibold" onClick={handleRegister}
                disabled={loading || !password || !confirmPassword}>
                {loading ? labels.loading : labels.registerBtn}
              </Button>
              <button onClick={reset} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                {labels.backToLogin}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2c: Set password (migration) ── */}
        {mode === "set-password" && (
          <>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 mb-1">
              <p className="text-sm font-medium text-primary mb-1">@{username}</p>
              <p className="text-xs text-muted-foreground">{labels.setPassDesc}</p>
            </div>
            <div className="space-y-3">
              <PasswordInput value={password} onChange={setPassword} placeholder={labels.passwordPh} />
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder={labels.confirmPh} />
              <Button className="w-full h-12 font-semibold" onClick={handleSetPassword}
                disabled={loading || !password || !confirmPassword}>
                {loading ? labels.loading : labels.setPassBtn}
              </Button>
              <button onClick={reset} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                {labels.backToLogin}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

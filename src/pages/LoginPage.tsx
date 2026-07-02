import { useState } from "react";
import { useAuth } from "../features/auth";
import { Loader2, Eye, EyeOff } from "lucide-react";

type Mode = "login" | "signup";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]         = useState<Mode>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const err = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (err) {
      // Translate common Supabase error messages
      if (err.includes("Invalid login credentials")) setError("Email ou senha incorretos.");
      else if (err.includes("User already registered")) setError("Este email já está cadastrado. Faça login.");
      else if (err.includes("Password should be at least")) setError("A senha deve ter pelo menos 6 caracteres.");
      else setError(err);
    } else if (mode === "signup") {
      setSuccess("Conta criada! Verifique seu email para confirmar, depois faça login.");
      setMode("login");
    }
    // On successful login, AuthProvider updates session and Root redirects automatically
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-medium tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "login" ? "Acesse sua conta" : "Crie sua conta"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="seu@email.com"
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="mínimo 6 caracteres"
                  className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-80 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
              <button
                onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setError(null); setSuccess(null); }}
                className="text-accent hover:underline font-medium"
              >
                {mode === "login" ? "Criar conta" : "Fazer login"}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Seus dados são privados e protegidos.
        </p>
      </div>
    </div>
  );
}

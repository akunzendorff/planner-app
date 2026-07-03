import { useState } from "react";
import { Outlet, NavLink } from "react-router";
import { CalendarDays, Target, LayoutDashboard, Wallet, Plane, LogOut, Loader2, Sun, Moon, Pencil, Check, X } from "lucide-react";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import { AuthProvider, useAuth } from "../features/auth";
import { CalendarProvider } from "../features/calendar/store";
import { FinanceProvider } from "../features/finance/store";
import { ExchangeProvider } from "../features/exchange/store";
import LoginPage from "../pages/LoginPage";

const NAV = [
  { to: "/",         label: "Dashboard",   icon: LayoutDashboard },
  { to: "/calendar", label: "Calendário",  icon: CalendarDays },
  { to: "/goals",    label: "Metas",       icon: Target },
  { to: "/finance",  label: "Finanças",    icon: Wallet },
  { to: "/exchange", label: "Intercâmbio", icon: Plane },
];

function AppShell() {
  const { user, loading, signOut, updateName } = useAuth();
  const { theme, setTheme } = useTheme();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const displayName = () => {
    const meta = user?.user_metadata;
    const raw = (typeof meta?.name === "string" ? meta.name : null) ?? user?.email?.split("@")[0] ?? "";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed) await updateName(trimmed);
    setEditingName(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <CalendarProvider>
      <FinanceProvider>
        <ExchangeProvider>
          <Toaster richColors position="bottom-left" />
          <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-20">
              <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center gap-4">
                <span className="text-lg font-semibold tracking-tight mr-2">
                  Planner
                </span>

                <nav className="flex items-center gap-0.5 bg-secondary rounded-lg p-1 overflow-x-auto flex-1">
                  {NAV.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === "/"}
                      className={({ isActive }) =>
                        `flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all whitespace-nowrap ${
                          isActive ? "bg-card text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                        }`
                      }
                    >
                      <Icon size={13} />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </nav>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {editingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={e => setNameDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                        className="w-28 px-2 py-1 text-xs rounded-md bg-secondary border border-border outline-none"
                      />
                      <button onClick={handleSaveName} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Check size={12} /></button>
                      <button onClick={() => setEditingName(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><X size={12} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNameDraft(displayName()); setEditingName(true); }}
                      title="Editar nome"
                      className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {displayName()}
                      <Pencil size={10} />
                    </button>
                  )}
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    title="Alternar tema"
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                  </button>
                  <button
                    onClick={signOut}
                    title="Sair"
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            </header>

            <Outlet />
          </div>
        </ExchangeProvider>
      </FinanceProvider>
    </CalendarProvider>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

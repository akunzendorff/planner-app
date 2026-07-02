import { Outlet, NavLink } from "react-router";
import { CalendarDays, Target, LayoutDashboard, Wallet, Plane, LogOut, Loader2, Sun, Moon } from "lucide-react";
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
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

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

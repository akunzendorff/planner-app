import { useNavigate } from "react-router";
import { format, addDays, isSameDay, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Clock, MapPin, Target, Plus, TrendingUp } from "lucide-react";
import { useAuth } from "../features/auth";
import { useStore } from "../features/calendar/store";

const TODAY = new Date(2026, 6, 2);

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function dayLabel(date: Date) {
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  return format(date, "EEEE, d MMM", { locale: ptBR });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getName(u: { email?: string; user_metadata?: Record<string, unknown> } | null) {
  const meta = u?.user_metadata;
  const raw = (typeof meta?.full_name === "string" ? meta.full_name : null) ?? (typeof meta?.name === "string" ? meta.name : null) ?? u?.email?.split("@")[0] ?? "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function DashboardPage() {
  const { events, goals } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const upcoming = events
    .filter((e) => e.date >= TODAY)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || timeToMinutes(a.time) - timeToMinutes(b.time))
    .slice(0, 7);

  const todayEvents = upcoming.filter((e) => isSameDay(e.date, TODAY));
  const nextEvents = upcoming.filter((e) => !isSameDay(e.date, TODAY));

  const totalTasks = goals.reduce((n, g) => n + g.tasks.length, 0);
  const doneTasks = goals.reduce((n, g) => n + g.tasks.filter((t) => t.done).length, 0);
  const overallPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  const weekAhead = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(TODAY, i);
    return { date: d, count: events.filter((e) => isSameDay(e.date, d)).length };
  });

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <div className="mb-10">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>
          {format(TODAY, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight">
          {greeting()}, {getName(user)}. ☀
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {todayEvents.length === 0
            ? "Nenhum evento hoje — dia livre."
            : `Você tem ${todayEvents.length} evento${todayEvents.length > 1 ? "s" : ""} hoje.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-10">
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-xs text-muted-foreground uppercase tracking-widest mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>
              Esta semana
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {weekAhead.map(({ date, count }) => {
                const active = isSameDay(date, TODAY);
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => navigate("/calendar")}
                    className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg transition-colors hover:bg-secondary/60 ${active ? "bg-secondary" : ""}`}
                  >
                    <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {format(date, "EEE", { locale: ptBR }).slice(0, 3)}
                    </span>
                    <span className={`text-sm font-medium ${active ? "text-accent" : "text-foreground"}`}>
                      {format(date, "d")}
                    </span>
                    <div className="flex gap-0.5 flex-wrap justify-center" style={{ minHeight: 8 }}>
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent/70" />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {todayEvents.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>Hoje</h2>
                <button onClick={() => navigate("/calendar")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  Ver calendário <ArrowRight size={11} />
                </button>
              </div>
              <div className="space-y-2">
                {todayEvents.map((e) => {
                  const linkedGoal = e.goalId ? goals.find((g) => g.id === e.goalId) : null;
                  return (
                    <div key={e.id} className="flex gap-3 items-start p-3.5 bg-card border border-border rounded-xl hover:border-border/70 transition-colors">
                      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{e.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                            <Clock size={10} />{e.time}
                          </span>
                          {e.location && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin size={10} />{e.location}
                            </span>
                          )}
                        </div>
                        {linkedGoal && (
                          <button
                            onClick={() => navigate(`/goals/${linkedGoal.id}`)}
                            className="flex items-center gap-1 mt-1.5 hover:underline"
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: linkedGoal.color }} />
                            <span className="text-[10px] text-muted-foreground">{linkedGoal.title}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {nextEvents.length > 0 && (
            <section>
              <h2 className="text-xs text-muted-foreground uppercase tracking-widest mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>Próximos eventos</h2>
              <div className="space-y-2">
                {nextEvents.slice(0, 4).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-3.5 py-2.5 bg-card border border-border rounded-xl hover:border-border/70 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{e.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 capitalize" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {dayLabel(e.date)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>Metas</h2>
            <button onClick={() => navigate("/goals")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              Ver todas <ArrowRight size={11} />
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                <TrendingUp size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">Progresso geral</p>
                <p className="text-xs text-muted-foreground">{doneTasks} de {totalTasks} tarefas</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${overallPct}%` }} />
            </div>
            <p className="text-right text-xs text-muted-foreground mt-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>{overallPct}%</p>
          </div>

          {goals.map((g) => {
            const done = g.tasks.filter((t) => t.done).length;
            const total = g.tasks.length;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            const daysLeft = g.deadline
              ? Math.ceil((new Date(g.deadline).getTime() - TODAY.getTime()) / 86400000)
              : null;
            return (
              <button
                key={g.id}
                onClick={() => navigate(`/goals/${g.id}`)}
                className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-border/70 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: g.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">{g.title}</p>
                    {daysLeft !== null && (
                      <p className={`text-[10px] mt-0.5 ${daysLeft < 7 ? "text-destructive" : "text-muted-foreground"}`} style={{ fontFamily: "'DM Mono', monospace" }}>
                        {daysLeft > 0 ? `${daysLeft}d restantes` : "prazo encerrado"}
                      </p>
                    )}
                  </div>
                  <ArrowRight size={13} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{done}/{total} tarefas</span>
                  <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{pct}%</span>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => navigate("/goals")}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl flex items-center justify-center gap-1.5 hover:bg-secondary/30 transition-all"
          >
            <Plus size={14} /> Nova meta
          </button>
        </aside>
      </div>
    </main>
  );
}

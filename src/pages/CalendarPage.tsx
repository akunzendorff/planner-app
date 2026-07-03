import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, Pencil, Target } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths,
  addWeeks, subWeeks, isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStore, type CalEvent } from "../features/calendar/store";

type View = "month" | "week";
type ModalState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; event: CalEvent };

const EVENT_COLORS = ["#C4581B", "#2C7A4B", "#3B6FA0", "#8B4BA8", "#A0522D", "#1A7A7A"];
const WEEK_DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const HOUR_HEIGHT = 64;

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function EventForm({
  initial, goals, onSave, onDelete, onClose, isEdit,
}: {
  initial: Omit<CalEvent, "id">;
  goals: ReturnType<typeof useStore>["goals"];
  onSave: (d: Omit<CalEvent, "id">) => void;
  onDelete?: () => void;
  onClose: () => void;
  isEdit: boolean;
}) {
  const [title, setTitle] = useState(initial.title);
  const [time, setTime] = useState(initial.time);
  const [location, setLocation] = useState(initial.location);
  const [color, setColor] = useState(initial.color);
  const [dateStr, setDateStr] = useState(format(initial.date, "yyyy-MM-dd"));
  const [goalId, setGoalId] = useState(initial.goalId ?? "");

  const submit = () => {
    if (!title.trim()) return;
    const [y, mo, d] = dateStr.split("-").map(Number);
    onSave({ title: title.trim(), time, location, color, date: new Date(y, mo - 1, d), goalId: goalId || undefined });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Título</label>
        <input type="text" value={title} autoFocus onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Nome do evento"
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-muted-foreground/50" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Data</label>
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all" style={{ fontFamily: "'DM Mono', monospace" }} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Horário</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all" style={{ fontFamily: "'DM Mono', monospace" }} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Local (opcional)</label>
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sala, endereço…"
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-muted-foreground/50" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Vincular a uma meta</label>
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all">
          <option value="">— Nenhuma meta —</option>
          {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>Cor</label>
        <div className="flex gap-2">
          {EVENT_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-card scale-110" : "hover:scale-105"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className={`flex gap-2 pt-1 ${isEdit ? "justify-between" : "justify-end"}`}>
        {isEdit && onDelete && (
          <button onClick={onDelete} className="px-3 py-2.5 text-sm rounded-lg text-destructive hover:bg-destructive/10 transition-colors">Excluir</button>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground">Cancelar</button>
          <button onClick={submit} disabled={!title.trim()}
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-80 disabled:opacity-30 transition-all">
            {isEdit ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { events, goals, eventsForDay, addEvent, updateEvent, deleteEvent } = useStore();
  const [view, setView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [prefillTime, setPrefillTime] = useState("09:00");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { calDays.push(d); d = addDays(d, 1); }

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const selectedEvents = eventsForDay(selectedDate);

  const goBack = () => view === "month" ? setCurrentDate(subMonths(currentDate, 1)) : setWeekAnchor(subWeeks(weekAnchor, 1));
  const goForward = () => view === "month" ? setCurrentDate(addMonths(currentDate, 1)) : setWeekAnchor(addWeeks(weekAnchor, 1));
  const goToday = () => { const t = new Date(); setCurrentDate(new Date()); setWeekAnchor(t); setSelectedDate(t); };
  const switchView = (v: View) => { if (v === "week") setWeekAnchor(selectedDate); setView(v); };

  const openAdd = (date?: Date, time?: string) => {
    if (date) setSelectedDate(date);
    if (time) setPrefillTime(time);
    setModal({ mode: "add" });
  };
  const openEdit = (ev: CalEvent) => setModal({ mode: "edit", event: ev });

  const saveEvent = (data: Omit<CalEvent, "id">) => {
    if (modal.mode === "add") addEvent(data);
    else if (modal.mode === "edit") updateEvent(modal.event.id, data);
    setSelectedDate(data.date);
    setModal({ mode: "closed" });
  };
  const handleDelete = () => {
    if (modal.mode === "edit") deleteEvent(modal.event.id);
    setModal({ mode: "closed" });
  };

  const modalInitial: Omit<CalEvent, "id"> = modal.mode === "edit"
    ? { ...modal.event }
    : { title: "", time: prefillTime, location: "", color: "#C4581B", date: selectedDate };

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: ptBR });
  const weekLabel = (() => {
    const we = addDays(weekStart, 6);
    return format(weekStart, "MMM", { locale: ptBR }) === format(we, "MMM", { locale: ptBR })
      ? `${format(weekStart, "d")}–${format(we, "d 'de' MMMM yyyy", { locale: ptBR })}`
      : `${format(weekStart, "d MMM", { locale: ptBR })} – ${format(we, "d MMM yyyy", { locale: ptBR })}`;
  })();
  const selectedLabel = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-10">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-medium capitalize tracking-tight">
              {view === "month" ? monthLabel : weekLabel}
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-1">
                {(["month", "week"] as View[]).map((v) => (
                  <button key={v} onClick={() => switchView(v)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${view === v ? "bg-card text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    {v === "month" ? "Mês" : "Semana"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={goBack} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><ChevronLeft size={16} /></button>
                <button onClick={goToday} className="px-2.5 py-1 text-xs rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>hoje</button>
                <button onClick={goForward} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><ChevronRight size={16} /></button>
              </div>
              <button onClick={() => openAdd()}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-80 transition-opacity">
                <Plus size={14} /><span className="hidden sm:inline">Novo</span>
              </button>
            </div>
          </div>

          {view === "month" && (
            <>
              <div className="grid grid-cols-7 mb-1">
                {WEEK_DAYS_SHORT.map((wd) => (
                  <div key={wd} className="text-center text-xs text-muted-foreground pb-2" style={{ fontFamily: "'DM Mono', monospace" }}>{wd}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 border-l border-t border-border rounded-lg overflow-hidden">
                {calDays.map((day, i) => {
                  const dayEvts = eventsForDay(day);
                  const inMonth = isSameMonth(day, currentDate);
                  const today = isToday(day);
                  const sel = isSameDay(day, selectedDate);
                  return (
                    <div key={i} onClick={() => setSelectedDate(day)}
                      className={`relative border-b border-r border-border min-h-[60px] sm:min-h-[80px] p-1.5 sm:p-2 transition-colors cursor-pointer
                        ${!inMonth ? "bg-background/40" : "bg-card hover:bg-secondary/40"}
                        ${sel && !today ? "bg-secondary" : ""}
                      `}>
                      <span className={`inline-flex w-6 h-6 sm:w-7 sm:h-7 items-center justify-center rounded-full text-xs sm:text-sm
                        ${today ? "bg-accent text-accent-foreground font-medium" : ""}
                        ${sel && !today ? "bg-primary text-primary-foreground" : ""}
                        ${!inMonth ? "text-muted-foreground/40" : !today && !sel ? "text-foreground" : ""}
                      `}>{format(day, "d")}</span>
                      <div className="mt-0.5 space-y-0.5 hidden sm:block">
                        {dayEvts.slice(0, 2).map((e) => (
                          <div key={e.id}
                            onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                            className="text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white font-medium cursor-pointer hover:brightness-90 transition-all flex items-center gap-1"
                            style={{ backgroundColor: e.color }}>
                            {e.goalId && <Target size={8} className="flex-shrink-0" />}
                            {e.title}
                          </div>
                        ))}
                        {dayEvts.length > 2 && <div className="text-[10px] text-muted-foreground pl-1">+{dayEvts.length - 2} mais</div>}
                      </div>
                      {dayEvts.length > 0 && (
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5 sm:hidden">
                          {dayEvts.slice(0, 3).map((e) => <div key={e.id} className="w-1 h-1 rounded-full" style={{ backgroundColor: e.color }} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {view === "week" && (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="grid border-b border-border" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                <div className="border-r border-border" />
                {weekDays.map((day, i) => {
                  const today = isToday(day);
                  const sel = isSameDay(day, selectedDate);
                  return (
                    <button key={i} onClick={() => setSelectedDate(day)}
                      className={`py-3 text-center border-r border-border last:border-r-0 transition-colors hover:bg-secondary/40 ${sel ? "bg-secondary/60" : ""}`}>
                      <div className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{WEEK_DAYS_SHORT[i]}</div>
                      <div className={`mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                        ${today ? "bg-accent text-accent-foreground" : sel ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                        {format(day, "d")}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "560px" }}>
                <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                  {HOURS.map((hour) => (
                    <div key={hour} className="absolute w-full grid border-b border-border/50"
                      style={{ gridTemplateColumns: "52px repeat(7, 1fr)", top: (hour - 7) * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                      <div className="border-r border-border flex items-start justify-end pr-2 pt-1">
                        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{String(hour).padStart(2, "0")}h</span>
                      </div>
                      {weekDays.map((day, ci) => (
                        <div key={ci} className="border-r border-border/50 last:border-r-0 cursor-pointer hover:bg-secondary/20 transition-colors"
                          onClick={() => openAdd(day, `${String(hour).padStart(2, "0")}:00`)} />
                      ))}
                    </div>
                  ))}
                  {weekDays.map((day, ci) =>
                    eventsForDay(day).map((evt) => {
                      const mins = timeToMinutes(evt.time);
                      if (mins < 7 * 60 || mins >= (7 + HOURS.length) * 60) return null;
                      const topPx = ((mins - 7 * 60) / 60) * HOUR_HEIGHT;
                      return (
                        <div key={evt.id} className="absolute rounded-md px-2 py-1 overflow-hidden cursor-pointer hover:brightness-95 transition-all shadow-sm group"
                          style={{ top: topPx + 2, height: HOUR_HEIGHT - 6, left: `calc(52px + ${ci} * (100% - 52px) / 7 + 3px)`, width: `calc((100% - 52px) / 7 - 6px)`, backgroundColor: evt.color, zIndex: 1 }}
                          onClick={(e) => { e.stopPropagation(); openEdit(evt); }}>
                          <div className="flex items-center gap-1">
                            {evt.goalId && <Target size={9} className="text-white/80 flex-shrink-0" />}
                            <p className="text-white text-[11px] font-medium leading-tight truncate">{evt.title}</p>
                          </div>
                          <p className="text-white/80 text-[10px] mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>{evt.time}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:pt-16">
          <div className="bg-card border border-border rounded-xl p-5 sticky top-24">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>Eventos</p>
                <h2 className="text-sm font-medium capitalize leading-snug">{selectedLabel}</h2>
              </div>
              <button onClick={() => openAdd()} className="w-7 h-7 flex items-center justify-center rounded-md bg-secondary hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Plus size={14} />
              </button>
            </div>
            {selectedEvents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Nenhum evento</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Clique em + para adicionar</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...selectedEvents].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)).map((e) => {
                  const linkedGoal = e.goalId ? goals.find((g) => g.id === e.goalId) : null;
                  return (
                    <div key={e.id} onClick={() => openEdit(e)}
                      className="group relative flex gap-3 p-3 rounded-lg bg-background border border-border hover:border-border/80 transition-all cursor-pointer">
                      <div className="w-1 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{e.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}><Clock size={10} />{e.time}</span>
                          {e.location && <span className="flex items-center gap-1 text-xs text-muted-foreground truncate"><MapPin size={10} />{e.location}</span>}
                        </div>
                        {linkedGoal && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: linkedGoal.color }} />
                            <span className="text-[10px] text-muted-foreground truncate">{linkedGoal.title}</span>
                          </div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center">
                        <Pencil size={12} className="text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {modal.mode !== "closed" && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setModal({ mode: "closed" })}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-medium">
                {modal.mode === "edit" ? "Editar evento" : "Novo evento"}
              </h3>
              <button onClick={() => setModal({ mode: "closed" })} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                <X size={14} />
              </button>
            </div>
            <EventForm initial={modalInitial} goals={goals} onSave={saveEvent}
              onDelete={modal.mode === "edit" ? handleDelete : undefined}
              onClose={() => setModal({ mode: "closed" })} isEdit={modal.mode === "edit"} />
          </div>
        </div>
      )}
    </main>
  );
}

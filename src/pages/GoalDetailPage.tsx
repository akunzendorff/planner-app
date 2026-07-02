import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, Plus, Check, Link2, Trash2, Pencil, X, CalendarDays,
} from "lucide-react";
import { useStore, type Goal } from "../features/calendar/store";

const GOAL_COLORS = ["#C4581B", "#2C7A4B", "#3B6FA0", "#8B4BA8", "#C4911B", "#1A7A7A"];

function GoalForm({
  initial, onSave, onClose,
}: {
  initial: Omit<Goal, "id" | "tasks">;
  onSave: (d: Omit<Goal, "id" | "tasks">) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [color, setColor] = useState(initial.color);
  const [deadline, setDeadline] = useState(initial.deadline ?? "");

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Título</label>
        <input type="text" value={title} autoFocus onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Descrição</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all resize-none" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Prazo</label>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all" style={{ fontFamily: "'DM Mono', monospace" }} />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>Cor</label>
        <div className="flex gap-2">
          {GOAL_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-card scale-110" : "hover:scale-105"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onClose} className="px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground">Cancelar</button>
        <button onClick={() => title.trim() && onSave({ title: title.trim(), description, color, deadline: deadline || undefined })}
          disabled={!title.trim()}
          className="px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-80 disabled:opacity-30 transition-all">
          Salvar
        </button>
      </div>
    </div>
  );
}

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goals, events, updateGoal, deleteGoal, toggleTask, addTask, linkTask, deleteTask } = useStore();

  const goal = goals.find((g) => g.id === id);
  const [editing, setEditing] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [linkingTaskId, setLinkingTaskId] = useState<string | null>(null);

  if (!goal) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-16 text-center">
        <p className="text-muted-foreground mb-4">Meta não encontrada.</p>
        <Link to="/goals" className="text-sm text-accent hover:underline">Voltar para metas</Link>
      </main>
    );
  }

  const done = goal.tasks.filter((t) => t.done).length;
  const total = goal.tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
    : null;

  const linkedEvents = events.filter((e) => e.goalId === goal.id);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      {/* Back */}
      <button onClick={() => navigate("/goals")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ChevronLeft size={15} /> Todas as metas
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-4 h-4 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: goal.color }} />
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {goal.title}
            </h1>
            {goal.description && (
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed max-w-xl">{goal.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {goal.deadline && (
                <span className={`text-xs flex items-center gap-1 ${daysLeft !== null && daysLeft < 7 ? "text-destructive" : "text-muted-foreground"}`} style={{ fontFamily: "'DM Mono', monospace" }}>
                  <CalendarDays size={11} />
                  Prazo: {format(new Date(goal.deadline), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {daysLeft !== null && ` (${daysLeft > 0 ? `${daysLeft}d restantes` : "encerrado"})`}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
          <Pencil size={13} /> Editar
        </button>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="font-medium">Progresso</span>
          <span className="text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{done}/{total} tarefas · {pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-6">
        {/* Tasks */}
        <section>
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Tarefas</h2>

          {goal.tasks.length === 0 && (
            <p className="text-sm text-muted-foreground mb-4">Nenhuma tarefa ainda. Adicione abaixo.</p>
          )}

          <div className="space-y-1.5 mb-4">
            {goal.tasks.map((task) => {
              const linkedEvent = task.eventId ? events.find((e) => e.id === task.eventId) : null;
              return (
                <div key={task.id} className="group flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors">
                  <button
                    onClick={() => toggleTask(goal.id, task.id)}
                    className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                      task.done ? "border-transparent" : "border-border hover:border-foreground/40"
                    }`}
                    style={{ backgroundColor: task.done ? goal.color : "transparent" }}
                  >
                    {task.done && <Check size={9} className="text-white" strokeWidth={3} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                    {linkedEvent && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: linkedEvent.color }} />
                        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {format(linkedEvent.date, "d MMM", { locale: ptBR })} · {linkedEvent.time} · {linkedEvent.title}
                        </span>
                      </div>
                    )}
                    {linkingTaskId === task.id && (
                      <select autoFocus
                        className="mt-2 w-full text-xs px-2 py-1.5 rounded-md bg-secondary border border-border focus:outline-none"
                        value={task.eventId ?? ""}
                        onChange={(e) => { linkTask(goal.id, task.id, e.target.value); setLinkingTaskId(null); }}
                        onBlur={() => setLinkingTaskId(null)}>
                        <option value="">— Nenhum evento —</option>
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {format(ev.date, "d/MM", { locale: ptBR })} {ev.time} · {ev.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setLinkingTaskId(linkingTaskId === task.id ? null : task.id)}
                      title="Vincular a evento"
                      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Link2 size={11} />
                    </button>
                    <button onClick={() => deleteTask(goal.id, task.id)}
                      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add task */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border focus-within:border-primary/30 transition-colors">
            <Plus size={13} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTaskTitle.trim()) {
                  addTask(goal.id, newTaskTitle.trim());
                  setNewTaskTitle("");
                }
              }}
              placeholder="Nova tarefa… pressione Enter"
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </section>

        {/* Linked events */}
        <aside>
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Eventos vinculados</h2>
          {linkedEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
              <p>Nenhum evento</p>
              <Link to="/calendar" className="text-xs text-accent hover:underline mt-1 block">Ir ao calendário</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedEvents
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((ev) => (
                  <div key={ev.id} className="flex gap-2.5 items-start p-3 bg-card border border-border rounded-lg">
                    <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 capitalize" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {format(ev.date, "d MMM", { locale: ptBR })} · {ev.time}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <button
            onClick={() => {
              deleteGoal(goal.id);
              navigate("/goals");
            }}
            className="mt-6 w-full py-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg border border-transparent hover:border-destructive/20 transition-colors"
          >
            Excluir meta
          </button>
        </aside>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setEditing(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>Editar meta</h3>
              <button onClick={() => setEditing(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                <X size={14} />
              </button>
            </div>
            <GoalForm
              initial={{ title: goal.title, description: goal.description, color: goal.color, deadline: goal.deadline }}
              onSave={(data) => { updateGoal(goal.id, data); setEditing(false); }}
              onClose={() => setEditing(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

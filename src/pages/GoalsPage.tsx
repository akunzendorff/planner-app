import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, X, ArrowRight, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStore, type Goal } from "../features/calendar/store";

const GOAL_COLORS = ["#C4581B", "#2C7A4B", "#3B6FA0", "#8B4BA8", "#C4911B", "#1A7A7A"];

function GoalForm({
  initial, onSave, onDelete, onClose, isEdit,
}: {
  initial: Omit<Goal, "id" | "tasks">;
  onSave: (d: Omit<Goal, "id" | "tasks">) => void;
  onDelete?: () => void;
  onClose: () => void;
  isEdit: boolean;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [color, setColor] = useState(initial.color);
  const [deadline, setDeadline] = useState(initial.deadline ?? "");

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Título da meta</label>
        <input type="text" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Lançar produto v2"
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-muted-foreground/50" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Descrição (opcional)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto e motivação…" rows={3}
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-muted-foreground/50 resize-none" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Prazo (opcional)</label>
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
      <div className={`flex gap-2 pt-1 ${isEdit ? "justify-between" : "justify-end"}`}>
        {isEdit && onDelete && (
          <button onClick={onDelete} className="px-3 py-2.5 text-sm rounded-lg text-destructive hover:bg-destructive/10 transition-colors">Excluir</button>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground">Cancelar</button>
          <button onClick={() => title.trim() && onSave({ title: title.trim(), description, color, deadline: deadline || undefined })}
            disabled={!title.trim()}
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-80 disabled:opacity-30 transition-all">
            {isEdit ? "Salvar" : "Criar meta"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useStore();
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ mode: "closed" } | { mode: "add" } | { mode: "edit"; goal: Goal }>({ mode: "closed" });

  const totalTasks = goals.reduce((n, g) => n + g.tasks.length, 0);
  const doneTasks = goals.reduce((n, g) => n + g.tasks.filter((t) => t.done).length, 0);

  const handleSave = (data: Omit<Goal, "id" | "tasks">) => {
    if (modal.mode === "add") {
      const g = addGoal(data);
      navigate(`/goals/${g.id}`);
    } else if (modal.mode === "edit") {
      updateGoal(modal.goal.id, data);
    }
    setModal({ mode: "closed" });
  };
  const handleDelete = () => {
    if (modal.mode === "edit") deleteGoal(modal.goal.id);
    setModal({ mode: "closed" });
  };

  const modalInitial = modal.mode === "edit"
    ? { title: modal.goal.title, description: modal.goal.description, color: modal.goal.color, deadline: modal.goal.deadline }
    : { title: "", description: "", color: "#C4581B", deadline: "" };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Minhas metas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {goals.length} {goals.length === 1 ? "meta ativa" : "metas ativas"} · {doneTasks} de {totalTasks} tarefas concluídas
          </p>
        </div>
        <button onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-80 transition-opacity">
          <Plus size={14} /> Nova meta
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-border rounded-2xl">
          <Target size={36} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">Nenhuma meta ainda.</p>
          <button onClick={() => setModal({ mode: "add" })}
            className="mt-3 text-sm text-accent hover:underline">Criar primeira meta</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const done = goal.tasks.filter((t) => t.done).length;
            const total = goal.tasks.length;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            const daysLeft = goal.deadline
              ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
              : null;

            return (
              <div key={goal.id} className="group bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-border/70 transition-all flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: goal.color }} />
                    <h2 className="font-medium leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>{goal.title}</h2>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setModal({ mode: "edit", goal }); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground flex-shrink-0">
                    ···
                  </button>
                </div>

                {goal.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{goal.description}</p>
                )}

                <div className="mt-auto">
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-1.5">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>
                    <span>{done}/{total} tarefas · {pct}%</span>
                    {daysLeft !== null && (
                      <span className={daysLeft < 7 ? "text-destructive" : ""}>
                        {daysLeft > 0 ? `${daysLeft}d` : "encerrado"}
                      </span>
                    )}
                  </div>
                  <button onClick={() => navigate(`/goals/${goal.id}`)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    Ver detalhes <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          <button onClick={() => setModal({ mode: "add" })}
            className="border border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:bg-secondary/30 transition-colors text-muted-foreground hover:text-foreground min-h-[180px]">
            <Plus size={20} className="opacity-40" />
            <span className="text-sm">Nova meta</span>
          </button>
        </div>
      )}

      {modal.mode !== "closed" && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setModal({ mode: "closed" })}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                {modal.mode === "edit" ? "Editar meta" : "Nova meta"}
              </h3>
              <button onClick={() => setModal({ mode: "closed" })} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                <X size={14} />
              </button>
            </div>
            <GoalForm initial={modalInitial} onSave={handleSave}
              onDelete={modal.mode === "edit" ? handleDelete : undefined}
              onClose={() => setModal({ mode: "closed" })} isEdit={modal.mode === "edit"} />
          </div>
        </div>
      )}
    </main>
  );
}

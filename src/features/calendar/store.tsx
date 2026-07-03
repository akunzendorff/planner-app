import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isSameDay } from "date-fns";
import { toast } from "sonner";
import { calendarApi } from "./api";
import type { CalEvent, Goal, GoalTask } from "./types";

interface CalendarCtx {
  events: CalEvent[];
  goals:  Goal[];
  eventsForDay: (d: Date) => CalEvent[];
  addEvent:    (data: Omit<CalEvent, "id">) => CalEvent;
  updateEvent: (id: string, data: Omit<CalEvent, "id">) => void;
  deleteEvent: (id: string) => void;
  addGoal:    (data: Omit<Goal, "id" | "tasks">) => Goal;
  updateGoal: (id: string, data: Omit<Goal, "id" | "tasks">) => void;
  deleteGoal: (id: string) => void;
  toggleTask:  (goalId: string, taskId: string) => void;
  addTask:     (goalId: string, title: string) => void;
  linkTask:    (goalId: string, taskId: string, eventId: string) => void;
  deleteTask:  (goalId: string, taskId: string) => void;
}

const Ctx = createContext<CalendarCtx | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [goals,  setGoals]  = useState<Goal[]>([]);

  useEffect(() => {
    Promise.all([calendarApi.getEvents(), calendarApi.getGoals()])
      .then(([savedEvents, savedGoals]) => {
        setEvents(savedEvents);
        setGoals(savedGoals);
      })
      .catch(e => toast.error("Erro ao carregar calendário", { description: (e as Error).message }));
  }, []);

  const eventsForDay = (d: Date) => events.filter(e => isSameDay(e.date, d));

  const addEvent = (data: Omit<CalEvent, "id">): CalEvent => {
    const ev: CalEvent = { id: `e${Date.now()}`, ...data };
    setEvents(p => [...p, ev]);
    calendarApi.createEvent(ev).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
    return ev;
  };

  const updateEvent = (id: string, data: Omit<CalEvent, "id">) => {
    setEvents(p => p.map(e => e.id === id ? { id, ...data } : e));
    calendarApi.updateEvent(id, data).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const deleteEvent = (id: string) => {
    setEvents(p => p.filter(e => e.id !== id));
    calendarApi.deleteEvent(id).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const addGoal = (data: Omit<Goal, "id" | "tasks">): Goal => {
    const g: Goal = { id: `g${Date.now()}`, tasks: [], ...data };
    setGoals(p => [...p, g]);
    calendarApi.createGoal(g).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
    return g;
  };

  const updateGoal = (id: string, data: Omit<Goal, "id" | "tasks">) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const updated = { ...goal, ...data };
    setGoals(p => p.map(g => g.id === id ? { ...g, ...data } : g));
    calendarApi.updateGoal(id, updated).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const deleteGoal = (id: string) => {
    setGoals(p => p.filter(g => g.id !== id));
    calendarApi.deleteGoal(id).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const updateGoalTasks = (goalId: string, updater: (tasks: GoalTask[]) => GoalTask[]) => {
    setGoals(prev => {
      const updated = prev.map(g => g.id !== goalId ? g : { ...g, tasks: updater(g.tasks) });
      const goal = updated.find(g => g.id === goalId);
      if (goal) calendarApi.updateGoal(goalId, goal).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
      return updated;
    });
  };

  const toggleTask = (goalId: string, taskId: string) =>
    updateGoalTasks(goalId, tasks => tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t));

  const addTask = (goalId: string, title: string) =>
    updateGoalTasks(goalId, tasks => [...tasks, { id: `t${Date.now()}`, title, done: false }]);

  const linkTask = (goalId: string, taskId: string, eventId: string) =>
    updateGoalTasks(goalId, tasks => tasks.map(t => t.id === taskId ? { ...t, eventId: eventId || undefined } : t));

  const deleteTask = (goalId: string, taskId: string) =>
    updateGoalTasks(goalId, tasks => tasks.filter(t => t.id !== taskId));

  return (
    <Ctx.Provider value={{ events, goals, eventsForDay, addEvent, updateEvent, deleteEvent, addGoal, updateGoal, deleteGoal, toggleTask, addTask, linkTask, deleteTask }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCalendarStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCalendarStore must be inside CalendarProvider");
  return ctx;
}

export { useCalendarStore as useStore };

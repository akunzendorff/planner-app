import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isSameDay } from "date-fns";
import { calendarApi } from "./api";
import { loadFromStorage, saveToStorage } from "../../shared/lib/persist";
import type { CalEvent, Goal, GoalTask } from "./types";

const SEED_EVENTS: CalEvent[] = [
  { id: "e1", title: "Reunião de equipe",   time: "09:00", location: "Sala 3",              color: "#C4581B", date: new Date(2026, 6, 2),  goalId: "g1" },
  { id: "e2", title: "Almoço com cliente",  time: "12:30", location: "Restaurante Central", color: "#2C7A4B", date: new Date(2026, 6, 2)  },
  { id: "e3", title: "Revisão de projeto",  time: "15:00", location: "",                    color: "#3B6FA0", date: new Date(2026, 6, 7),  goalId: "g1" },
  { id: "e4", title: "Workshop de design",  time: "10:00", location: "Auditório B",         color: "#8B4BA8", date: new Date(2026, 6, 10), goalId: "g2" },
  { id: "e5", title: "Sprint planning",     time: "09:30", location: "",                    color: "#C4581B", date: new Date(2026, 6, 14), goalId: "g1" },
];

const SEED_GOALS: Goal[] = [
  {
    id: "g1", title: "Lançar produto v2", description: "Entregar a segunda versão com as funcionalidades do roadmap.", color: "#C4581B", deadline: "2026-07-31",
    tasks: [
      { id: "t1", title: "Definir escopo do MVP",        done: true,  eventId: "e1" },
      { id: "t2", title: "Revisão de arquitetura",       done: true,  eventId: "e3" },
      { id: "t3", title: "Sprint de desenvolvimento",    done: false, eventId: "e5" },
      { id: "t4", title: "Deploy em produção",           done: false },
    ],
  },
  {
    id: "g2", title: "Melhorar habilidades de design", description: "Design system, tipografia e motion design.", color: "#8B4BA8", deadline: "2026-09-30",
    tasks: [
      { id: "t5", title: "Workshop de design",    done: false, eventId: "e4" },
      { id: "t6", title: "Estudar Figma Variables", done: true },
    ],
  },
];

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
  const [events, setEvents] = useState<CalEvent[]>(loadFromStorage("calendar_events", SEED_EVENTS));
  const [goals,  setGoals]  = useState<Goal[]>(loadFromStorage("calendar_goals", SEED_GOALS));
  const [seeded, setSeeded] = useState(false);

  // Load on mount
  useEffect(() => {
    Promise.all([calendarApi.getEvents(), calendarApi.getGoals()])
      .then(([savedEvents, savedGoals]) => {
        if (savedEvents.length) setEvents(savedEvents);
        if (savedGoals.length)  setGoals(savedGoals);
        setSeeded(true);
      })
      .catch(() => setSeeded(true));
  }, []);

  const eventsForDay = (d: Date) => events.filter(e => isSameDay(e.date, d));

    const addEvent = (data: Omit<CalEvent, "id">): CalEvent => {
    const ev: CalEvent = { id: `e${Date.now()}`, ...data };
    setEvents(p => {
      const next = [...p, ev];
      saveToStorage("calendar_events", next);
      return next;
    });
    calendarApi.createEvent(ev).catch(console.error);
    return ev;
  };

  const updateEvent = (id: string, data: Omit<CalEvent, "id">) => {
    setEvents(p => {
      const next = p.map(e => e.id === id ? { id, ...data } : e);
      saveToStorage("calendar_events", next);
      return next;
    });
    calendarApi.updateEvent(id, data).catch(console.error);
  };

  const deleteEvent = (id: string) => {
    setEvents(p => {
      const next = p.filter(e => e.id !== id);
      saveToStorage("calendar_events", next);
      return next;
    });
    calendarApi.deleteEvent(id).catch(console.error);
  };

    const addGoal = (data: Omit<Goal, "id" | "tasks">): Goal => {
    const g: Goal = { id: `g${Date.now()}`, tasks: [], ...data };
    setGoals(p => {
      const next = [...p, g];
      saveToStorage("calendar_goals", next);
      return next;
    });
    calendarApi.createGoal(g).catch(console.error);
    return g;
  };

  const updateGoal = (id: string, data: Omit<Goal, "id" | "tasks">) => {
    setGoals(p => {
      const next = p.map(g => g.id === id ? { ...g, ...data } : g);
      saveToStorage("calendar_goals", next);
      return next;
    });
    const goal = goals.find(g => g.id === id);
    if (goal) calendarApi.updateGoal(id, { ...goal, ...data }).catch(console.error);
  };

  const deleteGoal = (id: string) => {
    setGoals(p => {
      const next = p.filter(g => g.id !== id);
      saveToStorage("calendar_goals", next);
      return next;
    });
    calendarApi.deleteGoal(id).catch(console.error);
  };

    const updateGoalTasks = (goalId: string, updater: (tasks: GoalTask[]) => GoalTask[]) => {
    setGoals(p => {
      const updated = p.map(g => g.id !== goalId ? g : { ...g, tasks: updater(g.tasks) });
      const goal = updated.find(g => g.id === goalId);
      if (goal) calendarApi.updateGoal(goalId, goal).catch(console.error);
      saveToStorage("calendar_goals", updated);
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

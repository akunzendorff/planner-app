import { supabase } from "../../shared/lib/supabase";
import type { CalEvent, Goal } from "./types";

function getUserId() {
  return supabase.auth.getUser().then(({ data }) => data.user?.id);
}

function serializeEvent(e: CalEvent) {
  const date = e.date instanceof Date ? e.date.toISOString().slice(0, 10) : e.date;
  return { id: e.id, title: e.title, time: e.time, location: e.location, color: e.color, date, goal_id: e.goalId ?? null };
}

function deserializeEvent(raw: any): CalEvent {
  return { id: raw.id, title: raw.title, time: raw.time ?? "", location: raw.location ?? "", color: raw.color ?? "#3B6FA0", date: new Date(raw.date), goalId: raw.goal_id ?? undefined };
}

export const calendarApi = {
  async getEvents(): Promise<CalEvent[]> {
    const { data, error } = await supabase.from("calendar_events").select("*");
    if (error) throw error;
    return (data ?? []).map(deserializeEvent);
  },

  async createEvent(e: CalEvent): Promise<CalEvent> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { data, error } = await supabase.from("calendar_events").insert({ ...serializeEvent(e), user_id }).select().single();
    if (error) throw error;
    return deserializeEvent(data);
  },

  async updateEvent(id: string, e: Omit<CalEvent, "id">): Promise<void> {
    const { error } = await supabase.from("calendar_events").update(serializeEvent({ id, ...e })).eq("id", id);
    if (error) throw error;
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) throw error;
  },

  async getGoals(): Promise<Goal[]> {
    const { data, error } = await supabase.from("goals").select("*");
    if (error) throw error;
    return data ?? [];
  },

  async createGoal(g: Goal): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from("goals").insert({ ...g, user_id });
    if (error) throw error;
  },

  async updateGoal(id: string, g: Goal): Promise<void> {
    const { error } = await supabase.from("goals").update(g).eq("id", id);
    if (error) throw error;
  },

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) throw error;
  },
};

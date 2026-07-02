import { supabase } from "../lib/supabase.js";
import type { CalendarEvent, Goal } from "../models/calendar.js";

function rowToEvent(row: any): CalendarEvent {
  return {
    id:       row.id,
    title:    row.title,
    time:     row.time,
    location: row.location,
    color:    row.color,
    date:     row.date,
    goalId:   row.goal_id ?? undefined,
  };
}

function rowToGoal(row: any): Goal {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description,
    color:       row.color,
    deadline:    row.deadline ?? undefined,
    tasks:       row.tasks ?? [],
  };
}

export class CalendarService {
  constructor(private userId: string) {}

  async getEvents(): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", this.userId)
      .order("date");
    if (error) throw error;
    return (data ?? []).map(rowToEvent);
  }

  async createEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        id:       event.id,
        user_id:  this.userId,
        title:    event.title,
        time:     event.time,
        location: event.location,
        color:    event.color,
        date:     event.date,
        goal_id:  event.goalId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToEvent(data);
  }

  async updateEvent(id: string, event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from("calendar_events")
      .update({
        title:    event.title,
        time:     event.time,
        location: event.location,
        color:    event.color,
        date:     event.date,
        goal_id:  event.goalId ?? null,
      })
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();
    if (error) throw error;
    return rowToEvent(data);
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) throw error;
  }

  async getGoals(): Promise<Goal[]> {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map(rowToGoal);
  }

  async createGoal(goal: Goal): Promise<Goal> {
    const { data, error } = await supabase
      .from("goals")
      .insert({
        id:          goal.id,
        user_id:     this.userId,
        title:       goal.title,
        description: goal.description,
        color:       goal.color,
        deadline:    goal.deadline ?? null,
        tasks:       goal.tasks,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToGoal(data);
  }

  async updateGoal(id: string, goal: Omit<Goal, "id">): Promise<Goal> {
    const { data, error } = await supabase
      .from("goals")
      .update({
        title:       goal.title,
        description: goal.description,
        color:       goal.color,
        deadline:    goal.deadline ?? null,
        tasks:       goal.tasks,
      })
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();
    if (error) throw error;
    return rowToGoal(data);
  }

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    if (error) throw error;
  }
}

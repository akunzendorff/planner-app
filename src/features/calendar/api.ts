import { apiClient } from "../../shared/lib/apiClient";
import type { CalEvent, Goal } from "./types";

// Serialize CalEvent for the wire (Date → ISO string)
function serializeEvent(e: CalEvent) {
  return { ...e, date: e.date instanceof Date ? e.date.toISOString() : e.date };
}

// Deserialize from wire (ISO string → Date)
function deserializeEvent(raw: any): CalEvent {
  return { ...raw, date: new Date(raw.date) };
}

export const calendarApi = {
  // Events
  getEvents:   ()                                  => apiClient.get<any[]>("/calendar/events").then(r => r.map(deserializeEvent)),
  createEvent: (e: CalEvent)                       => apiClient.post<any>("/calendar/events", serializeEvent(e)).then(deserializeEvent),
  updateEvent: (id: string, e: Omit<CalEvent,"id">) => apiClient.put<any>(`/calendar/events/${id}`, serializeEvent({ id, ...e })).then(deserializeEvent),
  deleteEvent: (id: string)                        => apiClient.delete<void>(`/calendar/events/${id}`),

  // Goals
  getGoals:    ()                                  => apiClient.get<Goal[]>("/goals"),
  createGoal:  (g: Goal)                           => apiClient.post<Goal>("/goals", g),
  updateGoal:  (id: string, g: Omit<Goal,"id">)   => apiClient.put<Goal>(`/goals/${id}`, { id, ...g }),
  deleteGoal:  (id: string)                        => apiClient.delete<void>(`/goals/${id}`),
};

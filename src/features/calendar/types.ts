export interface CalEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  color: string;
  date: Date;
  goalId?: string;
}

export interface GoalTask {
  id: string;
  title: string;
  done: boolean;
  eventId?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  color: string;
  deadline?: string;
  tasks: GoalTask[];
}

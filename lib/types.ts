export type CounterCategory = "gym" | "japa" | "habit" | "utility" | "custom";
export type CounterMode = "simple" | "session";
export type Counter = {
  id: string;
  name: string;
  category: CounterCategory;
  icon: string;
  color: string;
  count: number;
  target?: number;
  step: number;
  mode: CounterMode;
  milestoneEvery: number;
  sound: boolean;
  vibration: boolean;
  createdAt: number;
  updatedAt: number;
  totalCount: number;
  sessions: number;
  daysOfWeek?: number[];
  lastSessionAt?: number;
  workoutOrderByDay?: Record<number, number>;
};
export type CountEvent = {
  id?: number;
  counterId: string;
  delta: number;
  at: number;
  countAfter: number;
  kind: "increment" | "decrement" | "reset" | "session";
};
export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number;
};

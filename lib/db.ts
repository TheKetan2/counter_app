import Dexie, { type Table } from "dexie";
import type { Achievement, CountEvent, Counter } from "./types";

class TallyDatabase extends Dexie {
  counters!: Table<Counter, string>;
  events!: Table<CountEvent, number>;
  achievements!: Table<Achievement, string>;
  constructor() {
    super("tallyflow-db");
    this.version(1).stores({
      counters: "id, category, updatedAt",
      events: "++id, counterId, at, kind",
      achievements: "id, unlockedAt"
    });
    // Version 2 adds the createdAt index used by the initial counter query.
    // Dexie upgrades existing version-1 databases automatically.
    this.version(2).stores({
      counters: "id, category, createdAt, updatedAt",
      events: "++id, counterId, at, kind",
      achievements: "id, unlockedAt"
    });
  }
}
export const db = new TallyDatabase();

export const starterCounters: Counter[] = [
  { id: "demo-gym", name: "Biceps workout", category: "gym", icon: "dumbbell", color: "#9b8cff", count: 0, target: 50, step: 1, mode: "session", milestoneEvery: 10, sound: false, vibration: true, createdAt: Date.now(), updatedAt: Date.now(), totalCount: 0, sessions: 0 },
  { id: "demo-japa", name: "Nam Japa", category: "japa", icon: "flower", color: "#f3b65c", count: 0, target: 108, step: 1, mode: "simple", milestoneEvery: 108, sound: false, vibration: true, createdAt: Date.now(), updatedAt: Date.now(), totalCount: 0, sessions: 0 },
  { id: "demo-utility", name: "General tally", category: "utility", icon: "hash", color: "#58c6a6", count: 0, step: 1, mode: "simple", milestoneEvery: 100, sound: false, vibration: false, createdAt: Date.now(), updatedAt: Date.now(), totalCount: 0, sessions: 0 }
];

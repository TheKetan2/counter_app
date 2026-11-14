"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  Activity, ArrowDown, ArrowLeft, ArrowUp, Award, Bell, Check, ChevronRight,
  CircleHelp, Clock3, Dumbbell, Flower2, Hash, House, Minus, Moon, MoreHorizontal,
  Pause, Play, Plus, RotateCcw, Settings, Sparkles, Sun, Target, Timer, Trophy,
  Undo2, Vibrate, X, Zap, Flame, BarChart3, Layers, PlusCircle, Trash2, Pencil,
  Download, Smartphone, CheckCircle2
} from "lucide-react";
import { db, starterCounters } from "@/lib/db";
import type { Achievement, Counter, CounterCategory } from "@/lib/types";

const categoryOptions: { id: CounterCategory; label: string; icon: string; color: string }[] = [
  { id: "gym", label: "Gym & fitness", icon: "dumbbell", color: "#9b8cff" },
  { id: "japa", label: "Nam japa", icon: "flower", color: "#f3b65c" },
  { id: "habit", label: "Habits", icon: "activity", color: "#63b9e8" },
  { id: "utility", label: "Utility", icon: "hash", color: "#58c6a6" },
  { id: "custom", label: "Custom", icon: "sparkles", color: "#ee8db6" }
];
const workoutMuscles = ["Biceps", "Triceps", "Shoulders", "Chest", "Back", "Legs", "Forearms", "Abs"];
const weekdays = [
  { name: "Monday", short: "Mon", value: 1 },
  { name: "Tuesday", short: "Tue", value: 2 },
  { name: "Wednesday", short: "Wed", value: 3 },
  { name: "Thursday", short: "Thu", value: 4 },
  { name: "Friday", short: "Fri", value: 5 },
  { name: "Saturday", short: "Sat", value: 6 },
  { name: "Sunday", short: "Sun", value: 0 }
];
const iconMap: Record<string, any> = { dumbbell: Dumbbell, flower: Flower2, activity: Activity, hash: Hash, sparkles: Sparkles };
const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);
const todayKey = () => new Date().toLocaleDateString("en-CA");
const localDayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function TallyFlow() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activityDays, setActivityDays] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "stats" | "achievements" | "settings">("home");
  const [activeDay, setActiveDay] = useState(1);
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [editing, setEditing] = useState<Counter | null>(null);
  const [toast, setToast] = useState("");
  const [celebration, setCelebration] = useState("");
  const [workoutComplete, setWorkoutComplete] = useState(false);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [uiStyle, setUiStyle] = useState<"regular" | "glass">("regular");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [form, setForm] = useState({ name: "", category: "custom" as CounterCategory, target: "", step: "1", mode: "simple" as "simple" | "session", milestoneEvery: "10", color: "#9b8cff", sound: false, vibration: true, daysOfWeek: [] as number[] });
  const timerRef = useRef<any>(null);
  const toastRef = useRef<any>(null);
  const visibleCounters = counters.filter(c => c.category !== "gym" || !c.daysOfWeek?.length || c.daysOfWeek.includes(activeDay)).sort((a, b) => (a.workoutOrderByDay?.[activeDay] ?? a.createdAt) - (b.workoutOrderByDay?.[activeDay] ?? b.createdAt));
  const selected = visibleCounters.find(c => c.id === selectedId) ?? null;

  const refresh = useCallback(async () => {
    await db.transaction("rw", db.counters, async () => {
      if (await db.counters.count() === 0) {
        await db.counters.bulkAdd(starterCounters);
      }
    });
    const list = await db.counters.orderBy("createdAt").toArray();
    setCounters(list);
    setEvents(await db.events.orderBy("at").reverse().limit(500).toArray());
    setAchievements(await db.achievements.toArray());
    const activityStart = new Date();
    activityStart.setHours(0, 0, 0, 0);
    activityStart.setDate(activityStart.getDate() - 370);
    const yearEvents = await db.events.where("at").aboveOrEqual(activityStart.getTime()).toArray();
    const dailyCounts: Record<string, number> = {};
    yearEvents.forEach(event => {
      if (event.delta > 0 || event.kind === "session") {
        const key = localDayKey(new Date(event.at));
        dailyCounts[key] = (dailyCounts[key] ?? 0) + (event.delta > 0 ? event.delta : 1);
      }
    });
    setActivityDays(dailyCounts);
    setSelectedId(prev => prev && list.some(c => c.id === prev) ? prev : list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    refresh().catch((error) => {
      console.error("TallyFlow: database initialization failed", error);
      const detail = error instanceof Error ? error.message : String(error);
      setToast(`Database error: ${detail}`);
    });
  }, [refresh]);
  useEffect(() => {
    setActiveDay(new Date().getDay());
  }, []);
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    const installedHandler = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister()))).catch(() => {});
      } else {
        navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sw.js`).catch(() => {});
      }
    }
    return () => { window.removeEventListener("beforeinstallprompt", handler); window.removeEventListener("appinstalled", installedHandler); };
  }, []);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = { ...prev };
        Object.keys(running).forEach(id => { if (running[id]) next[id] = (next[id] ?? 0) + 1; });
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
  }, [theme]);
  useEffect(() => {
    const savedStyle = localStorage.getItem("tallyflow-ui-style");
    if (savedStyle === "glass") setUiStyle("glass");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.uiStyle = uiStyle;
    localStorage.setItem("tallyflow-ui-style", uiStyle);
  }, [uiStyle]);
  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current); }, []);

  const notify = (message: string) => {
    setToast(message);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(""), 2400);
  };
  const celebrate = (message: string) => {
    setCelebration(message);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([35, 40, 70]);
    setTimeout(() => setCelebration(""), 2100);
  };
  const unlock = async (id: string, title: string, description: string, icon: string) => {
    if (await db.achievements.get(id)) return;
    const item = { id, title, description, icon, unlockedAt: Date.now() };
    await db.achievements.put(item);
    setAchievements(a => [...a, item]);
    celebrate(`${title} unlocked!`);
  };
  const updateCounter = async (id: string, patch: Partial<Counter>) => {
    await db.counters.update(id, { ...patch, updatedAt: Date.now() });
    await refresh();
  };
  const changeCount = async (counter: Counter, delta: number) => {
    const next = Math.max(0, counter.count + delta);
    if (next === counter.count) return;
    let eventId = 0;
    await db.transaction("rw", db.counters, db.events, async () => {
      await db.counters.update(counter.id, { count: next, totalCount: Math.max(0, counter.totalCount + delta), updatedAt: Date.now() });
      eventId = await db.events.add({ counterId: counter.id, delta, at: Date.now(), countAfter: next, kind: delta > 0 ? "increment" : "decrement" });
    });
    const event = { id: eventId, counterId: counter.id, delta, at: Date.now(), countAfter: next, kind: delta > 0 ? "increment" : "decrement" };
    setCounters(list => list.map(c => c.id === counter.id ? { ...c, count: next, totalCount: Math.max(0, c.totalCount + delta), updatedAt: Date.now() } : c));
    setEvents(list => [event, ...list].slice(0, 500));
    if (delta > 0) {
      const dayKey = localDayKey(new Date());
      setActivityDays(days => ({ ...days, [dayKey]: (days[dayKey] ?? 0) + Math.min(delta, next - counter.count) }));
    }
    if (delta > 0 && counter.sound) playTone();
    if (delta > 0 && counter.vibration && "vibrate" in navigator) navigator.vibrate(12);
    if (delta > 0 && counter.milestoneEvery > 0 && next > 0 && next % counter.milestoneEvery === 0) celebrate(`${fmt(next)} ${counter.name} counts!`);
    if (delta > 0 && counter.target && next >= counter.target && counter.count < counter.target) {
      const todaysWorkout = visibleCounters.filter(item => item.category === "gym" && item.target);
      const nextUnfinished = todaysWorkout.find(item => item.id !== counter.id && item.count < item.target!);
      const allWorkoutGoalsDone = todaysWorkout.length > 0 && todaysWorkout.every(item => item.id === counter.id ? next >= item.target! : item.count >= item.target!);
      if (allWorkoutGoalsDone) {
        setSelectedId(counter.id);
        setWorkoutComplete(true);
        setTimeout(() => setWorkoutComplete(false), 5200);
      } else if (nextUnfinished) {
        setSelectedId(nextUnfinished.id);
        celebrate(`${counter.name} goal reached! Next: ${nextUnfinished.name}`);
      } else {
        celebrate("Target achieved. Well done!");
      }
      await unlock(`target-${counter.id}`, `${counter.name} finisher`, `Reached ${fmt(counter.target)} counts`, "trophy");
    }
    if (next >= 100) await unlock("century", "Century club", "Reached 100 counts in a counter", "award");
    if (next >= 1000) await unlock("thousand", "One thousand", "Reached 1,000 counts in a counter", "zap");
  };
  const moveWorkout = async (counter: Counter, direction: -1 | 1) => {
    const index = visibleCounters.findIndex(item => item.id === counter.id);
    const other = visibleCounters[index + direction];
    if (index < 0 || !other) return;
    const reordered = [...visibleCounters];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    await db.transaction("rw", db.counters, async () => {
      await Promise.all(reordered.map((item, position) => db.counters.update(item.id, { workoutOrderByDay: { ...item.workoutOrderByDay, [activeDay]: position }, updatedAt: Date.now() })));
    });
    setCounters(current => current.map(item => {
      const position = reordered.findIndex(entry => entry.id === item.id);
      return position < 0 ? item : { ...item, workoutOrderByDay: { ...item.workoutOrderByDay, [activeDay]: position } };
    }));
  };
  const playTone = () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.frequency.value = 660; gain.gain.value = 0.045; osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.08); osc.onended = () => ctx.close();
    } catch {}
  };
  const undo = async () => {
    const last = events[0];
    if (!last || !selected || last.counterId !== selected.id) return notify("No recent action to undo for this counter.");
    await changeCount(selected, -last.delta);
    await db.events.delete(last.id);
    await refresh();
    notify("Last count undone.");
  };
  const reset = async () => {
    if (!selected) return;
    await db.transaction("rw", db.counters, db.events, async () => {
      await db.counters.update(selected.id, { count: 0, updatedAt: Date.now() });
      await db.events.add({ counterId: selected.id, delta: -selected.count, at: Date.now(), countAfter: 0, kind: "reset" });
    });
    setRunning(r => ({ ...r, [selected.id]: false }));
    setElapsed(e => ({ ...e, [selected.id]: 0 }));
    await refresh(); notify("Session count reset.");
  };
  const startCreate = (counter?: Counter) => {
    setEditing(counter ?? null);
    setForm(counter ? { name: counter.name, category: counter.category, target: counter.target?.toString() ?? "", step: String(counter.step), mode: counter.mode, milestoneEvery: String(counter.milestoneEvery), color: counter.color, sound: counter.sound, vibration: counter.vibration, daysOfWeek: counter.daysOfWeek ?? [] } : { name: "", category: "custom", target: "", step: "1", mode: "simple", milestoneEvery: "10", color: "#9b8cff", sound: false, vibration: true, daysOfWeek: [] });
    setModal(counter ? "edit" : "create");
  };
  const saveForm = async () => {
    const cleanName = form.name.trim();
    if (!cleanName) {
      notify("Give your counter a name first.");
      return;
    }

    const step = Number(form.step);
    const targetValue = form.target.trim() === "" ? undefined : Number(form.target);
    const milestoneValue = Number(form.milestoneEvery);

    if (!Number.isFinite(step) || step < 1) {
      notify("Step size must be a number greater than zero.");
      return;
    }
    if (targetValue !== undefined && (!Number.isFinite(targetValue) || targetValue < 1)) {
      notify("Target must be a number greater than zero.");
      return;
    }
    if (!Number.isFinite(milestoneValue) || milestoneValue < 0) {
      notify("Milestone interval cannot be negative.");
      return;
    }

    const category = categoryOptions.find(c => c.id === form.category);
    if (!category) {
      notify("Choose a valid counter category.");
      return;
    }

    try {
      // Open explicitly so unsupported/blocked IndexedDB errors are caught here.
      await db.open();

      const data = {
        name: cleanName,
        category: form.category,
        icon: category.icon,
        color: form.color,
        target: targetValue,
        step: Math.floor(step),
        mode: form.mode,
        milestoneEvery: Math.floor(milestoneValue),
        sound: form.sound,
        vibration: form.vibration,
        daysOfWeek: form.category === "gym" ? form.daysOfWeek : [],
        updatedAt: Date.now()
      };

      if (editing) {
        const changed = await db.counters.update(editing.id, data);
        if (!changed) throw new Error("The counter no longer exists. Refresh the app and try again.");
      } else {
        const item: Counter = {
          id: uid(),
          ...data,
          count: 0,
          createdAt: Date.now(),
          totalCount: 0,
          sessions: 0
        };
        await db.counters.add(item);
        setSelectedId(item.id);
      }

      await refresh();
      setModal(null);
      notify(editing ? "Counter updated." : "Counter created.");
    } catch (error) {
      console.error("TallyFlow: failed to save counter", error);
      const detail = error instanceof Error ? error.message : String(error);
      notify(`Could not save counter: ${detail}`);
    }
  };
  const deleteCounter = async () => {
    const counterToDelete = editing ?? selected;
    if (!counterToDelete) return;
    await db.transaction("rw", db.counters, db.events, async () => { await db.counters.delete(counterToDelete.id); await db.events.where("counterId").equals(counterToDelete.id).delete(); });
    setModal(null); setEditing(null); setSelectedId(null); await refresh(); notify("Counter deleted.");
  };
  const toggleRun = (c: Counter) => {
    setRunning(r => ({ ...r, [c.id]: !r[c.id] }));
  };
  const stopSession = async (c: Counter) => {
    setRunning(r => ({ ...r, [c.id]: false }));
    if ((elapsed[c.id] ?? 0) > 0) {
      await db.counters.update(c.id, { sessions: c.sessions + 1, lastSessionAt: Date.now(), updatedAt: Date.now() });
      await db.events.add({ counterId: c.id, delta: 0, at: Date.now(), countAfter: c.count, kind: "session" });
      setElapsed(e => ({ ...e, [c.id]: 0 }));
      await refresh();
      notify("Session saved.");
    }
  };
  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };
  const exportData = async () => {
    const payload = { exportedAt: new Date().toISOString(), counters: await db.counters.toArray(), events: await db.events.toArray(), achievements: await db.achievements.toArray() };
    const filename = `tallyflow-backup-${todayKey()}.json`;
    const content = JSON.stringify(payload, null, 2);
    if (Capacitor.isNativePlatform()) {
      try {
        const file = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: "TallyFlow backup", text: "Save this backup somewhere safe so you can restore your counters later.", files: [file.uri], dialogTitle: "Save TallyFlow backup" });
      } catch (error) {
        console.error("TallyFlow: native backup export failed", error);
        notify("Could not open the Android save sheet. Please try again.");
        return;
      }
    } else {
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    notify("Choose an app or folder to save your backup.");
  };
  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.counters)) throw new Error("Invalid backup");
      await db.transaction("rw", db.counters, db.events, db.achievements, async () => {
        await db.counters.clear(); await db.events.clear(); await db.achievements.clear();
        await db.counters.bulkPut(data.counters); if (Array.isArray(data.events)) await db.events.bulkPut(data.events);
        if (Array.isArray(data.achievements)) await db.achievements.bulkPut(data.achievements);
      });
      await refresh(); notify("Backup restored.");
    } catch { notify("Could not read that backup file."); }
  };

  const totalToday = useMemo(() => events.filter(e => e.at && new Date(e.at).toLocaleDateString("en-CA") === todayKey() && e.delta > 0).reduce((s, e) => s + e.delta, 0), [events]);
  const totalAll = counters.reduce((s, c) => s + c.totalCount, 0);
  const activityCalendar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 363);
    start.setDate(start.getDate() - start.getDay());
    const weeks: { dates: { key: string; count: number; future: boolean }[]; month?: string }[] = [];
    let previousMonth = -1;
    for (let weekStart = new Date(start); weekStart <= today; weekStart.setDate(weekStart.getDate() + 7)) {
      const dates = Array.from({ length: 7 }, (_, dayOffset) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayOffset);
        return { key: localDayKey(date), count: activityDays[localDayKey(date)] ?? 0, future: date > today };
      });
      const month = weekStart.getMonth();
      const monthLabel = weeks.length === 0 || month !== previousMonth ? weekStart.toLocaleString("en", { month: "short" }) : undefined;
      weeks.push({ dates, month: monthLabel });
      previousMonth = month;
    }
    const activeKeys = Object.keys(activityDays).filter(key => activityDays[key] > 0).sort();
    let currentStreak = 0;
    const streakDate = new Date(today);
    if (!activityDays[localDayKey(streakDate)]) streakDate.setDate(streakDate.getDate() - 1);
    while (activityDays[localDayKey(streakDate)] > 0) {
      currentStreak += 1;
      streakDate.setDate(streakDate.getDate() - 1);
    }
    let bestStreak = 0;
    let runningStreak = 0;
    weeks.flatMap(week => week.dates).forEach(date => {
      if (!date.future && date.count > 0) {
        runningStreak += 1;
        bestStreak = Math.max(bestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
    });
    return { weeks, currentStreak, bestStreak, activeDays: activeKeys.length };
  }, [activityDays]);
  const progress = selected?.target ? Math.min(100, (selected.count / selected.target) * 100) : 0;
  const clock = (n: number) => `${String(Math.floor(n / 3600)).padStart(2, "0")}:${String(Math.floor(n / 60) % 60).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const categoryLabel = (id: string) => categoryOptions.find(c => c.id === id)?.label ?? "Counter";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" onClick={() => setView("home")} role="button" tabIndex={0}>
          <div className="brand-mark"><img src="/icons/icon-192.png" alt="" /></div>
          <div><strong>TallyFlow</strong><span>Every count matters</span></div>
        </div>
        <div className="top-actions">
          {installPrompt && <button className="icon-button install-mini" onClick={install} aria-label="Install app"><Download size={18}/></button>}
          <button className="icon-button" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-label="Toggle theme">{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
          <button className="icon-button" onClick={() => setView("settings")} aria-label="Settings"><Settings size={18}/></button>
        </div>
      </header>

      {view === "home" && <div className="page-content">
        <section className="welcome-row">
          <div><p className="eyebrow">YOUR PERSONAL TALLY SPACE</p><h1>Make every count <em>count.</em></h1><p className="subtext">A little progress, repeated consistently.</p></div>
          <div className="streak-chip"><Flame size={15}/><span>{achievements.length} badges</span></div>
        </section>
        <section className="overview-grid">
          <div className="overview-card"><span>COUNTED TODAY</span><strong>{fmt(totalToday)}</strong><small>Across all counters</small></div>
          <div className="overview-card"><span>ALL-TIME COUNTS</span><strong>{fmt(totalAll)}</strong><small>Lifetime total</small></div>
        </section>
        <div className="workout-week" aria-label="Choose workout day">{weekdays.map(day=><button type="button" key={day.name} aria-label={day.name} title={day.name} className={activeDay===day.value?"active":""} aria-pressed={activeDay===day.value} onClick={()=>setActiveDay(day.value)}>{day.short}</button>)}</div>
        <section className="section-heading"><div><h2>{weekdays.find(day=>day.value===activeDay)?.name}'s counters</h2><p>{visibleCounters.length} active on {weekdays.find(day=>day.value===activeDay)?.name}</p></div><button className="primary small" onClick={() => startCreate()}><Plus size={16}/> New counter</button></section>
        <div className="counter-list">
          {visibleCounters.map((c, index) => {
            const Icon = iconMap[c.icon] ?? Hash;
            return <motion.div layout key={c.id} className={`counter-card ${selectedId === c.id ? "selected" : ""}`} style={{ "--accent": c.color } as React.CSSProperties}>
              <button className="counter-card-main" onClick={() => setSelectedId(c.id)} aria-label={`Select ${c.name}`}>
              <div className="counter-icon"><Icon size={20}/></div>
              <div className="counter-info"><strong>{c.name}</strong><span>{categoryLabel(c.category)}{c.target ? ` · Goal ${fmt(c.target)}` : " · No target"}</span><div className="mini-track"><i style={{ width: `${c.target ? Math.min(100, c.count / c.target * 100) : 0}%` }}/></div></div>
              <div className="counter-value"><strong>{fmt(c.count)}</strong><ChevronRight size={16}/></div>
              </button>
              <div className="counter-reorder" aria-label={`Reorder ${c.name}`}>
                <button type="button" aria-label={`Move ${c.name} up`} disabled={index === 0} onClick={() => moveWorkout(c, -1)}><ArrowUp size={14}/></button>
                <button type="button" aria-label={`Move ${c.name} down`} disabled={index === visibleCounters.length - 1} onClick={() => moveWorkout(c, 1)}><ArrowDown size={14}/></button>
              </div>
            </motion.div>;
          })}
          {!visibleCounters.length && <div className="empty-state"><Target size={30}/><h3>No workouts scheduled today</h3><p>Assign exercises to this weekday to see them here.</p><button className="primary" onClick={() => startCreate()}>Add exercise</button></div>}
        </div>

        {selected && <section className="counter-focus" style={{ "--accent": selected.color } as React.CSSProperties}>
          <div className="focus-top"><div><span className="eyebrow">NOW COUNTING</span><h2>{selected.name}</h2></div><button className="icon-button translucent" onClick={() => startCreate(selected)} aria-label="Edit counter"><Pencil size={17}/></button></div>
          <div className="progress-wrap">
            <svg viewBox="0 0 220 220" className="progress-ring" aria-label={`${Math.round(progress)} percent complete`}>
              <circle cx="110" cy="110" r="96" className="ring-bg"/>
              <circle cx="110" cy="110" r="96" className="ring-value" style={{ strokeDasharray: `${2 * Math.PI * 96}`, strokeDashoffset: `${2 * Math.PI * 96 * (1 - progress / 100)}` }}/>
            </svg>
            <div className="count-center"><strong>{fmt(selected.count)}</strong><span>{selected.target ? `OF ${fmt(selected.target)}` : "TOTAL COUNT"}</span>{selected.target && <small>{Math.round(progress)}% complete</small>}</div>
          </div>
          <div className="stepper-row">
            <button className="step-button minus" onClick={() => changeCount(selected, -selected.step)} aria-label="Decrease count"><Minus size={23}/></button>
            <button className="step-button plus-button" onClick={() => changeCount(selected, selected.step)} aria-label="Increase count"><Plus size={32}/><span>ADD {selected.step}</span></button>
            <button className="step-button undo" onClick={undo} aria-label="Undo last count"><Undo2 size={21}/></button>
          </div>
          {selected.mode === "session" && <div className="session-controls">
            <div className="timer-readout"><Clock3 size={16}/><strong>{clock(elapsed[selected.id] ?? 0)}</strong><span>SESSION TIME</span></div>
            <div className="session-actions"><button className={`run-button ${running[selected.id] ? "paused" : ""}`} onClick={() => toggleRun(selected)}>{running[selected.id] ? <><Pause size={17}/> Pause</> : <><Play size={17}/>{(elapsed[selected.id] ?? 0) > 0 ? "Resume" : "Start"}</>}</button><button className="stop-button" onClick={() => stopSession(selected)}><span/> Stop</button></div>
          </div>}
          <div className="focus-footer"><span><Target size={14}/>{selected.target ? `${fmt(Math.max(0, selected.target - selected.count))} to goal` : "Keep going"}</span><button onClick={() => { setEditing(selected); setModal("delete"); }}><Trash2 size={14}/> Delete</button><button onClick={reset}><RotateCcw size={14}/> Reset</button></div>
        </section>}
      </div>}

      {view === "stats" && <div className="page-content secondary-page">
        <p className="eyebrow">YOUR MOMENTUM</p>
        <h1>Consistency</h1>
        <p className="subtext">Every active day adds to your streak.</p>
        <section className="panel streak-dashboard">
          <div className="streak-heading"><div><h2>Activity over the last year</h2><p className="muted">Your daily counts and workout sessions</p></div><Flame size={22}/></div>
          <div className="streak-summary">
            <div><strong>{activityCalendar.currentStreak}</strong><span>Current streak</span></div>
            <div><strong>{activityCalendar.bestStreak}</strong><span>Longest streak</span></div>
            <div><strong>{activityCalendar.activeDays}</strong><span>Active days</span></div>
          </div>
          <div className="activity-calendar-scroll">
            <div className="streak-calendar">
              <div className="streak-corner"/>
              <div className="streak-months" style={{ gridTemplateColumns: `repeat(${activityCalendar.weeks.length}, 10px)` }}>
                {activityCalendar.weeks.map((week,index)=><span key={index} style={{gridColumn:index+1}}>{week.month ?? ""}</span>)}
              </div>
              <div className="streak-weekdays">{["","Mon","","Wed","","Fri",""].map((label,index)=><span key={index}>{label}</span>)}</div>
              <div className="streak-weeks">
                {activityCalendar.weeks.map((week,weekIndex)=><div className="streak-week" key={weekIndex}>
                  {week.dates.map((day,dayIndex)=>{
                    const level=day.count===0?0:day.count<10?1:day.count<30?2:day.count<60?3:4;
                    return <span key={dayIndex} className={`streak-cell level-${level}`} title={`${day.count} counts on ${new Date(`${day.key}T12:00:00`).toDateString()}`} aria-label={`${day.count} counts on ${day.key}`} />;
                  })}
                </div>)}
              </div>
            </div>
          </div>
          <div className="streak-legend"><span>Less</span>{[0,1,2,3,4].map(level=><i key={level} className={`streak-cell level-${level}`}/>)}<span>More</span></div>
        </section>
        <div className="stats-grid"><div className="overview-card"><span>LIFETIME TOTAL</span><strong>{fmt(totalAll)}</strong></div><div className="overview-card"><span>COUNTERS</span><strong>{counters.length}</strong></div><div className="overview-card"><span>SESSIONS</span><strong>{counters.reduce((s,c)=>s+c.sessions,0)}</strong></div><div className="overview-card"><span>BADGES</span><strong>{achievements.length}</strong></div></div>
        <section className="panel"><h2>Counter breakdown</h2>{counters.map(c=><div className="breakdown-row" key={c.id}><span>{c.name}</span><strong>{fmt(c.totalCount)}</strong></div>)}</section>
        <section className="panel"><h2>Recent activity</h2>{events.slice(0,12).map((e,i)=><div className="activity-row" key={e.id ?? i}><span className="activity-dot"/><div><strong>{counters.find(c=>c.id===e.counterId)?.name ?? "Counter"}</strong><small>{new Date(e.at).toLocaleString()}</small></div><b>{e.delta > 0 ? `+${e.delta}` : e.delta < 0 ? e.delta : "Session"}</b></div>)}{!events.length&&<p className="muted">Your activity will appear here.</p>}</section>
      </div>}

      {view === "achievements" && <div className="page-content secondary-page"><p className="eyebrow">SMALL WINS ADD UP</p><h1>Achievements</h1><p className="subtext">Milestones worth celebrating.</p><div className="achievement-grid">{[{id:"century",title:"Century club",description:"Reach 100 counts in a counter",icon:"🏅"},{id:"thousand",title:"One thousand",description:"Reach 1,000 counts in a counter",icon:"⚡"},...counters.filter(c=>c.target).map(c=>({id:`target-${c.id}`,title:`${c.name} finisher`,description:`Reach ${fmt(c.target!)} counts`,icon:"🏆"}))].map(a=>{const unlocked=achievements.find(x=>x.id===a.id);return <div className={`achievement-card ${unlocked?"unlocked":""}`} key={a.id}><div>{a.icon}</div><section><strong>{a.title}</strong><p>{a.description}</p><small>{unlocked?`Unlocked ${new Date(unlocked.unlockedAt).toLocaleDateString()}`:"Not unlocked yet"}</small></section>{unlocked&&<CheckCircle2 size={18}/>}</div>})}</div></div>}

      {view === "settings" && <div className="page-content secondary-page">
        <p className="eyebrow">MAKE IT YOURS</p>
        <h1>Settings</h1>
        <p className="subtext">Your data stays on this device.</p>
        <section className="panel">
          <h2>Appearance</h2>
          <div className="setting-row">
            <div><strong>Theme</strong><small>Choose your preferred appearance</small></div>
            <select value={theme} onChange={e => setTheme(e.target.value as any)}>
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </div>
          <div className="setting-row">
            <div><strong>Interface style</strong><small>Choose regular or glassmorphism</small></div>
            <select value={uiStyle} onChange={e => setUiStyle(e.target.value as "regular" | "glass")}>
              <option value="regular">Regular</option><option value="glass">Glassmorphism</option>
            </select>
          </div>
        </section>
        <section className="panel">
          <h2>App installation</h2>
          <div className="setting-row">
            <div><strong>{installed ? "Installed on this device" : "Install TallyFlow"}</strong><small>{installed ? "You can launch it from your home screen" : "Use TallyFlow like a native app"}</small></div>
            {installPrompt ? <button className="primary small" onClick={install}><Download size={15}/> Install</button> : <span className="muted small-text">{installed ? "Installed" : "Browser menu → Add to Home Screen"}</span>}
          </div>
        </section>
        <section className="panel">
          <h2>Backup &amp; restore</h2>
          <p className="panel-copy">Your counters are stored locally. Export a backup regularly if you use TallyFlow for important records.</p>
          <div className="button-row">
            <button className="secondary-button" onClick={exportData}><Download size={16}/> Export backup</button>
            <label className="secondary-button file-button"><ArrowUp size={16}/> Restore backup<input type="file" accept="application/json,.json" onChange={e => importData(e.target.files?.[0])}/></label>
          </div>
        </section>
        <section className="panel">
          <h2>About TallyFlow</h2>
          <p className="panel-copy">Version 1.0 · Offline-first · No account · No tracking</p>
          <p className="panel-copy">If browser storage is cleared or the device is lost, locally stored data may be lost. Keep an exported backup.</p>
          <p className="panel-copy developer-credit">Developed by Ketan D Ramteke · <a href="https://github.com/theketan2" target="_blank" rel="noreferrer">GitHub @theketan2</a></p>
        </section>
      </div>}

      <nav className="bottom-nav">
        {[{id:"home",label:"Home",icon:House},{id:"stats",label:"Stats",icon:BarChart3},{id:"achievements",label:"Awards",icon:Trophy},{id:"settings",label:"Settings",icon:Settings}].map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?"active":""} onClick={()=>setView(item.id as any)}><Icon size={19}/><span>{item.label}</span></button>})}
      </nav>

      <AnimatePresence>{modal && <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setModal(null)}><motion.div className="modal-card" initial={{y:25,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">{modal==="create"?"NEW COUNTER":modal==="edit"?"CUSTOMIZE COUNTER":"CONFIRM ACTION"}</p><h2>{modal==="delete"?"Delete this counter?":modal==="edit"?"Edit counter":"Create a counter"}</h2></div><button className="icon-button" onClick={()=>setModal(null)}><X size={19}/></button></div>
        {modal==="delete"?<><p className="modal-copy">This permanently deletes this counter and its activity history from this device.</p><div className="modal-actions"><button className="secondary-button" onClick={()=>setModal(null)}>Cancel</button><button className="danger-button" onClick={deleteCounter}>Delete counter</button></div></>:<>
          <label className="field-label">Counter name<input autoFocus value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Push-ups, Gayatri Mantra"/></label>
          <label className="field-label">Category<select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value as CounterCategory,daysOfWeek:e.target.value==="gym"&&f.category!=="gym"?[activeDay]:f.daysOfWeek}))}>{categoryOptions.map(c=><option value={c.id} key={c.id}>{c.label}</option>)}</select></label>
          {modal==="create"&&form.category==="gym"&&<label className="field-label">Workout muscle<select defaultValue="" onChange={e=>{const muscle=e.target.value;if(muscle)setForm(f=>({...f,name:muscle,step:"10",mode:"session",milestoneEvery:"10",color:"#9b8cff"}));}}><option value="">Choose a muscle group</option>{workoutMuscles.map(muscle=><option value={muscle} key={muscle}>{muscle}</option>)}</select></label>}
          {form.category==="gym"&&<fieldset className="field-label workout-days"><legend>Workout days</legend><div className="weekday-options">{weekdays.map(day=><button type="button" key={day.name} aria-label={day.name} title={day.name} className={form.daysOfWeek.includes(day.value)?"active":""} aria-pressed={form.daysOfWeek.includes(day.value)} onClick={()=>setForm(f=>({...f,daysOfWeek:f.daysOfWeek.includes(day.value)?f.daysOfWeek.filter(value=>value!==day.value):[...f.daysOfWeek,day.value].sort((a,b)=>a-b)}))}>{day.short}</button>)}</div><small>Choose one or more days. No selection means every day.</small></fieldset>}
          <div className="field-grid"><label className="field-label">Target (optional)<input type="number" min="1" value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))} placeholder="e.g. 108"/></label><label className="field-label">{form.category==="gym"?"Default reps per tap":"Step size"}<input type="number" min="1" value={form.step} onChange={e=>setForm(f=>({...f,step:e.target.value}))}/></label></div>
          <div className="field-grid"><label className="field-label">Milestone every<input type="number" min="0" value={form.milestoneEvery} onChange={e=>setForm(f=>({...f,milestoneEvery:e.target.value}))}/></label><label className="field-label">Counter mode<select value={form.mode} onChange={e=>setForm(f=>({...f,mode:e.target.value as any}))}><option value="simple">Simple counter</option><option value="session">Session + timer</option></select></label></div>
          <label className="field-label">Accent colour<div className="color-row">{["#9b8cff","#f3b65c","#58c6a6","#63b9e8","#ee8db6","#f07878"].map(c=><button type="button" key={c} className={`color-dot ${form.color===c?"chosen":""}`} style={{background:c}} onClick={()=>setForm(f=>({...f,color:c}))}/>)}</div></label>
          <div className="toggle-row"><div><strong>Sound feedback</strong><small>Short tone when counting</small></div><input type="checkbox" checked={form.sound} onChange={e=>setForm(f=>({...f,sound:e.target.checked}))}/></div>
          <div className="toggle-row"><div><strong>Vibration feedback</strong><small>Haptic tap where supported</small></div><input type="checkbox" checked={form.vibration} onChange={e=>setForm(f=>({...f,vibration:e.target.checked}))}/></div>
          <div className="modal-actions">{modal==="edit"&&<button className="danger-button" onClick={()=>setModal("delete")}>Delete counter</button>}<button className="secondary-button" onClick={()=>setModal(null)}>Cancel</button><button className="primary" onClick={saveForm}><Check size={16}/>{modal==="edit"?"Save changes":"Create counter"}</button></div>
        </>}
      </motion.div></motion.div>}</AnimatePresence>
      <AnimatePresence>{workoutComplete&&<motion.div className="workout-fireworks" role="status" aria-live="polite" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setWorkoutComplete(false)}><div className="firework-burst burst-one">✦<i>✦</i><b>✦</b></div><div className="firework-burst burst-two">✦<i>✦</i><b>✦</b></div><div className="firework-burst burst-three">✦<i>✦</i><b>✦</b></div><div className="workout-finish-card"><span>TODAY&apos;S WORKOUT</span><strong>Workout finished!</strong><p>Every exercise done. Amazing work.</p><span className="finish-dismiss">Tap anywhere to close</span></div></motion.div>}</AnimatePresence>
      <AnimatePresence>{celebration&&<motion.div className="celebration" initial={{opacity:0,scale:.8,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,y:-10}}><div className="celebration-icon">🎉</div><strong>{celebration}</strong><span>Keep the momentum going.</span></motion.div>}</AnimatePresence>
      <AnimatePresence>{toast&&<motion.div className="toast" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}>{toast}</motion.div>}</AnimatePresence>
    </main>
  );
}

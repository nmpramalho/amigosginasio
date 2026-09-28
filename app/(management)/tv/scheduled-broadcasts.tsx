"use client";
import { useState } from "react";
import type { ScheduledVideo } from "@/lib/club-tv";

type Filter = "all" | "today" | "week";
const zone = "Europe/Lisbon";
function dayKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const get = (name: string) => parts.find(part => part.type === name)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function addDays(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
function dateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", { timeZone: zone,
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit",
    minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
export function ScheduledBroadcasts({ videos, today }: { videos: ScheduledVideo[]; today: string }) {
  const [filter, setFilter] = useState<Filter>("week");
  const end = addDays(today, 6);
  const visible = videos.filter(video => {
    const date = dayKey(new Date(video.scheduledAt));
    return filter === "all" ? date >= today : filter === "today" ? date === today : date >= today && date <= end;
  });
  return <section className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Transmissões agendadas</h2>
      <div className="flex flex-wrap gap-2" aria-label="Filtrar transmissões agendadas">
        {([["all", "Todas"], ["today", "Hoje"], ["week", "Próximos 7 dias"]] as const).map(([key, label]) =>
          <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}
            className={`rounded-lg border px-3 py-2 text-sm ${filter === key ? "border-[var(--club-green-700)] bg-[var(--club-green-50)] font-semibold" : "border-[var(--border)]"}`}>
            {label}
          </button>)}
      </div>
    </div>
    {visible.length ? <ul className="mt-4 divide-y divide-[var(--border)]">
      {visible.map(video => <li key={video.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div><h3 className="font-medium">{video.title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{dateTime(video.scheduledAt)} · Hora de Lisboa</p></div>
        <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"
          className="text-sm font-semibold text-[var(--club-green-700)] hover:underline">Ver agendamento</a>
      </li>)}
    </ul> : <p className="mt-4 text-sm text-[var(--muted)]">Sem transmissões agendadas para este período.</p>}
  </section>;
}

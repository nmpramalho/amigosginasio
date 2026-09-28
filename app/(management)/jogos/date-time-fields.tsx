type Props = { initial?: Date; label?: string };
const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];
function lisbonParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("day")}/${part("month")}/${part("year")}`,
    hour: part("hour"), minute: part("minute") };
}
export function DateTimeFields({ initial, label = "Data e hora do jogo" }: Props) {
  const value = initial ? lisbonParts(initial) : null;
  return <fieldset className="sm:col-span-2">
    <legend className="mb-1 text-sm font-medium">{label} (hora de Lisboa)</legend>
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
      <label className="min-w-0 text-sm">Data (dd/mm/aaaa)
        <input type="text" name="matchDate" inputMode="numeric" required
          placeholder="dd/mm/aaaa" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
          title="Introduz a data no formato dd/mm/aaaa"
          defaultValue={value?.date ?? ""}
          className="mt-1 block h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm" />
      </label>
      <label className="text-sm">Hora
        <select name="matchHour" required defaultValue={value?.hour ?? ""}
          className="mt-1 block h-10 rounded-lg border border-[var(--border)] bg-white px-2 text-sm">
          <option value="" disabled>HH</option>
          {hours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
        </select>
      </label>
      <label className="text-sm">Minutos
        <select name="matchMinute" required defaultValue={value && minutes.includes(value.minute) ? value.minute : ""}
          className="mt-1 block h-10 rounded-lg border border-[var(--border)] bg-white px-2 text-sm">
          <option value="" disabled>MM</option>
          {minutes.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
        </select>
      </label>
    </div>
    {value && !minutes.includes(value.minute) && <p className="mt-1 text-xs text-[var(--muted)]">
      Hora anterior: {value.hour}:{value.minute}. Seleciona um intervalo de 15 minutos para reagendar.
    </p>}
  </fieldset>;
}

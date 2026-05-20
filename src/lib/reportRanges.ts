import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type ReportPeriod = "daily" | "weekly" | "monthly";

/** Parse local calendar date from yyyy-MM-dd */
export function parseDateKey(dateKey: string): Date {
  return parse(dateKey, "yyyy-MM-dd", new Date());
}

export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function periodRange(
  period: ReportPeriod,
  dateKey: string,
): { from: string; to: string; label: string } {
  const d = parseDateKey(dateKey);
  if (period === "daily") {
    const k = toDateKey(d);
    return { from: k, to: k, label: format(d, "EEEE, MMM d, yyyy") };
  }
  if (period === "weekly") {
    const start = startOfWeek(d, { weekStartsOn: 0 });
    const end = endOfWeek(d, { weekStartsOn: 0 });
    return {
      from: toDateKey(start),
      to: toDateKey(end),
      label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
    };
  }
  const start = startOfMonth(d);
  const end = endOfMonth(d);
  return {
    from: toDateKey(start),
    to: toDateKey(end),
    label: format(start, "MMMM yyyy"),
  };
}

/** All days to show in month grid (includes leading/trailing days from adjacent months) */
export function calendarDaysForMonth(visibleMonth: Date): Date[] {
  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function isDateKeyInRange(dateKey: string, from: string, to: string): boolean {
  return dateKey >= from && dateKey <= to;
}

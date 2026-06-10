import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

export type ReportPeriod = "daily" | "weekly" | "monthly";

export type DashboardAttendancePeriod =
  | "today"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month";

/** Date range presets for the dashboard branch attendance panel */
export function dashboardAttendanceRange(period: DashboardAttendancePeriod): {
  from: string;
  to: string;
  title: string;
  subtitle: string;
} {
  const today = new Date();
  const todayK = toDateKey(today);

  if (period === "today") {
    const label = format(today, "MMM d, yyyy");
    return {
      from: todayK,
      to: todayK,
      title: "Branch Attendance today",
      subtitle: label,
    };
  }

  if (period === "this_week") {
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });
    return {
      from: toDateKey(start),
      to: toDateKey(end),
      title: "Branch Attendance",
      subtitle: `This week · ${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
    };
  }

  if (period === "last_week") {
    const ref = subWeeks(today, 1);
    const start = startOfWeek(ref, { weekStartsOn: 0 });
    const end = endOfWeek(ref, { weekStartsOn: 0 });
    return {
      from: toDateKey(start),
      to: toDateKey(end),
      title: "Branch Attendance",
      subtitle: `Last week · ${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
    };
  }

  if (period === "this_month") {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return {
      from: toDateKey(start),
      to: toDateKey(end),
      title: "Branch Attendance",
      subtitle: `This month · ${format(start, "MMMM yyyy")}`,
    };
  }

  const ref = subMonths(today, 1);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  return {
    from: toDateKey(start),
    to: toDateKey(end),
    title: "Branch Attendance",
    subtitle: `Last month · ${format(start, "MMMM yyyy")}`,
  };
}

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

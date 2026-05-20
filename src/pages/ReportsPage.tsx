import { useMemo, useState } from "react";
import { addMonths, format, isSameDay, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useStore } from "../store/useStore";
import { todayKey } from "../lib/dates";
import {
  buildReportRows,
  filterAttendance,
  countByDate,
  reportToCsv,
  summaryStats,
  formatReportDate,
} from "../lib/attendanceReport";
import {
  calendarDaysForMonth,
  periodRange,
  toDateKey,
  type ReportPeriod,
  parseDateKey,
} from "../lib/reportRanges";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { TableWrap, tableCell, tableCellMuted, tableHeadCell } from "../components/ui/TableWrap";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ReportsPage() {
  const attendance = useStore((s) => s.attendance);
  const students = useStore((s) => s.students);
  const temples = useStore((s) => s.temples);
  const getStudent = useStore((s) => s.getStudent);
  const getTemple = useStore((s) => s.getTemple);
  const getManager = useStore((s) => s.getManager);

  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => todayKey());
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [templeFilter, setTempleFilter] = useState<"all" | string>("all");

  const { from, to, label } = useMemo(
    () => periodRange(period, selectedDateKey),
    [period, selectedDateKey],
  );

  const periodRecords = useMemo(
    () => filterAttendance(attendance, from, to, templeFilter),
    [attendance, from, to, templeFilter],
  );

  const rows = useMemo(
    () => buildReportRows(periodRecords, getStudent, getTemple, getManager),
    [periodRecords, getStudent, getTemple, getManager],
  );

  const activeStudentsInScope = useMemo(() => {
    if (templeFilter === "all") return students.filter((s) => s.active).length;
    return students.filter((s) => s.active && s.templeId === templeFilter).length;
  }, [students, templeFilter]);

  const stats = useMemo(
    () => summaryStats(periodRecords, activeStudentsInScope),
    [periodRecords, activeStudentsInScope],
  );

  const gridDays = useMemo(() => calendarDaysForMonth(visibleMonth), [visibleMonth]);
  const gridFrom = toDateKey(gridDays[0]!);
  const gridTo = toDateKey(gridDays[gridDays.length - 1]!);
  const monthAttendance = useMemo(
    () => filterAttendance(attendance, gridFrom, gridTo, templeFilter),
    [attendance, gridFrom, gridTo, templeFilter],
  );
  const dayCounts = useMemo(() => countByDate(monthAttendance), [monthAttendance]);

  const downloadCsv = () => {
    const csv = reportToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tsk-attendance-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedDate = parseDateKey(selectedDateKey);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Reports" subtitle="Calendar and attendance export" />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium text-cerulean">Calendar</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2"
              aria-label="Previous month"
              onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[8rem] text-center text-sm font-medium text-cerulean">
              {format(visibleMonth, "MMMM yyyy")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2"
              aria-label="Next month"
              onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-mist sm:text-sm">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
          {gridDays.map((day) => {
            const key = toDateKey(day);
            const count = dayCounts.get(key) ?? 0;
            const inMonth = isSameMonth(day, visibleMonth);
            const selected = isSameDay(day, selectedDate);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDateKey(key);
                  setVisibleMonth(day);
                }}
                className={`flex min-h-[44px] flex-col items-center justify-center rounded border py-1 text-sm transition-colors sm:min-h-[48px] ${
                  selected
                    ? "border-cerulean bg-cerulean text-white"
                    : inMonth
                      ? "border-morning bg-white text-cerulean hover:bg-morning/40"
                      : "border-transparent bg-morning/25 text-mist hover:bg-morning/40"
                }`}
              >
                <span className="font-medium">{format(day, "d")}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] leading-tight sm:text-xs ${
                      selected ? "text-morning" : "text-mist"
                    }`}
                    title={`${count} check-in${count === 1 ? "" : "s"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-mist">
          Tap a day to select it. Small numbers are check-in counts for that day (temple filter applies).
        </p>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "daily" as const, label: "Daily" },
              { id: "weekly" as const, label: "Weekly" },
              { id: "monthly" as const, label: "Monthly" },
            ] as const
          ).map(({ id, label: lbl }) => (
            <Button
              key={id}
              type="button"
              variant={period === id ? "primary" : "outline"}
              size="sm"
              onClick={() => setPeriod(id)}
            >
              {lbl}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={downloadCsv}
          className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <Download className="h-4 w-4 shrink-0" />
          Download CSV
        </Button>
      </div>

      <Select
        label="Temple"
        value={templeFilter}
        onChange={(e) => setTempleFilter(e.target.value as "all" | string)}
        options={[
          { value: "all", label: "All temples" },
          ...temples.map((t) => ({ value: t.id, label: t.name })),
        ]}
      />

      <Card>
        <h2 className="mb-1 font-medium text-cerulean">
          {period === "daily" && "Daily report"}
          {period === "weekly" && "Weekly report"}
          {period === "monthly" && "Monthly report"}
        </h2>
        <p className="text-sm text-mist">{label}</p>
        <p className="mt-2 text-xs text-mist">
          Range: {formatReportDate(from)}
          {from !== to && ` → ${formatReportDate(to)}`}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
          <div className="rounded border border-morning bg-morning/25 px-3 py-2 text-center">
            <p className="text-xs text-mist">Check-ins</p>
            <p className="text-xl font-semibold text-cerulean tabular-nums">{stats.checkIns}</p>
          </div>
          <div className="rounded border border-morning bg-morning/25 px-3 py-2 text-center">
            <p className="text-xs text-mist">Unique students</p>
            <p className="text-xl font-semibold text-cerulean tabular-nums">{stats.uniqueStudents}</p>
          </div>
          <div className="rounded border border-morning bg-morning/25 px-3 py-2 text-center">
            <p className="text-xs text-mist">Active students (filter)</p>
            <p className="text-xl font-semibold text-cerulean tabular-nums">
              {stats.activeStudentsInScope}
            </p>
          </div>
        </div>
      </Card>

      <Card padding="sm">
        <h2 className="mb-3 px-1 font-medium text-cerulean">Detail</h2>
        <TableWrap>
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-morning">
                <th className={tableHeadCell}>Date</th>
                <th className={tableHeadCell}>Time</th>
                <th className={tableHeadCell}>Student</th>
                <th className={tableHeadCell}>Roll</th>
                <th className={tableHeadCell}>Class</th>
                <th className={tableHeadCell}>Temple</th>
                <th className={tableHeadCell}>Manager</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.date}-${r.time}-${r.rollNumber}-${i}`}
                  className="border-b border-morning last:border-0"
                >
                  <td className={tableCellMuted}>{formatReportDate(r.date)}</td>
                  <td className={tableCellMuted}>{r.time}</td>
                  <td className={tableCell}>{r.studentName}</td>
                  <td className={tableCellMuted}>{r.rollNumber}</td>
                  <td className={tableCellMuted}>{r.studentClass}</td>
                  <td className={tableCellMuted}>{r.templeName}</td>
                  <td className={tableCellMuted}>{r.managerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {rows.length === 0 && (
          <p className="px-1 py-4 text-center text-sm text-mist">No check-ins in this range.</p>
        )}
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { addMonths, format, isSameDay, isSameMonth } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useStore } from "../store/useStore";
import { APP_SLUG } from "../lib/branding";
import { todayKey } from "../lib/dates";
import {
  buildReportRows,
  filterAttendance,
  countByDate,
  reportToCsv,
  formatReportDate,
} from "../lib/attendanceReport";
import {
  activeStudentsInBranch,
  branchAttendanceSlices,
  branchEnrollmentSlices,
  branchPresentAbsentTrend,
  classAttendanceSlices,
  dailyAttendanceTrend,
  enrollmentClassSlices,
  enrollmentGenderSlices,
  genderAttendanceSlices,
  presentAbsentSlices,
} from "../lib/reportAnalytics";
import {
  calendarDaysForMonth,
  periodRange,
  toDateKey,
  type ReportPeriod,
  parseDateKey,
} from "../lib/reportRanges";
import { BranchBarChart, DailyBarChart } from "../components/reports/GroupedBarChart";
import { DonutChart } from "../components/reports/DonutChart";
import { ReportChartCard } from "../components/reports/ReportChartCard";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PERIOD_OPTIONS: { id: ReportPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export function ReportsPage() {
  const session = useStore((s) => s.session);
  const attendance = useStore((s) => s.attendance);
  const students = useStore((s) => s.students);
  const branches = useStore((s) => s.branches);
  const getStudent = useStore((s) => s.getStudent);
  const getBranch = useStore((s) => s.getBranch);
  const getMarkedByName = useStore((s) => s.getMarkedByName);

  const scopedBranch =
    session?.role === "manager" || session?.role === "user"
      ? session.branchId || "all"
      : "all";

  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => todayKey());
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [branchFilter, setBranchFilter] = useState<"all" | string>(scopedBranch);

  const { from, to, label } = useMemo(
    () => periodRange(period, selectedDateKey),
    [period, selectedDateKey],
  );

  const periodRecords = useMemo(
    () => filterAttendance(attendance, from, to, branchFilter),
    [attendance, from, to, branchFilter],
  );

  const rows = useMemo(
    () => buildReportRows(periodRecords, getStudent, getBranch, getMarkedByName),
    [periodRecords, getStudent, getBranch, getMarkedByName],
  );

  const activeInScope = useMemo(
    () => activeStudentsInBranch(students, branchFilter),
    [students, branchFilter],
  );

  const presentAbsent = useMemo(
    () => presentAbsentSlices(periodRecords, activeInScope),
    [periodRecords, activeInScope],
  );

  const genderSlices = useMemo(
    () => genderAttendanceSlices(periodRecords, activeInScope),
    [periodRecords, activeInScope],
  );

  const branchSlices = useMemo(
    () => branchAttendanceSlices(periodRecords, branches, branchFilter),
    [periodRecords, branches, branchFilter],
  );

  const branchEnrollment = useMemo(
    () => branchEnrollmentSlices(branches, students, branchFilter),
    [branches, students, branchFilter],
  );

  const branchChart = branchSlices.length > 0 ? branchSlices : branchEnrollment;
  const branchDonutSubtitle =
    branchSlices.length > 0
      ? "Unique students present per branch"
      : "Active students enrolled per branch";

  const classSlices = useMemo(
    () => classAttendanceSlices(periodRecords, activeInScope),
    [periodRecords, activeInScope],
  );

  const enrollmentGender = useMemo(
    () => enrollmentGenderSlices(activeInScope),
    [activeInScope],
  );

  const enrollmentClass = useMemo(
    () => enrollmentClassSlices(activeInScope),
    [activeInScope],
  );

  const genderChart = genderSlices.length > 0 ? genderSlices : enrollmentGender;
  const classChart = classSlices.length > 0 ? classSlices : enrollmentClass;
  const genderSubtitle =
    genderSlices.length > 0
      ? "Present students by gender"
      : "All active students by gender";
  const classSubtitle =
    classSlices.length > 0
      ? "Top classes with present students"
      : "All active students by class";

  const dailyTrend = useMemo(
    () => dailyAttendanceTrend(periodRecords, from, to, activeInScope),
    [periodRecords, from, to, activeInScope],
  );

  const branchTrend = useMemo(
    () => branchPresentAbsentTrend(periodRecords, branches, students, branchFilter),
    [periodRecords, branches, students, branchFilter],
  );

  const gridDays = useMemo(() => calendarDaysForMonth(visibleMonth), [visibleMonth]);
  const gridFrom = toDateKey(gridDays[0]!);
  const gridTo = toDateKey(gridDays[gridDays.length - 1]!);
  const monthAttendance = useMemo(
    () => filterAttendance(attendance, gridFrom, gridTo, branchFilter),
    [attendance, gridFrom, gridTo, branchFilter],
  );
  const dayCounts = useMemo(() => countByDate(monthAttendance), [monthAttendance]);

  const showBranchCharts = branchFilter === "all" && branches.length > 1;
  const selectedDate = parseDateKey(selectedDateKey);

  const downloadCsv = () => {
    const csv = reportToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${APP_SLUG}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Attendance analytics and trends"
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={downloadCsv}
            className="inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4 shrink-0" />
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="inline-flex w-full max-w-md rounded-full border border-morning bg-white p-1 shadow-sm">
          {PERIOD_OPTIONS.map(({ id, label: lbl }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                period === id
                  ? "bg-cerulean text-white shadow-sm"
                  : "text-mist hover:text-cerulean"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {session?.role === "admin" ? (
          <Select
            label="Branch"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value as "all" | string)}
            options={[
              { value: "all", label: "All branches" },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
            wrapperClassName="w-full lg:w-56"
          />
        ) : (
          <p className="text-sm text-mist lg:pb-2">
            Branch:{" "}
            <span className="font-medium text-cerulean">
              {getBranch(scopedBranch)?.name ?? "—"}
            </span>
          </p>
        )}
      </div>

      <p className="text-sm text-mist">
        {label} · {formatReportDate(from)}
        {from !== to && ` → ${formatReportDate(to)}`}
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportChartCard
          title="Attendance split"
          subtitle="Present vs absent students in this period"
        >
          <DonutChart
            data={presentAbsent}
            emptyLabel="Add students to see attendance split."
          />
        </ReportChartCard>

        <ReportChartCard
          title="Attendance over time"
          subtitle="Daily present and absent counts"
        >
          <DailyBarChart
            data={dailyTrend}
            emptyLabel="No students in scope for this period."
          />
        </ReportChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {showBranchCharts ? (
          <>
            <ReportChartCard title="Students by branch" subtitle={branchDonutSubtitle}>
              <DonutChart
                data={branchChart}
                emptyLabel="Add branches and students to see branch breakdown."
              />
            </ReportChartCard>

            <ReportChartCard
              title="Branch comparison"
              subtitle="Present vs absent by branch"
            >
              <BranchBarChart data={branchTrend} />
            </ReportChartCard>
          </>
        ) : (
          <>
            <ReportChartCard title="Students by gender" subtitle={genderSubtitle}>
              <DonutChart
                data={genderChart}
                emptyLabel="Add students to see gender breakdown."
              />
            </ReportChartCard>

            <ReportChartCard title="Students by class" subtitle={classSubtitle}>
              <DonutChart
                data={classChart}
                emptyLabel="Add students to see class breakdown."
              />
            </ReportChartCard>
          </>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-mist" aria-hidden />
            <div>
              <h2 className="font-medium text-cerulean">Select date</h2>
              <p className="text-xs text-mist">Tap a day to change the report period anchor</p>
            </div>
          </div>
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

        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-mist sm:gap-1 sm:text-sm">
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
            const hasData = count > 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDateKey(key);
                  setVisibleMonth(day);
                }}
                className={`relative flex min-h-[44px] flex-col items-center justify-center rounded border py-1 text-sm transition-colors sm:min-h-[48px] ${
                  selected
                    ? "border-cerulean bg-cerulean text-white"
                    : inMonth
                      ? "border-morning bg-white text-cerulean hover:bg-morning/40"
                      : "border-transparent bg-morning/25 text-mist hover:bg-morning/40"
                }`}
              >
                <span className="font-medium">{format(day, "d")}</span>
                {hasData && (
                  <span
                    className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                      selected ? "bg-honey" : "bg-mist"
                    }`}
                    title="Has attendance"
                  />
                )}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

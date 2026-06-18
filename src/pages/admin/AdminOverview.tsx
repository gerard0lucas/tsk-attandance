import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  GraduationCap,
  Percent,
  UserCheck,
  UserX,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { filterAttendance } from "../../lib/attendanceReport";
import {
  branchOverviewRows,
  classOverviewRows,
  genderAttendanceForPeriod,
  genderEnrollmentForBranch,
  periodSummary,
  presentAbsentForPeriod,
  schoolAttendanceRanks,
  schoolOverviewRows,
  scopeActiveStudents,
  scopeRecords,
  studentsBySchoolSlices,
  type DashboardFilters,
} from "../../lib/dashboardAnalytics";
import { dailyAttendanceTrend } from "../../lib/reportAnalytics";
import {
  dashboardAttendanceRange,
  type DashboardAttendancePeriod,
} from "../../lib/reportRanges";
import { APP_NAME } from "../../lib/branding";
import { AttendanceOverviewTable } from "../../components/dashboard/AttendanceOverviewTable";
import { DashboardKpiCard } from "../../components/dashboard/DashboardKpiCard";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { HorizontalPercentChart } from "../../components/dashboard/HorizontalPercentChart";
import { WeeklyTrendChart } from "../../components/dashboard/WeeklyTrendChart";
import { DonutChart } from "../../components/reports/DonutChart";
import { RankingBarChart } from "../../components/reports/RankingBarChart";
import { Select } from "../../components/ui/Select";

const PERIOD_OPTIONS: { value: DashboardAttendancePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export function AdminOverview() {
  const branches = useStore((s) => s.branches);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);

  const [period, setPeriod] = useState<DashboardAttendancePeriod>("today");
  const [branchFilter, setBranchFilter] = useState<"all" | string>("all");
  const [schoolFilter, setSchoolFilter] = useState<"all" | string>("all");
  const [classFilter, setClassFilter] = useState<"all" | string>("all");

  const filters: DashboardFilters = useMemo(
    () => ({ branch: branchFilter, school: schoolFilter, class: classFilter }),
    [branchFilter, schoolFilter, classFilter],
  );

  const { from, to, subtitle } = useMemo(
    () => dashboardAttendanceRange(period),
    [period],
  );

  const schoolOptions = useMemo(() => {
    const scoped = scopeActiveStudents(students, { ...filters, school: "all" });
    return [
      ...new Set(scoped.map((s) => s.schoolName.trim() || "No school listed")),
    ].sort();
  }, [students, filters]);

  const classOptions = useMemo(() => {
    const scoped = scopeActiveStudents(students, { ...filters, class: "all" });
    return [...new Set(scoped.map((s) => s.class.trim()).filter(Boolean))].sort();
  }, [students, filters]);

  const scopedStudents = useMemo(
    () => scopeActiveStudents(students, filters),
    [students, filters],
  );

  const rawPeriodRecords = useMemo(
    () => filterAttendance(attendance, from, to, "all"),
    [attendance, from, to],
  );

  const periodRecords = useMemo(() => {
    const ids = new Set(scopedStudents.map((s) => s.id));
    return scopeRecords(rawPeriodRecords, ids);
  }, [rawPeriodRecords, scopedStudents]);

  const summary = useMemo(
    () => periodSummary(periodRecords, scopedStudents),
    [periodRecords, scopedStudents],
  );

  const attendancePercent =
    summary.totalStudents > 0
      ? Math.round((summary.present / summary.totalStudents) * 1000) / 10
      : 0;

  const branchRows = useMemo(
    () => branchOverviewRows(branches, students, periodRecords, filters),
    [branches, students, periodRecords, filters],
  );

  const schoolRows = useMemo(
    () => schoolOverviewRows(students, periodRecords, filters),
    [students, periodRecords, filters],
  );

  const classRows = useMemo(
    () => classOverviewRows(students, periodRecords, filters),
    [students, periodRecords, filters],
  );

  const dailyTrend = useMemo(
    () => dailyAttendanceTrend(periodRecords, from, to, scopedStudents),
    [periodRecords, from, to, scopedStudents],
  );

  const presentAbsent = useMemo(
    () => presentAbsentForPeriod(periodRecords, scopedStudents),
    [periodRecords, scopedStudents],
  );

  const genderEnrollment = useMemo(
    () => genderEnrollmentForBranch(students, branchFilter),
    [students, branchFilter],
  );

  const genderAttendance = useMemo(
    () => genderAttendanceForPeriod(periodRecords, scopedStudents),
    [periodRecords, scopedStudents],
  );

  const schoolRanks = useMemo(
    () => schoolAttendanceRanks(students, periodRecords, filters),
    [students, periodRecords, filters],
  );

  const schoolSlices = useMemo(
    () => studentsBySchoolSlices(scopedStudents),
    [scopedStudents],
  );

  const topSchoolBars = useMemo(
    () =>
      schoolRanks.top.map((r) => ({
        name: `${r.name} (${r.value}%)`,
        value: r.value,
      })),
    [schoolRanks.top],
  );

  const bottomSchoolBars = useMemo(
    () =>
      schoolRanks.bottom.map((r) => ({
        name: `${r.name} (${r.value}%)`,
        value: r.value,
      })),
    [schoolRanks.bottom],
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-2xl border border-morning/50 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-cerulean sm:text-3xl">
              Branch Attendance
            </h1>
            <p className="mt-1 text-sm text-mist">
              {APP_NAME} · {subtitle}
            </p>
          </div>
          <Link
            to="/admin/reports"
            className="text-sm font-medium text-cerulean hover:underline"
          >
            Full reports →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-morning/40 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashboardAttendancePeriod)}
            options={PERIOD_OPTIONS}
          />
          <Select
            label="Branch"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value as "all" | string)}
            options={[
              { value: "all", label: "All branches" },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
          <Select
            label="School"
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value as "all" | string)}
            options={[
              { value: "all", label: "All schools" },
              ...schoolOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Select
            label="Class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value as "all" | string)}
            options={[
              { value: "all", label: "All classes" },
              ...classOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardKpiCard
          label="Total Students"
          value={summary.totalStudents}
          icon={GraduationCap}
          tone="mist"
        />
        <DashboardKpiCard
          label="Present"
          value={summary.present}
          icon={UserCheck}
          tone="success"
        />
        <DashboardKpiCard
          label="Absent"
          value={summary.absent}
          icon={UserX}
          tone="danger"
        />
        <DashboardKpiCard
          label="Attendance %"
          value={`${attendancePercent}%`}
          icon={Percent}
          tone="cerulean"
        />
        <DashboardKpiCard
          label="Branches"
          value={branches.length}
          icon={Building2}
          tone="honey"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardPanel
          className="xl:col-span-5"
          title="Attendance overview"
          subtitle="By branch"
        >
          <AttendanceOverviewTable
            rows={branchRows}
            nameLabel="Branch"
            metaLabel="City"
            emptyLabel="No branch data for current filters."
          />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-4"
          title="Attendance trend"
          subtitle={subtitle}
        >
          <WeeklyTrendChart
            data={dailyTrend}
            emptyLabel="No attendance in this period."
          />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-3"
          title="Attendance % by branch"
          subtitle="Current period"
        >
          <HorizontalPercentChart
            rows={branchRows}
            emptyLabel="No branch attendance data."
          />
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardPanel
          className="xl:col-span-5"
          title="School-wise summary"
          subtitle="Attendance by school"
        >
          <AttendanceOverviewTable
            rows={schoolRows}
            nameLabel="School"
            emptyLabel="Add school names to student records."
          />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-3"
          title="Present vs absent"
          subtitle="Overall split"
        >
          <DonutChart
            data={presentAbsent}
            emptyLabel="No attendance data for current filters."
          />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-4"
          title="Students by school"
          subtitle="Enrollment distribution"
        >
          <DonutChart
            data={schoolSlices}
            emptyLabel="No school data for current filters."
          />
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardPanel
          className="xl:col-span-5"
          title="Class-wise attendance"
          subtitle="By class"
        >
          <AttendanceOverviewTable
            rows={classRows}
            nameLabel="Class"
            emptyLabel="No class data for current filters."
          />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-3"
          title="Male & female students"
          subtitle={
            branchFilter === "all" ? "All branches" : "Selected branch"
          }
        >
          <DonutChart
            data={genderEnrollment}
            emptyLabel="No students in scope."
          />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-4"
          title="Male & female attendance"
          subtitle="Present in period"
        >
          <DonutChart
            data={genderAttendance}
            emptyLabel="No attendance in period."
          />
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DashboardPanel title="Top 5 schools" subtitle="Highest attendance %">
          <RankingBarChart
            data={topSchoolBars}
            emptyLabel="Not enough school data."
          />
        </DashboardPanel>

        <DashboardPanel title="Lowest 5 schools" subtitle="Lowest attendance %">
          <RankingBarChart
            data={bottomSchoolBars}
            emptyLabel="Not enough school data."
            accent="#7a9d96"
          />
        </DashboardPanel>
      </div>

      <p className="text-xs text-mist">
        Attendance is tracked when students scan QR or are marked present by staff.
        Use filters above to narrow by period, branch, school, or class.
      </p>
    </div>
  );
}

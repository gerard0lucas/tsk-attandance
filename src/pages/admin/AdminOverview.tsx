import { useEffect, useMemo, useState } from "react";
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
import {
  dailyAttendanceTrend,
  formatAttendanceTrendSubtitle,
  REPORT_CHART_COLORS,
} from "../../lib/reportAnalytics";
import {
  dashboardAttendanceRange,
  type DashboardAttendancePeriod,
} from "../../lib/reportRanges";
import { APP_NAME } from "../../lib/branding";
import {
  countActiveStudentsByBranch,
  listAttendanceInRange,
  listStudentsByBranch,
} from "../../lib/db";
import { AttendanceOverviewTable } from "../../components/dashboard/AttendanceOverviewTable";
import { DashboardKpiCard } from "../../components/dashboard/DashboardKpiCard";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { HorizontalPercentChart } from "../../components/dashboard/HorizontalPercentChart";
import { WeeklyTrendChart } from "../../components/dashboard/WeeklyTrendChart";
import { DonutChart } from "../../components/reports/DonutChart";
import { RankingBarChart } from "../../components/reports/RankingBarChart";
import { Select } from "../../components/ui/Select";
import type { AttendanceRecord, Student } from "../../types";

const PERIOD_OPTIONS: { value: DashboardAttendancePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export function AdminOverview() {
  const branches = useStore((s) => s.branches);

  const [period, setPeriod] = useState<DashboardAttendancePeriod>("today");
  const [branchFilter, setBranchFilter] = useState<"all" | string>("all");
  const [schoolFilter, setSchoolFilter] = useState<"all" | string>("all");
  const [classFilter, setClassFilter] = useState<"all" | string>("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const filters: DashboardFilters = useMemo(
    () => ({ branch: branchFilter, school: schoolFilter, class: classFilter }),
    [branchFilter, schoolFilter, classFilter],
  );

  const { from, to, subtitle } = useMemo(
    () => dashboardAttendanceRange(period),
    [period],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const branchId = branchFilter === "all" ? undefined : branchFilter;
        const [records, counts, branchStudents] = await Promise.all([
          listAttendanceInRange({ from, to, branchId }),
          countActiveStudentsByBranch(),
          branchId
            ? listStudentsByBranch(branchId, { activeOnly: true })
            : Promise.resolve([] as Student[]),
        ]);
        if (cancelled) return;
        setAttendance(records);
        setBranchCounts(counts);
        setStudents(branchStudents);
        if (branchFilter === "all") {
          setSchoolFilter("all");
          setClassFilter("all");
        }
      } catch {
        if (!cancelled) {
          setAttendance([]);
          setStudents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to, branchFilter]);

  /** Active enrollment used for trends — count only, no stub rows. */
  const totalActiveEnrollment = useMemo(
    () => Object.values(branchCounts).reduce((a, b) => a + b, 0),
    [branchCounts],
  );

  const schoolOptions = useMemo(() => {
    if (branchFilter === "all") return [];
    const scoped = scopeActiveStudents(students, { ...filters, school: "all" });
    return [
      ...new Set(scoped.map((s) => s.schoolName.trim() || "No school listed")),
    ].sort();
  }, [students, filters, branchFilter]);

  const classOptions = useMemo(() => {
    if (branchFilter === "all") return [];
    const scoped = scopeActiveStudents(students, { ...filters, class: "all" });
    return [...new Set(scoped.map((s) => s.class.trim()).filter(Boolean))].sort();
  }, [students, filters, branchFilter]);

  const scopedStudents = useMemo(() => {
    if (branchFilter === "all") return [];
    return scopeActiveStudents(students, filters);
  }, [branchFilter, students, filters]);

  const rawPeriodRecords = useMemo(
    () => filterAttendance(attendance, from, to, "all"),
    [attendance, from, to],
  );

  const periodRecords = useMemo(() => {
    if (branchFilter === "all") return rawPeriodRecords;
    const ids = new Set(scopedStudents.map((s) => s.id));
    return scopeRecords(rawPeriodRecords, ids);
  }, [rawPeriodRecords, scopedStudents, branchFilter]);

  const summary = useMemo(() => {
    if (branchFilter === "all") {
      const present = new Set(periodRecords.map((r) => r.studentId)).size;
      return {
        totalStudents: totalActiveEnrollment,
        present,
        absent: Math.max(totalActiveEnrollment - present, 0),
      };
    }
    return periodSummary(periodRecords, scopedStudents);
  }, [branchFilter, totalActiveEnrollment, periodRecords, scopedStudents]);

  const attendancePercent =
    summary.totalStudents > 0
      ? Math.round((summary.present / summary.totalStudents) * 1000) / 10
      : 0;

  const branchRows = useMemo(() => {
    if (branchFilter === "all") {
      const presentByBranch = new Map<string, Set<string>>();
      for (const r of periodRecords) {
        let set = presentByBranch.get(r.branchId);
        if (!set) {
          set = new Set();
          presentByBranch.set(r.branchId, set);
        }
        set.add(r.studentId);
      }
      return branches.map((branch) => {
        const total = branchCounts[branch.id] ?? 0;
        const present = presentByBranch.get(branch.id)?.size ?? 0;
        return {
          name: branch.name,
          meta: branch.city || undefined,
          total,
          present,
          absent: Math.max(total - present, 0),
          percent: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
        };
      });
    }
    return branchOverviewRows(branches, students, periodRecords, filters);
  }, [branchFilter, periodRecords, branches, branchCounts, students, filters]);

  const schoolRows = useMemo(
    () =>
      branchFilter === "all"
        ? []
        : schoolOverviewRows(students, periodRecords, filters),
    [branchFilter, students, periodRecords, filters],
  );

  const classRows = useMemo(
    () =>
      branchFilter === "all"
        ? []
        : classOverviewRows(students, periodRecords, filters),
    [branchFilter, students, periodRecords, filters],
  );

  const dailyTrend = useMemo(() => {
    if (branchFilter === "all") {
      // only length matters for absent calc
      const countProxy = { length: totalActiveEnrollment } as unknown as Student[];
      return dailyAttendanceTrend(periodRecords, from, to, countProxy);
    }
    return dailyAttendanceTrend(periodRecords, from, to, scopedStudents);
  }, [branchFilter, totalActiveEnrollment, periodRecords, from, to, scopedStudents]);

  const trendSubtitle = useMemo(
    () => formatAttendanceTrendSubtitle(dailyTrend),
    [dailyTrend],
  );

  const presentAbsent = useMemo(() => {
    if (branchFilter === "all") {
      if (totalActiveEnrollment === 0) return [];
      return [
        {
          name: "Present",
          value: summary.present,
          fill: REPORT_CHART_COLORS.cerulean,
        },
        {
          name: "Absent",
          value: summary.absent,
          fill: REPORT_CHART_COLORS.morning,
        },
      ];
    }
    return presentAbsentForPeriod(periodRecords, scopedStudents);
  }, [branchFilter, totalActiveEnrollment, summary, periodRecords, scopedStudents]);

  const genderEnrollment = useMemo(
    () =>
      branchFilter === "all"
        ? []
        : genderEnrollmentForBranch(students, branchFilter),
    [students, branchFilter],
  );

  const genderAttendance = useMemo(
    () =>
      branchFilter === "all"
        ? []
        : genderAttendanceForPeriod(periodRecords, scopedStudents),
    [branchFilter, periodRecords, scopedStudents],
  );

  const schoolRanks = useMemo(
    () =>
      branchFilter === "all"
        ? { top: [], bottom: [] }
        : schoolAttendanceRanks(students, periodRecords, filters),
    [branchFilter, students, periodRecords, filters],
  );

  const schoolSlices = useMemo(
    () => (branchFilter === "all" ? [] : studentsBySchoolSlices(scopedStudents)),
    [branchFilter, scopedStudents],
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
              {loading ? " · Loading…" : ""}
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
            onChange={(e) => {
              setBranchFilter(e.target.value as "all" | string);
              setSchoolFilter("all");
              setClassFilter("all");
            }}
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
              {
                value: "all",
                label: branchFilter === "all" ? "Select a branch first" : "All schools",
              },
              ...schoolOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Select
            label="Class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value as "all" | string)}
            options={[
              {
                value: "all",
                label: branchFilter === "all" ? "Select a branch first" : "All classes",
              },
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
          subtitle={trendSubtitle}
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
          subtitle={
            branchFilter === "all" ? "Select a branch to see schools" : "Attendance by school"
          }
        >
          <AttendanceOverviewTable
            rows={schoolRows}
            nameLabel="School"
            emptyLabel={
              branchFilter === "all"
                ? "Select a branch to load school breakdown."
                : "Add school names to student records."
            }
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
            emptyLabel={
              branchFilter === "all"
                ? "Select a branch to load enrollment."
                : "No school data for current filters."
            }
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
            emptyLabel={
              branchFilter === "all"
                ? "Select a branch to load class breakdown."
                : "No class data for current filters."
            }
          />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-3"
          title="Male & female students"
          subtitle={
            branchFilter === "all" ? "Select a branch" : "Selected branch"
          }
        >
          <DonutChart
            data={genderEnrollment}
            emptyLabel={
              branchFilter === "all"
                ? "Select a branch for gender enrollment."
                : "No students in scope."
            }
          />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-4"
          title="Male & female attendance"
          subtitle="Present in period"
        >
          <DonutChart
            data={genderAttendance}
            emptyLabel={
              branchFilter === "all"
                ? "Select a branch for gender attendance."
                : "No attendance in period."
            }
          />
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DashboardPanel title="Top 5 schools" subtitle="Highest attendance %">
          <RankingBarChart
            data={topSchoolBars}
            emptyLabel={
              branchFilter === "all"
                ? "Select a branch for school rankings."
                : "Not enough school data."
            }
          />
        </DashboardPanel>

        <DashboardPanel title="Lowest 5 schools" subtitle="Lowest attendance %">
          <RankingBarChart
            data={bottomSchoolBars}
            emptyLabel={
              branchFilter === "all"
                ? "Select a branch for school rankings."
                : "Not enough school data."
            }
            accent="#7a9d96"
          />
        </DashboardPanel>
      </div>

      <p className="text-xs text-mist">
        Attendance is tracked when students scan QR or are marked present by staff.
        School and class filters load after you select a branch (keeps large orgs fast).
      </p>
    </div>
  );
}

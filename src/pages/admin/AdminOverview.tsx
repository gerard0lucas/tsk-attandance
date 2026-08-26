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
} from "../../lib/reportAnalytics";
import {
  dashboardAttendanceRange,
  formatDateRangeLabel,
  normalizeDateRange,
  type DashboardAttendancePeriod,
} from "../../lib/reportRanges";
import { APP_NAME } from "../../lib/branding";
import { compareClass } from "../../lib/student";
import { listAttendanceInRange, listStudentsByBranch } from "../../lib/db";
import { AttendanceOverviewTable } from "../../components/dashboard/AttendanceOverviewTable";
import { DashboardKpiCard } from "../../components/dashboard/DashboardKpiCard";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { HorizontalPercentChart } from "../../components/dashboard/HorizontalPercentChart";
import { WeeklyTrendChart } from "../../components/dashboard/WeeklyTrendChart";
import { DonutChart } from "../../components/reports/DonutChart";
import { RankingBarChart } from "../../components/reports/RankingBarChart";
import { DateRangeFields } from "../../components/DateRangeFields";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import type { AttendanceRecord, Student } from "../../types";

const PERIOD_OPTIONS: { value: DashboardAttendancePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

const SCHOOL_PAGE_SIZE = 8;

export function AdminOverview() {
  const branches = useStore((s) => s.branches);

  const [period, setPeriod] = useState<DashboardAttendancePeriod>("today");
  const initialRange = dashboardAttendanceRange("today");
  const [rangeFrom, setRangeFrom] = useState(initialRange.from);
  const [rangeTo, setRangeTo] = useState(initialRange.to);
  const [branchFilter, setBranchFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<"all" | string>("all");
  const [classFilter, setClassFilter] = useState<"all" | string>("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [schoolPage, setSchoolPage] = useState(1);
  const [showFilterErrors, setShowFilterErrors] = useState(false);

  useEffect(() => {
    if (!branchFilter && branches[0]?.id) {
      setBranchFilter(branches[0].id);
    }
  }, [branches, branchFilter]);

  const filters: DashboardFilters = useMemo(
    () => ({
      branch: branchFilter || "all",
      school: schoolFilter,
      class: classFilter,
    }),
    [branchFilter, schoolFilter, classFilter],
  );

  const range = useMemo(
    () => normalizeDateRange(rangeFrom, rangeTo),
    [rangeFrom, rangeTo],
  );
  const from = range.from;
  const to = range.to;

  const subtitle = useMemo(() => {
    if (period === "custom") {
      return `Custom · ${formatDateRangeLabel(from, to)}`;
    }
    return dashboardAttendanceRange(period).subtitle;
  }, [period, from, to]);

  const branchError =
    showFilterErrors && !branchFilter ? "Branch is required." : undefined;
  const fromError =
    showFilterErrors && !rangeFrom ? "From date is required." : undefined;
  const toError = showFilterErrors && !rangeTo ? "To date is required." : undefined;
  const filtersReady = Boolean(branchFilter && rangeFrom && rangeTo);

  const onPeriodChange = (next: DashboardAttendancePeriod) => {
    if (next !== "custom") {
      const current = dashboardAttendanceRange(next);
      setRangeFrom(current.from);
      setRangeTo(current.to);
    }
    setPeriod(next);
  };

  const onFromChange = (value: string) => {
    setRangeFrom(value);
    setPeriod("custom");
  };

  const onToChange = (value: string) => {
    setRangeTo(value);
    setPeriod("custom");
  };

  useEffect(() => {
    if (!filtersReady) {
      setAttendance([]);
      setStudents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [records, branchStudents] = await Promise.all([
          listAttendanceInRange({ from, to, branchId: branchFilter }),
          listStudentsByBranch(branchFilter, { activeOnly: true }),
        ]);
        if (cancelled) return;
        setAttendance(records);
        setStudents(branchStudents);
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
  }, [filtersReady, from, to, branchFilter]);

  const schoolOptions = useMemo(() => {
    if (!branchFilter) return [];
    const scoped = scopeActiveStudents(students, { ...filters, school: "all" });
    return [
      ...new Set(scoped.map((s) => s.schoolName.trim() || "No school listed")),
    ].sort();
  }, [students, filters, branchFilter]);

  const classOptions = useMemo(() => {
    if (!branchFilter) return [];
    const scoped = scopeActiveStudents(students, { ...filters, class: "all" });
    return [...new Set(scoped.map((s) => s.class.trim()).filter(Boolean))].sort(
      compareClass,
    );
  }, [students, filters, branchFilter]);

  const scopedStudents = useMemo(() => {
    if (!branchFilter) return [];
    return scopeActiveStudents(students, filters);
  }, [branchFilter, students, filters]);

  const rawPeriodRecords = useMemo(
    () => filterAttendance(attendance, from, to, "all"),
    [attendance, from, to],
  );

  const periodRecords = useMemo(() => {
    if (!branchFilter) return [];
    const ids = new Set(scopedStudents.map((s) => s.id));
    return scopeRecords(rawPeriodRecords, ids);
  }, [rawPeriodRecords, scopedStudents, branchFilter]);

  const summary = useMemo(() => {
    if (!branchFilter) {
      return { totalStudents: 0, present: 0, absent: 0 };
    }
    return periodSummary(periodRecords, scopedStudents);
  }, [branchFilter, periodRecords, scopedStudents]);

  const attendancePercent =
    summary.totalStudents > 0
      ? Math.round((summary.present / summary.totalStudents) * 1000) / 10
      : 0;

  const branchRows = useMemo(() => {
    if (!branchFilter) return [];
    return branchOverviewRows(branches, students, periodRecords, filters);
  }, [branchFilter, periodRecords, branches, students, filters]);

  const schoolRows = useMemo(
    () =>
      !branchFilter ? [] : schoolOverviewRows(students, periodRecords, filters),
    [branchFilter, students, periodRecords, filters],
  );

  useEffect(() => {
    setSchoolPage(1);
  }, [branchFilter, schoolFilter, classFilter, period, from, to]);

  const schoolTotalPages = Math.max(1, Math.ceil(schoolRows.length / SCHOOL_PAGE_SIZE));
  const pagedSchoolRows = useMemo(() => {
    const page = Math.min(schoolPage, schoolTotalPages);
    const start = (page - 1) * SCHOOL_PAGE_SIZE;
    return schoolRows.slice(start, start + SCHOOL_PAGE_SIZE);
  }, [schoolRows, schoolPage, schoolTotalPages]);

  const classRows = useMemo(
    () =>
      !branchFilter ? [] : classOverviewRows(students, periodRecords, filters),
    [branchFilter, students, periodRecords, filters],
  );

  const dailyTrend = useMemo(() => {
    if (!branchFilter) return [];
    return dailyAttendanceTrend(periodRecords, from, to, scopedStudents);
  }, [branchFilter, periodRecords, from, to, scopedStudents]);

  const trendSubtitle = useMemo(
    () => formatAttendanceTrendSubtitle(dailyTrend),
    [dailyTrend],
  );

  const presentAbsent = useMemo(() => {
    if (!branchFilter) return [];
    return presentAbsentForPeriod(periodRecords, scopedStudents);
  }, [branchFilter, periodRecords, scopedStudents]);

  const genderEnrollment = useMemo(
    () => (!branchFilter ? [] : genderEnrollmentForBranch(students, branchFilter)),
    [students, branchFilter],
  );

  const genderAttendance = useMemo(
    () =>
      !branchFilter ? [] : genderAttendanceForPeriod(periodRecords, scopedStudents),
    [branchFilter, periodRecords, scopedStudents],
  );

  const schoolRanks = useMemo(
    () =>
      !branchFilter
        ? { top: [], bottom: [] }
        : schoolAttendanceRanks(students, periodRecords, filters),
    [branchFilter, students, periodRecords, filters],
  );

  const schoolSlices = useMemo(
    () => (!branchFilter ? [] : studentsBySchoolSlices(scopedStudents)),
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
              {APP_NAME} · {filtersReady ? subtitle : "Select required filters"}
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
            onChange={(e) => onPeriodChange(e.target.value as DashboardAttendancePeriod)}
            options={PERIOD_OPTIONS}
          />
          <Select
            label="Branch"
            required
            value={branchFilter}
            error={branchError}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setSchoolFilter("all");
              setClassFilter("all");
              setShowFilterErrors(true);
            }}
            onBlur={() => setShowFilterErrors(true)}
            options={[
              { value: "", label: "Select branch" },
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
                label: branchFilter ? "All schools" : "Select a branch first",
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
                label: branchFilter ? "All classes" : "Select a branch first",
              },
              ...classOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>

        <div className="mt-3">
          <DateRangeFields
            required
            from={rangeFrom}
            to={rangeTo}
            fromError={fromError}
            toError={toError}
            onFromChange={(value) => {
              onFromChange(value);
              setShowFilterErrors(true);
            }}
            onToChange={(value) => {
              onToChange(value);
              setShowFilterErrors(true);
            }}
          />
        </div>
      </div>

      {!filtersReady ? (
        <p className="rounded border border-morning bg-white px-4 py-6 text-center text-sm text-mist">
          Select a branch and date range to load dashboard data.
        </p>
      ) : (
        <>
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
            !branchFilter ? "Select a branch to see schools" : "Attendance by school"
          }
        >
          <AttendanceOverviewTable
            rows={pagedSchoolRows}
            nameLabel="School"
            emptyLabel={
              !branchFilter
                ? "Select a branch to load school breakdown."
                : "Add school names to student records."
            }
          />
          {schoolRows.length > SCHOOL_PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={schoolPage <= 1}
                onClick={() => setSchoolPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-mist">
                Page {Math.min(schoolPage, schoolTotalPages)} of {schoolTotalPages}
                {" "}
                · {schoolRows.length} schools
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={schoolPage >= schoolTotalPages}
                onClick={() =>
                  setSchoolPage((p) => Math.min(schoolTotalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          )}
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
              !branchFilter
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
              !branchFilter
                ? "Select a branch to load class breakdown."
                : "No class data for current filters."
            }
          />
        </DashboardPanel>

        <DashboardPanel
          className="xl:col-span-3"
          title="Male & female students"
          subtitle={
            !branchFilter ? "Select a branch" : "Selected branch"
          }
        >
          <DonutChart
            data={genderEnrollment}
            emptyLabel={
              !branchFilter
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
              !branchFilter
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
              !branchFilter
                ? "Select a branch for school rankings."
                : "Not enough school data."
            }
          />
        </DashboardPanel>

        <DashboardPanel title="Lowest 5 schools" subtitle="Lowest attendance %">
          <RankingBarChart
            data={bottomSchoolBars}
            emptyLabel={
              !branchFilter
                ? "Select a branch for school rankings."
                : "Not enough school data."
            }
            accent="#7a9d96"
          />
        </DashboardPanel>
      </div>

        </>
      )}

      <p className="text-xs text-mist">
        Attendance is tracked when students scan QR or are marked present by staff.
        Branch and date range are required. School and class filters load after you select a branch.
      </p>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import {
  dashboardAttendanceRange,
  isDateKeyInRange,
  type DashboardAttendancePeriod,
} from "../lib/reportRanges";
import { branchListTitle } from "../lib/branch";
import { Card } from "./ui/Card";
import { Select } from "./ui/Select";

const PERIOD_OPTIONS: { value: DashboardAttendancePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

type BranchAttendanceSectionProps = {
  reportsPath?: string;
};

export function BranchAttendanceSection({ reportsPath = "/admin/reports" }: BranchAttendanceSectionProps) {
  const branches = useStore((s) => s.branches);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);

  const [period, setPeriod] = useState<DashboardAttendancePeriod>("today");

  const { from, to, title, subtitle } = useMemo(
    () => dashboardAttendanceRange(period),
    [period],
  );

  const periodRecords = useMemo(
    () => attendance.filter((r) => isDateKeyInRange(r.date, from, to)),
    [attendance, from, to],
  );

  const branchRows = useMemo(
    () =>
      branches.map((branch) => {
        const studentCount = students.filter(
          (s) => s.branchId === branch.id && s.active,
        ).length;
        const records = periodRecords.filter((r) => r.branchId === branch.id);
        const uniquePresent = new Set(records.map((r) => r.studentId)).size;

        return {
          branch,
          studentCount,
          checkIns: records.length,
          uniquePresent,
        };
      }),
    [branches, students, periodRecords],
  );

  const isToday = period === "today";

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-medium text-cerulean">{title}</h2>
          <p className="mt-0.5 text-sm text-mist">{subtitle}</p>
        </div>
        <Select
          label="View"
          value={period}
          onChange={(e) => setPeriod(e.target.value as DashboardAttendancePeriod)}
          options={PERIOD_OPTIONS}
          wrapperClassName="w-full shrink-0 sm:w-44"
          aria-label="Attendance period"
        />
      </div>

      {branches.length === 0 ? (
        <p className="text-sm text-mist">No branches yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {branchRows.map(({ branch, studentCount, checkIns, uniquePresent }) => (
            <li
              key={branch.id}
              className="flex flex-col gap-1 border-b border-morning py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="font-medium text-cerulean">{branchListTitle(branch)}</span>
                <span className="block text-mist sm:inline sm:before:content-['·'] sm:before:mx-1">
                  {studentCount} students
                </span>
              </span>
              <span className="shrink-0 font-medium text-honey">
                {isToday
                  ? `${uniquePresent} present`
                  : `${uniquePresent} students · ${checkIns} check-ins`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 border-t border-morning pt-3 text-sm">
        <Link to={reportsPath} className="font-medium text-cerulean hover:underline">
          View full history &amp; export →
        </Link>
      </p>
    </Card>
  );
}

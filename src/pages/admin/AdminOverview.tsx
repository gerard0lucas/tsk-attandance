import { useStore } from "../../store/useStore";
import { StatCard } from "../../components/StatCard";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { todayKey, formatTime } from "../../lib/dates";

export function AdminOverview() {
  const branches = useStore((s) => s.branches);
  const students = useStore((s) => s.students);
  const managers = useStore((s) => s.managers);
  const attendance = useStore((s) => s.attendance);
  const getStudent = useStore((s) => s.getStudent);
  const getBranch = useStore((s) => s.getBranch);

  const today = todayKey();
  const todayRecords = attendance.filter((a) => a.date === today);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Overview" subtitle="All branches" />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Branches" value={branches.length} />
        <StatCard label="Managers" value={managers.length} />
        <StatCard label="Students" value={students.length} />
        <StatCard label="Present today" value={todayRecords.length} />
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-cerulean">Branches today</h2>
        <ul className="space-y-2 text-sm">
          {branches.map((b) => {
            const count = students.filter((s) => s.branchId === b.id).length;
            const present = todayRecords.filter((a) => a.branchId === b.id).length;
            return (
              <li
                key={b.id}
                className="flex flex-col gap-1 border-b border-morning py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0">
                  <span className="font-medium text-cerulean">{b.name}</span>
                  <span className="block text-mist sm:inline sm:before:content-['·'] sm:before:mx-1">
                    {count} students
                  </span>
                </span>
                <span className="shrink-0 font-medium text-honey">{present} present</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium text-cerulean">Recent check-ins</h2>
        {todayRecords.length === 0 ? (
          <p className="text-sm text-mist">No check-ins today.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {[...todayRecords]
              .sort((a, b) => b.markedAt.localeCompare(a.markedAt))
              .slice(0, 10)
              .map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-0.5 border-b border-morning py-2 last:border-0 sm:flex-row sm:justify-between"
                >
                  <span className="font-medium text-cerulean">
                    {getStudent(r.studentId)?.name}
                  </span>
                  <span className="text-mist">
                    {getBranch(r.branchId)?.name} · {formatTime(r.markedAt)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

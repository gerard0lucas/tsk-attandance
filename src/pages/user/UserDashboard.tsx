import { Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { StatCard } from "../../components/StatCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { todayKey, formatTime } from "../../lib/dates";

export function UserDashboard() {
  const session = useStore((s) => s.session);
  const getStudent = useStore((s) => s.getStudent);
  const getBranch = useStore((s) => s.getBranch);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);

  const branchId = session?.branchId;
  const today = todayKey();
  const branchStudents = branchId
    ? students.filter((s) => s.branchId === branchId && s.active)
    : [];
  const todayAttendance = attendance.filter(
    (a) => a.branchId === branchId && a.date === today,
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={getBranch(branchId ?? "")?.name ?? "Your branch"}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link to="/user/scan" className="block w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Scan QR</Button>
            </Link>
            <Link to="/user/attendance" className="block w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                Edit attendance
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4">
        <StatCard label="Students" value={branchStudents.length} />
        <StatCard label="Present today" value={todayAttendance.length} />
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-cerulean">Checked in today</h2>
        {todayAttendance.length === 0 ? (
          <p className="text-sm text-mist">No check-ins yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {todayAttendance.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-0.5 border-b border-morning py-2 last:border-0 sm:flex-row sm:justify-between"
              >
                <span className="font-medium text-cerulean">
                  {getStudent(r.studentId)?.name}
                </span>
                <span className="text-mist">{formatTime(r.markedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

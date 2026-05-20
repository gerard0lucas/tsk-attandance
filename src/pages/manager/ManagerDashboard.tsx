import { Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { StatCard } from "../../components/StatCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { todayKey, formatTime } from "../../lib/dates";

export function ManagerDashboard() {
  const getStudent = useStore((s) => s.getStudent);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);

  const today = todayKey();
  const activeStudents = students.filter((s) => s.active);
  const todayAttendance = attendance.filter((a) => a.date === today);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Today: ${today}`}
        action={
          <Link to="/manager/scan" className="block w-full sm:inline-block sm:w-auto">
            <Button className="w-full sm:w-auto">Scan QR</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3 sm:gap-4 [&>*]:min-w-0">
        <StatCard label="Students" value={activeStudents.length} />
        <StatCard label="Present" value={todayAttendance.length} />
        <StatCard label="Absent" value={activeStudents.length - todayAttendance.length} />
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-cerulean">Checked in today</h2>
        {todayAttendance.length === 0 ? (
          <p className="text-sm text-mist">No one yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {todayAttendance.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-0.5 border-b border-morning py-2 last:border-0 sm:flex-row sm:justify-between"
              >
                <span className="font-medium text-cerulean">
                  {getStudent(r.studentId)?.name}
                  <span className="block text-xs font-normal text-mist">
                    {getStudent(r.studentId)?.rollNumber} · {getStudent(r.studentId)?.class}
                  </span>
                </span>
                <span className="text-mist">{formatTime(r.markedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-medium text-cerulean">Not checked in</h2>
        <ul className="space-y-2 text-sm">
          {activeStudents
            .filter((s) => !todayAttendance.some((a) => a.studentId === s.id))
            .map((s) => (
              <li key={s.id} className="border-b border-morning py-2 last:border-0">
                <span className="font-medium text-cerulean">{s.name}</span>{" "}
                <span className="text-mist">
                  ({s.rollNumber} · {s.class})
                </span>
              </li>
            ))}
          {activeStudents.length === todayAttendance.length && activeStudents.length > 0 && (
            <li className="text-green-700">Everyone is here.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Eye } from "lucide-react";
import { useStore } from "../store/useStore";
import { Badge } from "../components/ui/Badge";
import { Card, CardRow } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { StudentPhoto } from "../components/StudentPhoto";
import {
  TableWrap,
  tableActionsCell,
  tableCell,
  tableCellMuted,
  tableHeadCell,
} from "../components/ui/TableWrap";
import { formatTime, todayKey } from "../lib/dates";
import { formatReportDate } from "../lib/attendanceReport";
import type { AttendanceRecord, Student, UserRole } from "../types";

function studentProfilePath(role: UserRole | undefined, studentId: string): string {
  const base = role === "admin" ? "/admin" : role === "user" ? "/user" : "/manager";
  return `${base}/students/${studentId}`;
}

type StudentAttendanceRow = {
  student: Student;
  record?: AttendanceRecord;
  present: boolean;
};

export function AttendanceEditPage() {
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const branches = useStore((s) => s.branches);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);
  const getBranch = useStore((s) => s.getBranch);
  const getMarkedByName = useStore((s) => s.getMarkedByName);
  const markAttendanceForDate = useStore((s) => s.markAttendanceForDate);
  const deleteAttendance = useStore((s) => s.deleteAttendance);

  const isAdmin = session?.role === "admin";
  const [selectedBranch, setSelectedBranch] = useState(
    () => session?.branchId ?? branches[0]?.id ?? "",
  );
  const branchId = isAdmin ? selectedBranch : session?.branchId;
  const [filterDate, setFilterDate] = useState(todayKey);

  const branchStudents = useMemo(
    () => (branchId ? students.filter((s) => s.branchId === branchId && s.active) : []),
    [students, branchId],
  );

  const records = useMemo(() => {
    if (!branchId) return new Map<string, AttendanceRecord>();
    const byStudent = new Map<string, AttendanceRecord>();
    for (const record of attendance) {
      if (record.branchId === branchId && record.date === filterDate) {
        byStudent.set(record.studentId, record);
      }
    }
    return byStudent;
  }, [attendance, branchId, filterDate]);

  const studentRows = useMemo<StudentAttendanceRow[]>(() => {
    return branchStudents
      .map((student) => {
        const record = records.get(student.id);
        return { student, record, present: Boolean(record) };
      })
      .sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [branchStudents, records]);

  const presentCount = studentRows.filter((row) => row.present).length;
  const absentCount = studentRows.length - presentCount;

  const openProfile = (studentId: string) => {
    navigate(studentProfilePath(session?.role, studentId));
  };

  const markPresent = async (student: Student) => {
    if (!session) return;
    const res = await markAttendanceForDate(student.id, filterDate, session.userId);
    await Swal.fire({
      icon: res.ok ? "success" : "error",
      title: res.ok ? "Marked present" : "Could not mark",
      text: res.ok ? `${student.name} · ${formatReportDate(filterDate)}` : res.message,
      confirmButtonColor: "#00303f",
      timer: res.ok ? 1500 : undefined,
      showConfirmButton: !res.ok,
    });
  };

  const markAbsent = async (record: AttendanceRecord, studentName: string) => {
    const result = await Swal.fire({
      title: "Mark absent?",
      text: `Mark ${studentName} absent for ${formatReportDate(filterDate)}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Mark absent",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#7a9d96",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAttendance(record.id);
      await Swal.fire({
        icon: "success",
        title: "Marked absent",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Could not remove",
        text: "You can only change attendance for students in your branch.",
        confirmButtonColor: "#00303f",
      });
    }
  };

  if (!branchId) {
    return (
      <p className="text-sm text-mist">
        {isAdmin
          ? "Add a branch first to manage attendance."
          : "No branch assigned to your account. Ask admin to assign your branch."}
      </p>
    );
  }

  const branchLabel = getBranch(branchId)?.name ?? "Branch";
  const dateLabel = formatReportDate(filterDate);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Attendance"
        subtitle={
          isAdmin
            ? "See who was present, open student profiles, and mark or remove attendance"
            : `${branchLabel} — mark present or view student attendance history`
        }
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {isAdmin && (
            <Select
              label="Branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
          <Input
            label="Attendance date"
            type="date"
            value={filterDate}
            max={todayKey()}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-morning pt-4 text-sm">
          <span className="rounded-full bg-morning/40 px-3 py-1 text-cerulean">
            {studentRows.length} students
          </span>
          <span className="rounded-full bg-morning/40 px-3 py-1 text-cerulean">
            {presentCount} present
          </span>
          <span className="rounded-full bg-morning/40 px-3 py-1 text-cerulean">
            {absentCount} absent
          </span>
          <span className="text-mist">{dateLabel}</span>
        </div>
      </Card>

      <div className="space-y-3 md:hidden">
        {studentRows.map(({ student, record, present }) => (
          <CardRow
            key={student.id}
            actions={
              <div className="flex w-full flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => openProfile(student.id)}
                >
                  <Eye className="h-4 w-4" aria-hidden />
                  Profile
                </Button>
                {present && record ? (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={() => void markAbsent(record, student.name)}
                  >
                    Absent
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => void markPresent(student)}
                  >
                    Present
                  </Button>
                )}
              </div>
            }
          >
            <div className="flex gap-3">
              <StudentPhoto student={student} size="md" />
              <div className="min-w-0">
                <p className="font-medium text-cerulean">{student.name}</p>
                <p className="text-sm text-mist">
                  Roll {student.rollNumber} · Class {student.class}
                </p>
                {present && record ? (
                  <p className="mt-1 text-xs text-mist">
                    {formatTime(record.markedAt)} · {getMarkedByName(record.markedById)}
                  </p>
                ) : null}
                <div className="mt-2">
                  {present ? (
                    <Badge tone="success">Present</Badge>
                  ) : (
                    <Badge tone="neutral">Absent</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardRow>
        ))}
        {studentRows.length === 0 && (
          <p className="text-sm text-mist">No active students in this branch.</p>
        )}
      </div>

      <Card padding="sm" className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-morning">
                <th className={tableHeadCell}>Student</th>
                <th className={tableHeadCell}>Roll</th>
                <th className={tableHeadCell}>Class</th>
                <th className={tableHeadCell}>Status</th>
                <th className={tableHeadCell}>Checked in</th>
                <th className={tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map(({ student, record, present }) => (
                <tr key={student.id} className="border-b border-morning last:border-0">
                  <td className={tableCell}>
                    <div className="flex items-center gap-3">
                      <StudentPhoto student={student} size="sm" />
                      <span className="font-medium">{student.name}</span>
                    </div>
                  </td>
                  <td className={tableCellMuted}>{student.rollNumber}</td>
                  <td className={tableCell}>{student.class}</td>
                  <td className={tableCell}>
                    {present ? (
                      <Badge tone="success">Present</Badge>
                    ) : (
                      <Badge tone="neutral">Absent</Badge>
                    )}
                  </td>
                  <td className={tableCellMuted}>
                    {present && record
                      ? `${formatTime(record.markedAt)} · ${getMarkedByName(record.markedById)}`
                      : "—"}
                  </td>
                  <td className={`${tableActionsCell} text-left`}>
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-[5.5rem] shrink-0 gap-1"
                        onClick={() => openProfile(student.id)}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        Profile
                      </Button>
                      {present && record ? (
                        <Button
                          variant="danger"
                          size="sm"
                          className="w-[5.5rem] shrink-0"
                          onClick={() => void markAbsent(record, student.name)}
                        >
                          Absent
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-[5.5rem] shrink-0"
                          onClick={() => void markPresent(student)}
                        >
                          Present
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {studentRows.length === 0 && (
          <p className="text-sm text-mist">No active students in this branch.</p>
        )}
      </Card>
    </div>
  );
}

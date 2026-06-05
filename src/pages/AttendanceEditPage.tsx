import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useStore } from "../store/useStore";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { MobileCard } from "../components/ui/MobileCard";
import { formatTime, todayKey } from "../lib/dates";
import { formatReportDate } from "../lib/attendanceReport";

export function AttendanceEditPage() {
  const session = useStore((s) => s.session);
  const branches = useStore((s) => s.branches);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);
  const getStudent = useStore((s) => s.getStudent);
  const getBranch = useStore((s) => s.getBranch);
  const getMarkedByName = useStore((s) => s.getMarkedByName);
  const markAttendanceForDate = useStore((s) => s.markAttendanceForDate);
  const deleteAttendance = useStore((s) => s.deleteAttendance);

  const isAdmin = session?.role === "admin";
  const isUser = session?.role === "user";
  const [selectedBranch, setSelectedBranch] = useState(
    () => session?.branchId ?? branches[0]?.id ?? "",
  );
  const branchId = isAdmin ? selectedBranch : session?.branchId;
  const [filterDate, setFilterDate] = useState(todayKey);
  const [addStudentId, setAddStudentId] = useState("");
  const [addDate, setAddDate] = useState(todayKey);

  const branchStudents = useMemo(
    () => (branchId ? students.filter((s) => s.branchId === branchId && s.active) : []),
    [students, branchId],
  );

  const records = useMemo(() => {
    if (!branchId) return [];
    return attendance
      .filter((a) => a.branchId === branchId && a.date === filterDate)
      .sort((a, b) => b.markedAt.localeCompare(a.markedAt));
  }, [attendance, branchId, filterDate]);

  const removeRecord = async (id: string, studentName: string) => {
    const result = await Swal.fire({
      title: "Remove attendance?",
      text: `Remove ${studentName} for ${formatReportDate(filterDate)}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#7a9d96",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAttendance(id);
      await Swal.fire({
        icon: "success",
        title: "Removed",
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

  const addPast = async () => {
    if (!addStudentId || !addDate || !session) return;
    const student = getStudent(addStudentId);
    if (!student) return;

    const res = await markAttendanceForDate(addStudentId, addDate, session.userId);
    await Swal.fire({
      icon: res.ok ? "success" : "error",
      title: res.ok ? "Saved" : "Error",
      text: res.message,
      confirmButtonColor: "#00303f",
    });
  };

  if (!branchId) {
    return (
      <p className="text-sm text-mist">
        {isAdmin
          ? "Add a branch first to edit attendance."
          : "No branch assigned to your account. Ask admin to assign your branch."}
      </p>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Edit attendance"
        subtitle={
          isAdmin
            ? "All branches — add or remove attendance for any student"
            : `${getBranch(branchId)?.name ?? "Your branch"} — students in this branch only`
        }
      />

      {isUser && (
        <p className="rounded border border-morning bg-white px-3 py-2 text-sm text-mist">
          You can mark or remove attendance only for students assigned to your branch.
        </p>
      )}

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
            label="Date"
            type="date"
            value={filterDate}
            max={todayKey()}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </Card>

      <div className="space-y-3">
        {records.map((r) => {
          const student = getStudent(r.studentId);
          return (
            <MobileCard
              key={r.id}
              title={student?.name ?? "Unknown"}
              subtitle={`${student?.rollNumber ?? "—"} · ${formatReportDate(r.date)} · ${formatTime(r.markedAt)} · by ${getMarkedByName(r.markedById)}`}
            >
              <div className="flex gap-2 pt-1">
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => void removeRecord(r.id, student?.name ?? "student")}
                >
                  Remove
                </Button>
              </div>
            </MobileCard>
          );
        })}
        {records.length === 0 && (
          <p className="text-sm text-mist">No attendance records for this date.</p>
        )}
      </div>

      <Card>
        <h2 className="mb-4 font-medium text-cerulean">Add or correct attendance</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Student (your branch)"
            value={addStudentId}
            onChange={(e) => setAddStudentId(e.target.value)}
            options={[
              { value: "", label: "Select student" },
              ...branchStudents.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.rollNumber})`,
              })),
            ]}
          />
          <Input
            label="Date"
            type="date"
            value={addDate}
            max={todayKey()}
            onChange={(e) => setAddDate(e.target.value)}
          />
        </div>
        <Button className="mt-4 w-full sm:w-auto" onClick={() => void addPast()} disabled={!addStudentId}>
          Mark present for date
        </Button>
      </Card>
    </div>
  );
}

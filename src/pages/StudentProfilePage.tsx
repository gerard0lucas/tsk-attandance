import { useState } from "react";
import Swal from "sweetalert2";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../store/useStore";
import { canAccessBranch } from "../lib/branchAccess";
import { formatReportDate } from "../lib/attendanceReport";
import { todayKey } from "../lib/dates";
import { parseDateKey } from "../lib/reportRanges";
import { formatGender, GENDER_OPTIONS } from "../lib/student";
import { StudentPhoto } from "../components/StudentPhoto";
import { StudentActionIcons } from "../components/StudentActionIcons";
import { StudentAttendanceCalendar } from "../components/StudentAttendanceCalendar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { FormActions, FormStack } from "../components/ui/FormStack";
import { PhotoUpload } from "../components/PhotoUpload";
import type { Gender } from "../types";

function resolveStudentsBase(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin/students";
  if (pathname.startsWith("/user")) return "/user/students";
  return "/manager/students";
}

export function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const attendance = useStore((s) => s.attendance);
  const getStudent = useStore((s) => s.getStudent);
  const getBranch = useStore((s) => s.getBranch);
  const updateStudent = useStore((s) => s.updateStudent);
  const deleteStudent = useStore((s) => s.deleteStudent);
  const markAttendanceForDate = useStore((s) => s.markAttendanceForDate);
  const deleteAttendance = useStore((s) => s.deleteAttendance);
  const isPresentToday = useStore((s) => s.isPresentToday);

  const studentsBase = resolveStudentsBase(location.pathname);
  const student = studentId ? getStudent(studentId) : undefined;

  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [photo, setPhoto] = useState<string | undefined>();

  if (!studentId || !student) {
    return <Navigate to={studentsBase} replace />;
  }

  if (session && !canAccessBranch(session, student.branchId)) {
    return <Navigate to={studentsBase} replace />;
  }

  const openEdit = () => {
    setName(student.name);
    setRollNumber(student.rollNumber);
    setStudentClass(student.class);
    setGender(student.gender);
    setPhoto(student.photo);
    setFormOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !rollNumber.trim() || !studentClass.trim()) return;
    try {
      await updateStudent(student.id, {
        branchId: student.branchId,
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        class: studentClass.trim(),
        gender,
        photo: photo || undefined,
      });
      setFormOpen(false);
    } catch {
      /* actionError */
    }
  };

  const remove = () => {
    if (!confirm(`Delete ${student.name}? This cannot be undone.`)) return;
    void deleteStudent(student.id).then(() => navigate(studentsBase));
  };

  const editAttendance = async (dateKey: string) => {
    if (!session) return;

    if (dateKey > todayKey()) {
      await Swal.fire({
        icon: "info",
        title: "Cannot edit",
        text: "Future dates cannot be edited.",
        confirmButtonColor: "#00303f",
      });
      return;
    }

    const record = attendance.find(
      (a) => a.studentId === student.id && a.date === dateKey,
    );
    const dateLabel = formatReportDate(dateKey);

    if (record) {
      const result = await Swal.fire({
        title: dateLabel,
        text: `${student.name} is marked present. Change to absent?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Mark absent",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#7a9d96",
        reverseButtons: true,
      });
      if (!result.isConfirmed) return;
      try {
        await deleteAttendance(record.id);
        await Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Marked absent.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch {
        await Swal.fire({
          icon: "error",
          title: "Could not update",
          text: "Failed to remove attendance.",
          confirmButtonColor: "#00303f",
        });
      }
      return;
    }

    const result = await Swal.fire({
      title: dateLabel,
      text: `Mark ${student.name} as present?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Mark present",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#00303f",
      cancelButtonColor: "#7a9d96",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const res = await markAttendanceForDate(student.id, dateKey, session.userId);
    await Swal.fire({
      icon: res.ok ? "success" : "error",
      title: res.ok ? "Updated" : "Could not update",
      text: res.message,
      confirmButtonColor: "#00303f",
      timer: res.ok ? 1500 : undefined,
      showConfirmButton: !res.ok,
    });
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start gap-2 sm:gap-3">
        <Link
          to={studentsBase}
          className="touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-morning bg-white text-cerulean hover:bg-morning/40"
          aria-label="Back to students"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto">
          <h1 className="truncate text-lg font-semibold text-cerulean sm:text-xl">
            Student profile
          </h1>
          <p className="truncate text-sm text-mist">{student.name}</p>
        </div>
        <div className="ml-auto shrink-0">
          <StudentActionIcons
            compact
            onEdit={openEdit}
            onQr={() => navigate(`${studentsBase}/${student.id}/qr`)}
            onDelete={remove}
          />
        </div>
      </div>

      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <StudentPhoto student={student} size="lg" />
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <p className="text-lg font-semibold text-cerulean">{student.name}</p>
            <p>
              <span className="text-mist">Roll:</span>{" "}
              <span className="font-medium text-cerulean">{student.rollNumber}</span>
            </p>
            <p>
              <span className="text-mist">Class:</span>{" "}
              <span className="text-cerulean">{student.class}</span>
            </p>
            <p>
              <span className="text-mist">Gender:</span>{" "}
              <span className="text-cerulean">{formatGender(student.gender)}</span>
            </p>
            <p>
              <span className="text-mist">Branch:</span>{" "}
              <span className="text-cerulean">{getBranch(student.branchId)?.name ?? "—"}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {!student.active && <Badge tone="neutral">Inactive</Badge>}
              {isPresentToday(student.id) ? (
                <Badge tone="success">Present today</Badge>
              ) : (
                <Badge tone="neutral">Absent today</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <StudentAttendanceCalendar
        studentId={student.id}
        attendance={attendance}
        visibleMonth={visibleMonth}
        onMonthChange={setVisibleMonth}
        selectedDateKey={selectedDateKey}
        onSelectDate={(key) => {
          setSelectedDateKey(key);
          setVisibleMonth(parseDateKey(key));
        }}
        onEditDate={(key) => {
          setSelectedDateKey(key);
          void editAttendance(key);
        }}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Edit student"
        wide
        footer={
          <FormActions>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>Save changes</Button>
          </FormActions>
        }
      >
        <FormStack>
          <PhotoUpload name={name} photo={photo} onChange={setPhoto} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Roll number"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            required
          />
          <Input
            label="Class"
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            required
          />
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            options={GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label }))}
          />
        </FormStack>
      </Modal>
    </div>
  );
}

import { useRef, useState } from "react";
import Swal from "sweetalert2";
import { useStore } from "../store/useStore";
import { QrScanner, type QrScannerHandle } from "../components/QrScanner";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { formatGender } from "../lib/student";
import type { Student } from "../types";

function studentAlertHtml(student: Student, branchName?: string, alreadyPresent?: boolean) {
  const fields: [string, string][] = [
    ["Roll", student.rollNumber],
    ["Class", student.class],
    ["Gender", formatGender(student.gender)],
  ];
  if (branchName) fields.push(["Branch", branchName]);

  const rows = fields
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#7a9d96;font-size:14px">${label}</td><td style="padding:4px 0;font-size:14px;color:#00303f;font-weight:500">${value}</td></tr>`,
    )
    .join("");

  const presentNote = alreadyPresent
    ? `<p style="margin:12px 0 0;color:#92400e;font-size:13px">Already marked present today.</p>`
    : "";

  return `
    <div style="text-align:left;margin-top:8px">
      <table style="margin:0 auto">${rows}</table>
      ${presentNote}
    </div>
  `;
}

export function ScanPage() {
  const session = useStore((s) => s.session);
  const students = useStore((s) => s.students);
  const getBranch = useStore((s) => s.getBranch);
  const markAttendance = useStore((s) => s.markAttendance);
  const isPresentToday = useStore((s) => s.isPresentToday);

  const scannerRef = useRef<QrScannerHandle>(null);
  const [manualId, setManualId] = useState("");
  const [cooldown, setCooldown] = useState(false);

  const isBranchStaff = session?.role === "user" || session?.role === "manager";
  const branchStudents =
    isBranchStaff && session?.branchId
      ? students.filter((s) => s.branchId === session.branchId)
      : session?.role === "admin"
        ? students
        : [];

  if (isBranchStaff && !session?.branchId) {
    return (
      <p className="text-sm text-mist">
        No branch assigned to your account. Ask admin to assign your branch before scanning.
      </p>
    );
  }

  const showStudentAlert = async (student: Student | undefined, invalidMessage?: string) => {
    if (!student) {
      await Swal.fire({
        icon: "error",
        title: "Invalid QR",
        text: invalidMessage ?? "Student not found or QR is invalid.",
        confirmButtonColor: "#00303f",
      });
      return;
    }

    if (!student.active) {
      await Swal.fire({
        icon: "warning",
        title: "Inactive student",
        text: `${student.name} is inactive and cannot be marked.`,
        confirmButtonColor: "#00303f",
      });
      return;
    }

    if (scannerRef.current?.isActive()) {
      await scannerRef.current.stop();
    }

    const branchName = getBranch(student.branchId)?.name;
    const alreadyPresent = isPresentToday(student.id);

    const result = await Swal.fire({
      title: student.name,
      html: studentAlertHtml(student, branchName, alreadyPresent),
      icon: "info",
      showCancelButton: true,
      confirmButtonText: alreadyPresent ? "OK" : "Mark present",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#00303f",
      cancelButtonColor: "#7a9d96",
      reverseButtons: true,
      allowOutsideClick: false,
    });

    if (alreadyPresent || !result.isConfirmed || !session) return;

    const res = await markAttendance(student.id, session.userId);

    if (res.ok) {
      await Swal.fire({
        icon: "success",
        title: "Present!",
        text: res.message,
        confirmButtonColor: "#00303f",
        timer: 2000,
        showConfirmButton: false,
      });
      setManualId("");
      setCooldown(true);
      window.setTimeout(() => setCooldown(false), 2000);
    } else {
      await Swal.fire({
        icon: "error",
        title: "Could not mark",
        text: res.message,
        confirmButtonColor: "#00303f",
      });
    }
  };

  const handleScan = (sid: string, tok: string) => {
    const student = branchStudents.find((s) => s.id === sid && s.qrToken === tok);
    void showStudentAlert(student);
  };

  const handleManualLookup = () => {
    const q = manualId.trim();
    if (!q) return;
    const student = branchStudents.find(
      (s) => s.id === q || s.rollNumber.toLowerCase() === q.toLowerCase(),
    );
    void showStudentAlert(student, "Student not found in your branch.");
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Scan attendance"
        subtitle={
          isBranchStaff
            ? `Your branch only — ${getBranch(session!.branchId!)?.name ?? "students in your branch"}`
            : "Scan QR — camera closes when student is found"
        }
      />

      <Card className="!p-3 sm:!p-5">
        <QrScanner
          ref={scannerRef}
          paused={cooldown}
          onScan={({ sid, tok }) => handleScan(sid, tok)}
          onInvalidScan={() =>
            void Swal.fire({
              icon: "error",
              title: "Invalid QR",
              text: "Not a valid student QR from this app.",
              confirmButtonColor: "#00303f",
            })
          }
        />
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-cerulean">Manual entry</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Roll number or ID"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            wrapperClassName="min-w-0 flex-1"
          />
          <Button
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
            onClick={handleManualLookup}
          >
            Find student
          </Button>
        </div>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useStore } from "../../store/useStore";
import { QrScanner } from "../../components/QrScanner";
import { StudentPhoto } from "../../components/StudentPhoto";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions } from "../../components/ui/FormStack";
import { formatGender } from "../../lib/student";
import type { Student } from "../../types";

export function ManagerScan() {
  const session = useStore((s) => s.session);
  const students = useStore((s) => s.students);
  const getBranch = useStore((s) => s.getBranch);
  const markAttendance = useStore((s) => s.markAttendance);
  const isPresentToday = useStore((s) => s.isPresentToday);

  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [manualId, setManualId] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<Student | null>(null);
  const [marking, setMarking] = useState(false);

  const scannerPaused = cooldown || pendingStudent !== null;

  const openStudent = (student: Student | undefined, invalidMessage?: string) => {
    if (!student) {
      setMessage({ ok: false, text: invalidMessage ?? "Invalid QR code." });
      return;
    }
    if (!student.active) {
      setMessage({ ok: false, text: "Student account is inactive." });
      return;
    }
    setMessage(null);
    setPendingStudent(student);
  };

  const closeConfirm = () => {
    setPendingStudent(null);
    setMarking(false);
  };

  const handleScan = (sid: string, tok: string) => {
    const student = students.find((s) => s.id === sid && s.qrToken === tok);
    openStudent(student);
  };

  const handleManualLookup = () => {
    const q = manualId.trim();
    if (!q) return;
    const student = students.find(
      (s) => s.id === q || s.rollNumber.toLowerCase() === q.toLowerCase(),
    );
    openStudent(student, "Student not found.");
  };

  const confirmPresent = async () => {
    if (!pendingStudent || !session) return;
    setMarking(true);
    setMessage(null);
    const res = await markAttendance(pendingStudent.id, session.userId);
    setMarking(false);
    setMessage({ ok: res.ok, text: res.message });
    if (res.ok) {
      closeConfirm();
      setManualId("");
      setCooldown(true);
      window.setTimeout(() => setCooldown(false), 2000);
    }
  };

  const alreadyPresent = pendingStudent ? isPresentToday(pendingStudent.id) : false;
  const branchName = pendingStudent ? getBranch(pendingStudent.branchId)?.name : undefined;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Scan attendance" subtitle="Scan QR, confirm student, then mark present" />

      {message && !pendingStudent && (
        <p
          className={`rounded border px-3 py-3 text-sm ${
            message.ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}

      <Card className="!p-3 sm:!p-5">
        <QrScanner
          paused={scannerPaused}
          onScan={({ sid, tok }) => handleScan(sid, tok)}
          onInvalidScan={() =>
            setMessage({
              ok: false,
              text: "Not a valid student QR. Use the QR from this app.",
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

      <Modal
        open={pendingStudent !== null}
        onClose={closeConfirm}
        title="Confirm attendance"
        wide
        footer={
          pendingStudent ? (
            <FormActions>
              <Button variant="outline" onClick={closeConfirm}>
                Cancel
              </Button>
              <Button
                disabled={marking || alreadyPresent}
                onClick={() => void confirmPresent()}
              >
                {marking ? "Marking…" : "Mark present"}
              </Button>
            </FormActions>
          ) : undefined
        }
      >
        {pendingStudent && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-lg border border-morning bg-page/60 p-4">
              <StudentPhoto student={pendingStudent} size="md" />
              <dl className="min-w-0 flex-1 text-sm">
                <dd className="text-base font-semibold text-cerulean">{pendingStudent.name}</dd>
                <div className="mt-3 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1.5 text-mist">
                  <dt>Roll</dt>
                  <dd className="text-cerulean">{pendingStudent.rollNumber}</dd>
                  <dt>Class</dt>
                  <dd className="text-cerulean">{pendingStudent.class}</dd>
                  <dt>Gender</dt>
                  <dd className="text-cerulean">{formatGender(pendingStudent.gender)}</dd>
                  {branchName && (
                    <>
                      <dt>Branch</dt>
                      <dd className="text-cerulean">{branchName}</dd>
                    </>
                  )}
                </div>
              </dl>
            </div>

            {alreadyPresent && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                Already marked present today.
              </p>
            )}

            {message && (
              <p
                className={`rounded border px-3 py-2.5 text-sm ${
                  message.ok
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

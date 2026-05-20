import { useState } from "react";
import { useStore } from "../../store/useStore";
import { QrScanner } from "../../components/QrScanner";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";

export function ManagerScan() {
  const session = useStore((s) => s.session);
  const students = useStore((s) => s.students);
  const markAttendance = useStore((s) => s.markAttendance);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [manualId, setManualId] = useState("");
  const [cooldown, setCooldown] = useState(false);

  const verify = (sid: string, tok: string) => {
    const student = students.find((s) => s.id === sid && s.qrToken === tok);
    if (!student) {
      setMessage({ ok: false, text: "Invalid QR code." });
      return;
    }
    const res = markAttendance(student.id, session!.userId);
    setMessage({ ok: res.ok, text: res.message });
    if (res.ok) {
      setCooldown(true);
      setTimeout(() => setCooldown(false), 2000);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Scan attendance" subtitle="Point camera at student QR" />

      {message && (
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
          paused={cooldown}
          onScan={({ sid, tok }) => verify(sid, tok)}
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
            onClick={() => {
              const student = students.find(
                (s) => s.id === manualId || s.rollNumber.toLowerCase() === manualId.toLowerCase(),
              );
              if (!student) setMessage({ ok: false, text: "Student not found." });
              else verify(student.id, student.qrToken);
            }}
          >
            Mark present
          </Button>
        </div>
      </Card>
    </div>
  );
}

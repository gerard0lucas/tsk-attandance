import { useState } from "react";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import { QrDisplay } from "../../components/QrDisplay";
import { formatGender, GENDER_OPTIONS } from "../../lib/student";
import type { Gender } from "../../types";

export function ManagerStudents() {
  const temples = useStore((s) => s.temples);
  const students = useStore((s) => s.students);
  const getTemple = useStore((s) => s.getTemple);
  const addStudent = useStore((s) => s.addStudent);
  const regenerateQr = useStore((s) => s.regenerateQr);
  const isPresentToday = useStore((s) => s.isPresentToday);

  const [open, setOpen] = useState(false);
  const [qrId, setQrId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [templeId, setTempleId] = useState(temples[0]?.id ?? "");

  const qrStudent = qrId ? students.find((s) => s.id === qrId) : null;

  const resetForm = () => {
    setName("");
    setRollNumber("");
    setStudentClass("");
    setGender("male");
    setTempleId(temples[0]?.id ?? "");
  };

  const create = () => {
    if (!name.trim() || !rollNumber.trim() || !studentClass.trim() || !templeId) return;
    const student = addStudent({
      templeId,
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      class: studentClass.trim(),
      gender,
    });
    resetForm();
    setOpen(false);
    setQrId(student.id);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Students"
        action={
          <Button onClick={() => setOpen(true)} disabled={temples.length === 0}>
            Add student
          </Button>
        }
      />

      {temples.length === 0 && (
        <p className="text-sm text-mist">No temples yet. Ask admin to add temples first.</p>
      )}

      <div className="space-y-3">
        {students.map((s) => {
          const templeName = getTemple(s.templeId)?.name ?? "—";
          return (
            <CardRow
              key={s.id}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => setQrId(s.id)}
                  >
                    View QR
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      if (confirm("New QR code? Old one stops working.")) {
                        regenerateQr(s.id);
                        setQrId(s.id);
                      }
                    }}
                  >
                    New QR
                  </Button>
                </>
              }
            >
              <p className="font-medium text-cerulean">{s.name}</p>
              <p className="text-sm text-mist">Roll: {s.rollNumber} · Class: {s.class}</p>
              <p className="text-sm text-mist">Gender: {formatGender(s.gender)}</p>
              <p className="text-sm text-mist">Temple: {templeName}</p>
              <div className="mt-2">
                {isPresentToday(s.id) ? (
                  <Badge tone="success">Present today</Badge>
                ) : (
                  <Badge tone="neutral">Not checked in</Badge>
                )}
              </div>
            </CardRow>
          );
        })}
        {students.length === 0 && <p className="text-sm text-mist">No students yet.</p>}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); resetForm(); }} title="New student">
        <FormStack>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Roll number"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="e.g. NV-003"
          />
          <Input
            label="Class"
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            placeholder="e.g. 10-A"
          />
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            options={GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label }))}
          />
          <Select
            label="Temple"
            value={templeId}
            onChange={(e) => setTempleId(e.target.value)}
            options={temples.map((t) => ({ value: t.id, label: t.name }))}
          />
          <FormActions>
            <Button onClick={create} className="w-full" disabled={!templeId}>
              Create & show QR
            </Button>
          </FormActions>
        </FormStack>
      </Modal>

      <Modal open={!!qrStudent} onClose={() => setQrId(null)} title="Student QR" wide>
        {qrStudent && (
          <QrDisplay
            student={qrStudent}
            templeName={getTemple(qrStudent.templeId)?.name}
          />
        )}
      </Modal>
    </div>
  );
}

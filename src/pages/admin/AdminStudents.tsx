import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { Card, CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import {
  TableWrap,
  tableActionsCell,
  tableCell,
  tableCellMuted,
  tableHeadCell,
} from "../../components/ui/TableWrap";
import { QrDisplay } from "../../components/QrDisplay";
import { formatGender, GENDER_OPTIONS } from "../../lib/student";
import type { Gender, Student } from "../../types";

export function AdminStudents() {
  const students = useStore((s) => s.students);
  const temples = useStore((s) => s.temples);
  const getTemple = useStore((s) => s.getTemple);
  const addStudent = useStore((s) => s.addStudent);
  const isPresentToday = useStore((s) => s.isPresentToday);
  const [filterTemple, setFilterTemple] = useState("all");
  const [qrId, setQrId] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [templeId, setTempleId] = useState(temples[0]?.id ?? "");

  const filtered =
    filterTemple === "all" ? students : students.filter((s) => s.templeId === filterTemple);
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
    setOpenAdd(false);
    setQrId(student.id);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Students"
        action={
          temples.length > 0 ? (
            <Button
              onClick={() => {
                setTempleId(temples[0]?.id ?? "");
                setOpenAdd(true);
              }}
            >
              Add student
            </Button>
          ) : (
            <Link to="/admin/temples">
              <Button>Add temple first</Button>
            </Link>
          )
        }
      />

      <Select
        label="Filter by temple"
        value={filterTemple}
        onChange={(e) => setFilterTemple(e.target.value)}
        options={[
          { value: "all", label: "All temples" },
          ...temples.map((t) => ({ value: t.id, label: t.name })),
        ]}
      />

      <div className="space-y-3 md:hidden">
        {filtered.map((s) => (
          <StudentCard
            key={s.id}
            student={s}
            templeName={getTemple(s.templeId)?.name}
            present={isPresentToday(s.id)}
            onQr={() => setQrId(s.id)}
          />
        ))}
        {filtered.length === 0 && <p className="text-sm text-mist">No students found.</p>}
      </div>

      <Card padding="sm" className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-morning">
                <th className={tableHeadCell}>Name</th>
                <th className={tableHeadCell}>Roll</th>
                <th className={tableHeadCell}>Class</th>
                <th className={tableHeadCell}>Gender</th>
                <th className={tableHeadCell}>Temple</th>
                <th className={tableHeadCell}>Today</th>
                <th className={tableHeadCell}>QR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  templeName={getTemple(s.templeId)?.name}
                  present={isPresentToday(s.id)}
                  onQr={() => setQrId(s.id)}
                />
              ))}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <p className="text-sm text-mist">No students found.</p>}
      </Card>

      <Modal
        open={openAdd}
        onClose={() => {
          setOpenAdd(false);
          resetForm();
        }}
        title="New student"
      >
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

      <Modal open={!!qrStudent} onClose={() => setQrId(null)} title="Student details & QR" wide>
        {qrStudent && (
          <QrDisplay student={qrStudent} templeName={getTemple(qrStudent.templeId)?.name} />
        )}
      </Modal>
    </div>
  );
}

function StudentCard({
  student,
  templeName,
  present,
  onQr,
}: {
  student: Student;
  templeName?: string;
  present: boolean;
  onQr: () => void;
}) {
  return (
    <CardRow
      actions={
        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={onQr}>
          View QR
        </Button>
      }
    >
      <p className="font-medium text-cerulean">{student.name}</p>
      <p className="text-sm text-mist">Roll: {student.rollNumber} · Class: {student.class}</p>
      <p className="text-sm text-mist">Gender: {formatGender(student.gender)}</p>
      <p className="text-sm text-mist">Temple: {templeName}</p>
      <div className="mt-2">
        {present ? <Badge tone="success">Present</Badge> : <Badge tone="neutral">Absent</Badge>}
      </div>
    </CardRow>
  );
}

function StudentRow({
  student,
  templeName,
  present,
  onQr,
}: {
  student: Student;
  templeName?: string;
  present: boolean;
  onQr: () => void;
}) {
  return (
    <tr className="border-b border-morning last:border-0">
      <td className={tableCell}>{student.name}</td>
      <td className={tableCellMuted}>{student.rollNumber}</td>
      <td className={tableCell}>{student.class}</td>
      <td className={tableCell}>{formatGender(student.gender)}</td>
      <td className={tableCellMuted}>{templeName}</td>
      <td className={tableCell}>
        {present ? <Badge tone="success">Present</Badge> : <Badge tone="neutral">Absent</Badge>}
      </td>
      <td className={tableActionsCell}>
        <Button variant="outline" size="sm" onClick={onQr}>
          View
        </Button>
      </td>
    </tr>
  );
}

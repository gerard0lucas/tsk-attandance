import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { Card, CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { StudentSearchField } from "../../components/StudentSearchField";
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
import { PhotoUpload } from "../../components/PhotoUpload";
import { StudentPhoto } from "../../components/StudentPhoto";
import { StudentActionIcons } from "../../components/StudentActionIcons";
import { filterStudents, formatGender, GENDER_OPTIONS } from "../../lib/student";
import type { Gender, Student } from "../../types";

export function AdminStudents() {
  const navigate = useNavigate();
  const students = useStore((s) => s.students);
  const branches = useStore((s) => s.branches);
  const getBranch = useStore((s) => s.getBranch);
  const addStudent = useStore((s) => s.addStudent);
  const updateStudent = useStore((s) => s.updateStudent);
  const deleteStudent = useStore((s) => s.deleteStudent);
  const isPresentToday = useStore((s) => s.isPresentToday);
  const [filterBranch, setFilterBranch] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [schoolName, setSchoolName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [photo, setPhoto] = useState<string | undefined>();

  const branchFiltered = useMemo(
    () =>
      filterBranch === "all" ? students : students.filter((s) => s.branchId === filterBranch),
    [students, filterBranch],
  );

  const filtered = useMemo(
    () => filterStudents(branchFiltered, search),
    [branchFiltered, search],
  );

  const openQr = (studentId: string) => {
    navigate(`/admin/students/${studentId}/qr`);
  };

  const resetForm = () => {
    setName("");
    setRollNumber("");
    setStudentClass("");
    setGender("male");
    setSchoolName("");
    setPhone("");
    setBranchId(branches[0]?.id ?? "");
    setPhoto(undefined);
    setEditing(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setName(s.name);
    setRollNumber(s.rollNumber);
    setStudentClass(s.class);
    setGender(s.gender);
    setSchoolName(s.schoolName);
    setPhone(s.phone);
    setBranchId(s.branchId);
    setPhoto(s.photo);
    setFormOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !rollNumber.trim() || !studentClass.trim() || !branchId) return;
    try {
      if (editing) {
        await updateStudent(editing.id, {
          branchId,
          name: name.trim(),
          rollNumber: rollNumber.trim(),
          class: studentClass.trim(),
          gender,
          schoolName: schoolName.trim(),
          phone: phone.trim(),
          photo: photo || undefined,
        });
        closeForm();
      } else {
        const student = await addStudent({
          branchId,
          name: name.trim(),
          rollNumber: rollNumber.trim(),
          class: studentClass.trim(),
          gender,
          schoolName: schoolName.trim(),
          phone: phone.trim(),
          photo,
        });
        closeForm();
        navigate(`/admin/students/${student.id}/qr`);
      }
    } catch {
      /* store sets actionError */
    }
  };

  const remove = (s: Student) => {
    if (confirm(`Delete ${s.name}? This cannot be undone.`)) {
      void deleteStudent(s.id);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Students"
        action={
          branches.length > 0 ? (
            <Button onClick={openAdd}>Add student</Button>
          ) : (
            <Link to="/admin/branches">
              <Button>Add branch first</Button>
            </Link>
          )
        }
      />

      <Select
        label="Filter by branch"
        value={filterBranch}
        onChange={(e) => setFilterBranch(e.target.value)}
        options={[
          { value: "all", label: "All branches" },
          ...branches.map((b) => ({ value: b.id, label: b.name })),
        ]}
      />

      <StudentSearchField
        value={search}
        onChange={setSearch}
        students={branchFiltered}
      />

      <div className="space-y-3 md:hidden">
        {filtered.map((s) => (
          <StudentCard
            key={s.id}
            student={s}
            branchName={getBranch(s.branchId)?.name}
            present={isPresentToday(s.id)}
            onEdit={() => openEdit(s)}
            onQr={() => openQr(s.id)}
            onDelete={() => remove(s)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-mist">
            {search ? "No students match your search." : "No students found."}
          </p>
        )}
      </div>

      <Card padding="sm" className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[1040px]">
            <thead>
              <tr className="border-b border-morning">
                <th className={tableHeadCell}>Photo</th>
                <th className={tableHeadCell}>Name</th>
                <th className={tableHeadCell}>Roll</th>
                <th className={tableHeadCell}>Class</th>
                <th className={tableHeadCell}>School</th>
                <th className={tableHeadCell}>Phone</th>
                <th className={tableHeadCell}>Gender</th>
                <th className={tableHeadCell}>Branch</th>
                <th className={tableHeadCell}>Today</th>
                <th className={tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  branchName={getBranch(s.branchId)?.name}
                  present={isPresentToday(s.id)}
                  onEdit={() => openEdit(s)}
                  onQr={() => openQr(s.id)}
                  onDelete={() => remove(s)}
                />
              ))}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && (
          <p className="text-sm text-mist">
            {search ? "No students match your search." : "No students found."}
          </p>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit student" : "New student"}
        wide
        footer={
          <FormActions>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={!branchId}>
              {editing ? "Save changes" : "Create & show QR"}
            </Button>
          </FormActions>
        }
      >
        <FormStack>
          <PhotoUpload name={name} photo={photo} onChange={setPhoto} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Roll number"
            type="number"
            inputMode="numeric"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="e.g. NV-003"
            required
          />
          <Input
            label="Class"
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            placeholder="e.g. 10-A"
            required
          />
          <Input
            label="School name"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
          />
          <Input
            label="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            options={GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label }))}
          />
          <Select
            label="Branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </FormStack>
      </Modal>

    </div>
  );
}

function StudentCard({
  student,
  branchName,
  present,
  onEdit,
  onQr,
  onDelete,
}: {
  student: Student;
  branchName?: string;
  present: boolean;
  onEdit: () => void;
  onQr: () => void;
  onDelete: () => void;
}) {
  return (
    <CardRow
      actions={
        <StudentActionIcons
          compact
          onEdit={onEdit}
          onQr={onQr}
          onDelete={onDelete}
        />
      }
    >
      <div className="flex gap-3">
        <StudentPhoto student={student} size="md" />
        <div className="min-w-0">
          <p className="font-medium text-cerulean">{student.name}</p>
          <p className="text-sm text-mist">Roll: {student.rollNumber} · Class: {student.class}</p>
          {student.schoolName && (
            <p className="text-sm text-mist">School: {student.schoolName}</p>
          )}
          {student.phone && <p className="text-sm text-mist">Phone: {student.phone}</p>}
          <p className="text-sm text-mist">Gender: {formatGender(student.gender)}</p>
          <p className="text-sm text-mist">Branch: {branchName}</p>
          <div className="mt-2">
            {present ? <Badge tone="success">Present</Badge> : <Badge tone="neutral">Absent</Badge>}
          </div>
        </div>
      </div>
    </CardRow>
  );
}

function StudentRow({
  student,
  branchName,
  present,
  onEdit,
  onQr,
  onDelete,
}: {
  student: Student;
  branchName?: string;
  present: boolean;
  onEdit: () => void;
  onQr: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-morning last:border-0">
      <td className={tableCell}>
        <StudentPhoto student={student} size="sm" />
      </td>
      <td className={tableCell}>{student.name}</td>
      <td className={tableCellMuted}>{student.rollNumber}</td>
      <td className={tableCell}>{student.class}</td>
      <td className={tableCellMuted}>{student.schoolName || "—"}</td>
      <td className={tableCellMuted}>{student.phone || "—"}</td>
      <td className={tableCell}>{formatGender(student.gender)}</td>
      <td className={tableCellMuted}>{branchName}</td>
      <td className={tableCell}>
        {present ? <Badge tone="success">Present</Badge> : <Badge tone="neutral">Absent</Badge>}
      </td>
      <td className={tableActionsCell}>
        <StudentActionIcons
          compact
          onEdit={onEdit}
          onQr={onQr}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

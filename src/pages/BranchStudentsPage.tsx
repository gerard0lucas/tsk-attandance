import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { Button } from "../components/ui/Button";
import { CardRow } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { StudentSearchField } from "../components/StudentSearchField";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { FormActions, FormStack } from "../components/ui/FormStack";
import { PhotoUpload } from "../components/PhotoUpload";
import { StudentPhoto } from "../components/StudentPhoto";
import { StudentActionIcons } from "../components/StudentActionIcons";
import { filterStudents, formatGender, GENDER_OPTIONS } from "../lib/student";
import type { Gender, Student } from "../types";

type BranchStudentsBasePath = "/manager" | "/user";

export function BranchStudentsPage({ basePath }: { basePath: BranchStudentsBasePath }) {
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const students = useStore((s) => s.students);
  const getBranch = useStore((s) => s.getBranch);
  const addStudent = useStore((s) => s.addStudent);
  const updateStudent = useStore((s) => s.updateStudent);
  const deleteStudent = useStore((s) => s.deleteStudent);
  const isPresentToday = useStore((s) => s.isPresentToday);

  const branchId = session?.branchId ?? "";
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [schoolName, setSchoolName] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();

  const branchList = useMemo(
    () => (branchId ? students.filter((s) => s.branchId === branchId) : []),
    [students, branchId],
  );

  const branchStudents = useMemo(
    () => filterStudents(branchList, search),
    [branchList, search],
  );

  const openQr = (studentId: string) => {
    navigate(`${basePath}/students/${studentId}/qr`);
  };

  const remove = (s: Student) => {
    if (confirm(`Delete ${s.name}? This cannot be undone.`)) {
      void deleteStudent(s.id);
    }
  };

  const resetForm = () => {
    setName("");
    setRollNumber("");
    setStudentClass("");
    setGender("male");
    setSchoolName("");
    setPhone("");
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
        navigate(`${basePath}/students/${student.id}/qr`);
      }
    } catch {
      /* store sets actionError */
    }
  };

  if (!branchId) {
    return (
      <p className="text-sm text-mist">
        No branch assigned to your account. Ask admin to assign your branch.
      </p>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Students"
        subtitle={getBranch(branchId)?.name}
        action={
          <Button onClick={openAdd} disabled={!branchId}>
            Add student
          </Button>
        }
      />

      <StudentSearchField value={search} onChange={setSearch} students={branchList} />

      <div className="space-y-3">
        {branchStudents.map((s) => (
          <CardRow
            key={s.id}
            actions={
              <StudentActionIcons
                compact
                onEdit={() => openEdit(s)}
                onQr={() => openQr(s.id)}
                onDelete={() => remove(s)}
              />
            }
          >
            <div className="flex gap-3">
              <StudentPhoto student={s} size="md" />
              <div className="min-w-0">
                <p className="font-medium text-cerulean">{s.name}</p>
                <p className="text-sm text-mist">
                  Roll: {s.rollNumber} · Class: {s.class}
                </p>
                {s.schoolName && (
                  <p className="text-sm text-mist">School: {s.schoolName}</p>
                )}
                {s.phone && <p className="text-sm text-mist">Phone: {s.phone}</p>}
                <p className="text-sm text-mist">Gender: {formatGender(s.gender)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!s.active && <Badge tone="neutral">Inactive</Badge>}
                  {isPresentToday(s.id) ? (
                    <Badge tone="success">Present today</Badge>
                  ) : (
                    <Badge tone="neutral">Not checked in</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardRow>
        ))}
        {branchStudents.length === 0 && (
          <p className="text-sm text-mist">
            {search ? "No students match your search." : "No students in your branch yet."}
          </p>
        )}
      </div>

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
          <p className="text-sm text-mist">
            Branch: <span className="font-medium text-cerulean">{getBranch(branchId)?.name}</span>
          </p>
        </FormStack>
      </Modal>
    </div>
  );
}

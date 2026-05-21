import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import { PhotoUpload } from "../../components/PhotoUpload";
import { StudentPhoto } from "../../components/StudentPhoto";
import { formatGender, GENDER_OPTIONS } from "../../lib/student";
import type { Gender, Student } from "../../types";

export function ManagerStudents() {
  const navigate = useNavigate();
  const branches = useStore((s) => s.branches);
  const students = useStore((s) => s.students);
  const getBranch = useStore((s) => s.getBranch);
  const addStudent = useStore((s) => s.addStudent);
  const updateStudent = useStore((s) => s.updateStudent);
  const regenerateQr = useStore((s) => s.regenerateQr);
  const isPresentToday = useStore((s) => s.isPresentToday);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [photo, setPhoto] = useState<string | undefined>();

  const openQr = (studentId: string) => {
    navigate(`/manager/students/${studentId}/qr`);
  };

  const resetForm = () => {
    setName("");
    setRollNumber("");
    setStudentClass("");
    setGender("male");
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
          photo,
        });
        closeForm();
        navigate(`/manager/students/${student.id}/qr`);
      }
    } catch {
      /* store sets actionError */
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Students"
        action={
          <Button onClick={openAdd} disabled={branches.length === 0}>
            Add student
          </Button>
        }
      />

      {branches.length === 0 && (
        <p className="text-sm text-mist">No branches yet. Ask admin to add branches first.</p>
      )}

      <div className="space-y-3">
        {students.map((s) => {
          const branchName = getBranch(s.branchId)?.name ?? "—";
          return (
            <CardRow
              key={s.id}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => openEdit(s)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => openQr(s.id)}
                  >
                    QR
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      if (confirm("New QR code? Old one stops working.")) {
                        void regenerateQr(s.id);
                        openQr(s.id);
                      }
                    }}
                  >
                    New QR
                  </Button>
                </>
              }
            >
              <div className="flex gap-3">
                <StudentPhoto student={s} size="md" />
                <div className="min-w-0">
                  <p className="font-medium text-cerulean">{s.name}</p>
                  <p className="text-sm text-mist">Roll: {s.rollNumber} · Class: {s.class}</p>
                  <p className="text-sm text-mist">Gender: {formatGender(s.gender)}</p>
                  <p className="text-sm text-mist">Branch: {branchName}</p>
                  <div className="mt-2">
                    {isPresentToday(s.id) ? (
                      <Badge tone="success">Present today</Badge>
                    ) : (
                      <Badge tone="neutral">Not checked in</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardRow>
          );
        })}
        {students.length === 0 && <p className="text-sm text-mist">No students yet.</p>}
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

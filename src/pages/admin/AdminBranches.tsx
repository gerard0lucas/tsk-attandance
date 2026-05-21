import { useState } from "react";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import type { Branch } from "../../types";

export function AdminBranches() {
  const branches = useStore((s) => s.branches);
  const students = useStore((s) => s.students);
  const addBranch = useStore((s) => s.addBranch);
  const updateBranch = useStore((s) => s.updateBranch);
  const deleteBranch = useStore((s) => s.deleteBranch);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const reset = () => {
    setName("");
    setLocation("");
    setEditing(null);
  };

  const save = async () => {
    if (!name.trim()) return;
    try {
      if (editing) {
        await updateBranch(editing.id, { name: name.trim(), location: location.trim() });
      } else {
        await addBranch({ name: name.trim(), location: location.trim() });
      }
      setOpen(false);
      reset();
    } catch {
      /* store sets actionError */
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Branches"
        action={<Button onClick={() => { reset(); setOpen(true); }}>Add branch</Button>}
      />

      <div className="space-y-3">
        {branches.map((b) => (
          <CardRow
            key={b.id}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    setEditing(b);
                    setName(b.name);
                    setLocation(b.location);
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    if (confirm(`Delete ${b.name}?`)) void deleteBranch(b.id);
                  }}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="font-medium text-cerulean">{b.name}</p>
            <p className="text-sm text-mist">{b.location || "—"}</p>
            <p className="text-xs text-mist">
              {students.filter((s) => s.branchId === b.id).length} students
            </p>
          </CardRow>
        ))}
        {branches.length === 0 && <p className="text-sm text-mist">No branches yet.</p>}
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={editing ? "Edit branch" : "New branch"}
        footer={
          <FormActions>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>
              {editing ? "Save" : "Create"}
            </Button>
          </FormActions>
        }
      >
        <FormStack>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </FormStack>
      </Modal>
    </div>
  );
}

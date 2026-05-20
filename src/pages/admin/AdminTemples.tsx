import { useState } from "react";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import type { Temple } from "../../types";

export function AdminTemples() {
  const temples = useStore((s) => s.temples);
  const students = useStore((s) => s.students);
  const addTemple = useStore((s) => s.addTemple);
  const updateTemple = useStore((s) => s.updateTemple);
  const deleteTemple = useStore((s) => s.deleteTemple);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Temple | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const reset = () => {
    setName("");
    setLocation("");
    setEditing(null);
  };

  const save = () => {
    if (!name.trim()) return;
    if (editing) updateTemple(editing.id, { name: name.trim(), location: location.trim() });
    else addTemple({ name: name.trim(), location: location.trim() });
    setOpen(false);
    reset();
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Temples"
        action={<Button onClick={() => { reset(); setOpen(true); }}>Add temple</Button>}
      />

      <div className="space-y-3">
        {temples.map((t) => (
          <CardRow
            key={t.id}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    setEditing(t);
                    setName(t.name);
                    setLocation(t.location);
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
                    if (confirm(`Delete ${t.name}?`)) deleteTemple(t.id);
                  }}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="font-medium text-cerulean">{t.name}</p>
            <p className="text-sm text-mist">{t.location || "—"}</p>
            <p className="text-xs text-mist">
              {students.filter((s) => s.templeId === t.id).length} students
            </p>
          </CardRow>
        ))}
        {temples.length === 0 && <p className="text-sm text-mist">No temples yet.</p>}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title={editing ? "Edit temple" : "New temple"}>
        <FormStack>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <FormActions>
            <Button onClick={save} className="w-full">{editing ? "Save" : "Create"}</Button>
          </FormActions>
        </FormStack>
      </Modal>
    </div>
  );
}

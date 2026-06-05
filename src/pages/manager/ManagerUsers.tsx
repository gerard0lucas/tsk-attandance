import { useState } from "react";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import type { BranchUser } from "../../types";

export function ManagerUsers() {
  const session = useStore((s) => s.session);
  const users = useStore((s) => s.users);
  const actionError = useStore((s) => s.actionError);
  const addBranchUser = useStore((s) => s.addBranchUser);
  const updateBranchUser = useStore((s) => s.updateBranchUser);
  const deleteBranchUser = useStore((s) => s.deleteBranchUser);

  const branchId = session?.branchId ?? "";
  const branchUsers = users.filter((u) => u.branchId === branchId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setEditing(null);
  };

  const save = async () => {
    if (!name.trim() || !email.trim() || !branchId) return;
    setSaving(true);
    try {
      if (editing) {
        await updateBranchUser(editing.id, {
          name: name.trim(),
          email: email.trim(),
        });
      } else {
        if (!password.trim()) return;
        await addBranchUser({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          branchId,
        });
      }
      setOpen(false);
      reset();
    } catch {
      /* actionError */
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: BranchUser) => {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setPassword("");
    setOpen(true);
  };

  if (!branchId) {
    return <p className="text-sm text-mist">No branch assigned. Contact admin.</p>;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Branch users"
        subtitle="Users who scan QR and edit attendance (2–3 per branch)"
        action={
          <Button onClick={() => { reset(); setOpen(true); }} disabled={branchUsers.length >= 5}>
            Add user
          </Button>
        }
      />

      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="space-y-3">
        {branchUsers.map((u) => (
          <CardRow
            key={u.id}
            actions={
              <>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(u)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    if (confirm(`Remove ${u.name}?`)) void deleteBranchUser(u.id);
                  }}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="font-medium text-cerulean">{u.name}</p>
            <p className="break-all text-sm text-mist">{u.email}</p>
          </CardRow>
        ))}
        {branchUsers.length === 0 && (
          <p className="text-sm text-mist">No users yet. Add staff who will mark attendance.</p>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => { setOpen(false); reset(); }}
        title={editing ? "Edit user" : "New user"}
        footer={
          <FormActions>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </FormActions>
        }
      >
        <FormStack>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {!editing && (
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </FormStack>
      </Modal>
    </div>
  );
}

import { useState } from "react";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { Card, CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import type { BranchUser } from "../../types";

export function AdminUsers() {
  const branches = useStore((s) => s.branches);
  const users = useStore((s) => s.users);
  const getBranch = useStore((s) => s.getBranch);
  const actionError = useStore((s) => s.actionError);
  const addBranchUser = useStore((s) => s.addBranchUser);
  const updateBranchUser = useStore((s) => s.updateBranchUser);
  const deleteBranchUser = useStore((s) => s.deleteBranchUser);

  const [filterBranch, setFilterBranch] = useState<"all" | string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const visibleUsers =
    filterBranch === "all"
      ? users
      : users.filter((u) => u.branchId === filterBranch);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setBranchId(branches[0]?.id ?? "");
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
    setBranchId(u.branchId || (branches[0]?.id ?? ""));
    setPassword("");
    setOpen(true);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Branch users"
        subtitle="Staff who scan QR and edit attendance — manage all branches"
        action={
          <Button
            onClick={() => { reset(); setOpen(true); }}
            disabled={branches.length === 0}
          >
            Add user
          </Button>
        }
      />

      {branches.length === 0 && (
        <p className="text-sm text-mist">Add a branch first before creating users.</p>
      )}

      <Select
        label="Filter by branch"
        value={filterBranch}
        onChange={(e) => setFilterBranch(e.target.value as "all" | string)}
        options={[
          { value: "all", label: "All branches" },
          ...branches.map((b) => ({ value: b.id, label: b.name })),
        ]}
      />

      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="space-y-3 md:hidden">
        {visibleUsers.map((u) => (
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
            <p className="text-sm text-mist">Branch: {getBranch(u.branchId)?.name ?? "—"}</p>
          </CardRow>
        ))}
        {visibleUsers.length === 0 && <p className="text-sm text-mist">No users yet.</p>}
      </div>

      <Card padding="sm" className="hidden md:block">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-morning text-left text-sm text-mist">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.id} className="border-b border-morning last:border-0">
                <td className="px-3 py-2 text-cerulean">{u.name}</td>
                <td className="px-3 py-2 text-mist">{u.email}</td>
                <td className="px-3 py-2 text-mist">{getBranch(u.branchId)?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      if (confirm(`Remove ${u.name}?`)) void deleteBranchUser(u.id);
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleUsers.length === 0 && <p className="px-3 py-4 text-sm text-mist">No users yet.</p>}
      </Card>

      <Modal
        open={open}
        onClose={() => { setOpen(false); reset(); }}
        title={editing ? "Edit user" : "New user"}
        footer={
          <FormActions>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving || !branchId}>
              {saving ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </FormActions>
        }
      >
        <FormStack>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Select
            label="Branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
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

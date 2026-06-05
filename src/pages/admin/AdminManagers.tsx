import { useState } from "react";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { Card, CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  TableWrap,
  tableActionsCell,
  tableCell,
  tableCellMuted,
  tableHeadCell,
} from "../../components/ui/TableWrap";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import type { Manager } from "../../types";

export function AdminManagers() {
  const branches = useStore((s) => s.branches);
  const managers = useStore((s) => s.managers);
  const getBranch = useStore((s) => s.getBranch);
  const actionError = useStore((s) => s.actionError);
  const clearActionError = useStore((s) => s.clearActionError);
  const addManager = useStore((s) => s.addManager);
  const updateManager = useStore((s) => s.updateManager);
  const deleteManager = useStore((s) => s.deleteManager);

  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Manager | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

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
      setNotice("");
      if (editing) {
        const result = await updateManager(editing.id, {
          name: name.trim(),
          email: email.trim(),
          branchId,
        });
        if (!result.branchAssigned) {
          setNotice(
            "Name and email saved. Branch assignment needs a database update — run supabase/migration_users.sql in Supabase SQL Editor.",
          );
        }
      } else {
        if (!password.trim()) return;
        const manager = await addManager({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          branchId,
        });
        if (!manager.branchId && branchId) {
          setNotice(
            "Manager created. Run supabase/migration_users.sql in Supabase SQL Editor to enable branch assignment.",
          );
        }
      }
      setOpen(false);
      reset();
    } catch {
      /* actionError in store */
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (m: Manager) => {
    clearActionError();
    setNotice("");
    setEditing(m);
    setName(m.name);
    setEmail(m.email);
    setBranchId(m.branchId || (branches[0]?.id ?? ""));
    setPassword("");
    setOpen(true);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Managers"
        subtitle="One manager per branch — they manage users and students"
        action={
          <Button
            onClick={() => { reset(); setOpen(true); }}
            disabled={branches.length === 0}
          >
            Add manager
          </Button>
        }
      />

      {branches.length === 0 && (
        <p className="text-sm text-mist">Add a branch first before creating managers.</p>
      )}

      {notice && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {notice}
        </p>
      )}

      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="space-y-3 md:hidden">
        {managers.map((m) => (
          <CardRow
            key={m.id}
            actions={
              <>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(m)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    if (confirm(`Remove ${m.name}?`)) void deleteManager(m.id);
                  }}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="font-medium text-cerulean">{m.name}</p>
            <p className="break-all text-sm text-mist">{m.email}</p>
            <p className="text-sm text-mist">Branch: {getBranch(m.branchId)?.name ?? "—"}</p>
          </CardRow>
        ))}
        {managers.length === 0 && <p className="text-sm text-mist">No managers yet.</p>}
      </div>

      <Card padding="sm" className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-morning">
                <th className={tableHeadCell}>Name</th>
                <th className={tableHeadCell}>Email</th>
                <th className={tableHeadCell}>Branch</th>
                <th className={tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m.id} className="border-b border-morning last:border-0">
                  <td className={tableCell}>{m.name}</td>
                  <td className={tableCellMuted}>{m.email}</td>
                  <td className={tableCellMuted}>{getBranch(m.branchId)?.name ?? "—"}</td>
                  <td className={tableActionsCell}>
                    <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        if (confirm(`Remove ${m.name}?`)) void deleteManager(m.id);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {managers.length === 0 && <p className="text-sm text-mist">No managers yet.</p>}
      </Card>

      <Modal
        open={open}
        onClose={() => { setOpen(false); reset(); }}
        title={editing ? "Edit manager" : "New manager"}
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
            <>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs leading-relaxed text-mist">
                Turn off Confirm email in Supabase Auth settings.
              </p>
            </>
          )}
        </FormStack>
      </Modal>
    </div>
  );
}

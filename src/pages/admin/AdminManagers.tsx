import { useState } from "react";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { Card, CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
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
import { DEFAULT_MANAGER_PASSWORD } from "../../lib/auth";
import type { Manager } from "../../types";

export function AdminManagers() {
  const managers = useStore((s) => s.managers);
  const addManager = useStore((s) => s.addManager);
  const updateManager = useStore((s) => s.updateManager);
  const deleteManager = useStore((s) => s.deleteManager);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Manager | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setEditing(null);
  };

  const save = () => {
    if (!name.trim() || !email.trim()) return;
    if (editing) {
      const updates: Partial<Omit<Manager, "id" | "createdAt">> = {
        name: name.trim(),
        email: email.trim(),
      };
      if (password.trim()) updates.password = password.trim();
      updateManager(editing.id, updates);
    } else {
      if (!password.trim()) return;
      addManager({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });
    }
    setOpen(false);
    reset();
  };

  const openEdit = (m: Manager) => {
    setEditing(m);
    setName(m.name);
    setEmail(m.email);
    setPassword("");
    setOpen(true);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Managers"
        action={
          <Button onClick={() => { reset(); setOpen(true); }}>
            Add manager
          </Button>
        }
      />

      <div className="space-y-3 md:hidden">
        {managers.map((m) => (
          <CardRow
            key={m.id}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => openEdit(m)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    if (confirm(`Remove ${m.name}?`)) deleteManager(m.id);
                  }}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="font-medium text-cerulean">{m.name}</p>
            <p className="break-all text-sm text-mist">{m.email}</p>
          </CardRow>
        ))}
        {managers.length === 0 && <p className="text-sm text-mist">No managers yet.</p>}
      </div>

      <Card padding="sm" className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-morning">
                <th className={tableHeadCell}>Name</th>
                <th className={tableHeadCell}>Email</th>
                <th className={tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m.id} className="border-b border-morning last:border-0">
                  <td className={tableCell}>{m.name}</td>
                  <td className={tableCellMuted}>{m.email}</td>
                  <td className={tableActionsCell}>
                    <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        if (confirm(`Remove ${m.name}?`)) deleteManager(m.id);
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

      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title={editing ? "Edit manager" : "New manager"}>
        <FormStack>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex flex-col gap-2">
            <Input
              label={editing ? "New password (optional)" : "Password"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editing ? "Leave blank to keep current" : "Enter password"}
              required={!editing}
            />
            {!editing && (
              <p className="text-xs text-mist">Demo default: {DEFAULT_MANAGER_PASSWORD}</p>
            )}
          </div>
          <FormActions>
            <Button onClick={save} className="w-full">{editing ? "Save" : "Create"}</Button>
          </FormActions>
        </FormStack>
      </Modal>
    </div>
  );
}

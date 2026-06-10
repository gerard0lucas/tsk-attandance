import { useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { useStore } from "../../store/useStore";
import { PhotoUpload } from "../../components/PhotoUpload";
import { StudentPhoto } from "../../components/StudentPhoto";
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
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setAddress("");
    setPhoto(undefined);
    setEditing(null);
  };

  const save = async () => {
    if (!name.trim() || !email.trim() || !branchId) return;
    setSaving(true);
    try {
      const profileFields = {
        phone: phone.trim(),
        address: address.trim(),
        photo,
      };
      if (editing) {
        await updateBranchUser(editing.id, {
          name: name.trim(),
          email: email.trim(),
          ...profileFields,
        });
      } else {
        if (!password.trim()) return;
        await addBranchUser({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          branchId,
          ...profileFields,
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
    setPhone(u.phone);
    setAddress(u.address);
    setPhoto(u.photo);
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
            <div className="flex items-start gap-3">
              <StudentPhoto student={{ name: u.name, photo: u.photo }} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-cerulean">{u.name}</p>
                <p className="break-all text-sm text-mist">{u.email}</p>
                {u.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-mist">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {u.phone}
                  </p>
                )}
                {u.address && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-mist">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {u.address}
                  </p>
                )}
              </div>
            </div>
          </CardRow>
        ))}
        {branchUsers.length === 0 && (
          <p className="text-sm text-mist">No users yet. Add staff who will mark attendance.</p>
        )}
      </div>

      <Modal
        open={open}
        wide
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
          <PhotoUpload name={name} photo={photo} onChange={setPhoto} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
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

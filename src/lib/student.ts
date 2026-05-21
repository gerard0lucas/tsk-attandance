import type { Gender, Student } from "../types";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export function formatGender(gender: Gender): string {
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? gender;
}

export function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function normalizeStudentFields(student: Partial<Student> & { id: string }): Student {
  const raw = student as Student & { templeId?: string };
  const gender =
    raw.gender === "male" || raw.gender === "female" || raw.gender === "other"
      ? raw.gender
      : "other";

  return {
    id: raw.id,
    branchId: raw.branchId ?? raw.templeId ?? "",
    name: raw.name?.trim() || "—",
    rollNumber: raw.rollNumber?.trim() || "—",
    class: raw.class?.trim() || "—",
    gender,
    photo: raw.photo || undefined,
    qrToken: raw.qrToken ?? "",
    active: raw.active !== false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

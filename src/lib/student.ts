import type { Gender } from "../types";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export function formatGender(gender: Gender): string {
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? gender;
}

export function normalizeStudentFields<T extends { class?: string; gender?: string }>(
  student: T,
): T & { class: string; gender: Gender } {
  const gender =
    student.gender === "male" || student.gender === "female" || student.gender === "other"
      ? student.gender
      : "other";
  return {
    ...student,
    class: student.class?.trim() || "—",
    gender,
  };
}

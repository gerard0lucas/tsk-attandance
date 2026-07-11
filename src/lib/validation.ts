import type { BranchInput } from "./branch";

export type FormErrors<T extends string> = Partial<Record<T, string>>;

export function hasFormErrors<T extends string>(errors: FormErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

export function validateRequired(value: string, fieldLabel: string): string | undefined {
  if (!value.trim()) return `${fieldLabel} is required.`;
}

export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address.";
}

export function validatePassword(value: string, minLength = 6): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Password is required.";
  if (trimmed.length < minLength) return `Password must be at least ${minLength} characters.`;
}

export function validateName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Name is required.";
  if (trimmed.length < 2) return "Name must be at least 2 characters.";
}

export function validatePhoneOptional(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "Enter a valid phone number.";
}

export function sanitizeRollNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export function validateRollNumber(value: string): string | undefined {
  const trimmed = sanitizeRollNumber(value);
  if (!trimmed) return "Roll number is required.";
  if (!/^\d+$/.test(trimmed)) return "Roll number must contain numbers only.";
}

export function validateRollNumberUnique(
  rollNumber: string,
  students: { id: string; rollNumber: string }[],
  excludeStudentId?: string,
): string | undefined {
  const formatErr = validateRollNumber(rollNumber);
  if (formatErr) return formatErr;

  const normalized = sanitizeRollNumber(rollNumber);
  const duplicate = students.find(
    (s) => sanitizeRollNumber(s.rollNumber) === normalized && s.id !== excludeStudentId,
  );
  if (duplicate) return "This roll number is already assigned to another student.";
}

export function validateClass(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Class is required.";
  if (!/^(?:[1-9]|1[0-2])$/.test(trimmed)) return "Select a class from 1 to 12.";
}

export function validateMedium(value: string): string | undefined {
  if (!value.trim()) return "Medium is required.";
  if (value !== "english" && value !== "kannada" && value !== "marathi") {
    return "Select English, Kannada, or Marathi.";
  }
}

export function validateBranchSelection(value: string): string | undefined {
  if (!value.trim()) return "Branch is required.";
}

export function validateManualLookup(value: string): string | undefined {
  const err = validateRollNumber(value);
  if (!err) return undefined;
  return err === "Roll number is required." ? "Enter a roll number." : err;
}

export type LoginFormFields = "email" | "password";

export function validateLoginFields(
  email: string,
  password: string,
): FormErrors<LoginFormFields> {
  const errors: FormErrors<LoginFormFields> = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  if (!password.trim()) errors.password = "Password is required.";
  return errors;
}

export type StudentFormFields = "name" | "rollNumber" | "studentClass" | "medium" | "phone" | "branchId";

export function validateStudentFields(
  fields: {
    name: string;
    rollNumber: string;
    studentClass: string;
    medium: string;
    phone: string;
    branchId?: string;
  },
  options?: {
    students?: { id: string; rollNumber: string }[];
    excludeStudentId?: string;
  },
): FormErrors<StudentFormFields> {
  const errors: FormErrors<StudentFormFields> = {};
  const nameErr = validateName(fields.name);
  if (nameErr) errors.name = nameErr;
  const rollErr = options?.students
    ? validateRollNumberUnique(
        fields.rollNumber,
        options.students,
        options.excludeStudentId,
      )
    : validateRollNumber(fields.rollNumber);
  if (rollErr) errors.rollNumber = rollErr;
  const classErr = validateClass(fields.studentClass);
  if (classErr) errors.studentClass = classErr;
  const mediumErr = validateMedium(fields.medium);
  if (mediumErr) errors.medium = mediumErr;
  const phoneErr = validatePhoneOptional(fields.phone);
  if (phoneErr) errors.phone = phoneErr;
  if (fields.branchId !== undefined) {
    const branchErr = validateBranchSelection(fields.branchId);
    if (branchErr) errors.branchId = branchErr;
  }
  return errors;
}

export type UserFormFields = "name" | "email" | "password" | "phone" | "branchId";

export function validateUserFields(
  fields: {
    name: string;
    email: string;
    password: string;
    phone: string;
    branchId?: string;
  },
  options: { requirePassword: boolean },
): FormErrors<UserFormFields> {
  const errors: FormErrors<UserFormFields> = {};
  const nameErr = validateName(fields.name);
  if (nameErr) errors.name = nameErr;
  const emailErr = validateEmail(fields.email);
  if (emailErr) errors.email = emailErr;
  if (options.requirePassword) {
    const passwordErr = validatePassword(fields.password);
    if (passwordErr) errors.password = passwordErr;
  }
  const phoneErr = validatePhoneOptional(fields.phone);
  if (phoneErr) errors.phone = phoneErr;
  if (fields.branchId !== undefined) {
    const branchErr = validateBranchSelection(fields.branchId);
    if (branchErr) errors.branchId = branchErr;
  }
  return errors;
}

export type BranchFormFields = "name" | "contact1Phone" | "contact2Phone" | "mapLocation";

export function validateBranchFields(form: BranchInput): FormErrors<BranchFormFields> {
  const errors: FormErrors<BranchFormFields> = {};
  const nameErr = validateRequired(form.name, "Name");
  if (nameErr) errors.name = nameErr;
  const phone1Err = validatePhoneOptional(form.contact1Phone);
  if (phone1Err) errors.contact1Phone = phone1Err;
  const phone2Err = validatePhoneOptional(form.contact2Phone);
  if (phone2Err) errors.contact2Phone = phone2Err;
  const map = form.mapLocation.trim();
  if (map && !/^https?:\/\/.+/i.test(map) && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(map)) {
    errors.mapLocation = "Enter a valid URL or coordinates (lat, lng).";
  }
  return errors;
}

export type QrDownloadFormFields = "student" | "branch" | "class";

export function validateQrDownload(
  mode: "individual" | "branch" | "class" | "all",
  fields: {
    selectedStudentId: string;
    branchFilter: string;
    classFilter: string;
  },
): FormErrors<QrDownloadFormFields> {
  const errors: FormErrors<QrDownloadFormFields> = {};
  if (mode === "individual" && !fields.selectedStudentId.trim()) {
    errors.student = "Select a student.";
  }
  if (mode === "branch" && fields.branchFilter === "all") {
    errors.branch = "Select a branch.";
  }
  if (mode === "class" && !fields.classFilter.trim()) {
    errors.class = "Select a class.";
  }
  return errors;
}

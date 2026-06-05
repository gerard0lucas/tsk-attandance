import type { AttendanceRecord, Branch, BranchUser, Manager, Student } from "../../types";

export type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "user";
  branch_id: string | null;
  created_at: string;
};

export type BranchRow = {
  id: string;
  name: string;
  location: string;
  created_at: string;
};

export type StudentRow = {
  id: string;
  branch_id: string;
  name: string;
  roll_number: string;
  class: string;
  gender: Student["gender"];
  photo_url: string | null;
  qr_token: string;
  active: boolean;
  created_at: string;
};

export type AttendanceRow = {
  id: string;
  student_id: string;
  branch_id: string;
  manager_id: string;
  date: string;
  marked_at: string;
};

export function toBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? "",
    createdAt: row.created_at,
  };
}

export function toManager(row: ProfileRow): Manager {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    branchId: row.branch_id ?? "",
    createdAt: row.created_at,
  };
}

export function toBranchUser(row: ProfileRow): BranchUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    branchId: row.branch_id ?? "",
    createdAt: row.created_at,
  };
}

export function toStudent(row: StudentRow): Student {
  return {
    id: row.id,
    branchId: row.branch_id,
    name: row.name,
    rollNumber: row.roll_number,
    class: row.class,
    gender: row.gender,
    photo: row.photo_url ?? undefined,
    qrToken: row.qr_token,
    active: row.active,
    createdAt: row.created_at,
  };
}

export function toAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    branchId: row.branch_id,
    markedById: row.manager_id,
    date: row.date,
    markedAt: row.marked_at,
  };
}

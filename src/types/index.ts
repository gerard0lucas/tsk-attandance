export type UserRole = "admin" | "manager" | "user";

export type Gender = "male" | "female" | "other";

export interface Branch {
  id: string;
  name: string;
  location: string;
  createdAt: string;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  branchId: string;
  createdAt: string;
}

export interface BranchUser {
  id: string;
  name: string;
  email: string;
  branchId: string;
  createdAt: string;
}

export type LoginResult =
  | { ok: true; role: UserRole }
  | { ok: false; message: string };

export interface Student {
  id: string;
  branchId: string;
  name: string;
  rollNumber: string;
  class: string;
  gender: Gender;
  photo?: string;
  qrToken: string;
  active: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  branchId: string;
  markedById: string;
  date: string;
  markedAt: string;
}

export interface Session {
  role: UserRole;
  userId: string;
  name: string;
  branchId?: string;
}

export interface QrPayload {
  v: 1;
  sid: string;
  tok: string;
}

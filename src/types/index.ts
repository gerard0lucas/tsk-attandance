export type UserRole = "admin" | "manager";

export type Gender = "male" | "female" | "other";

export interface Temple {
  id: string;
  name: string;
  location: string;
  createdAt: string;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export type LoginResult =
  | { ok: true; role: UserRole }
  | { ok: false; message: string };

export interface Student {
  id: string;
  templeId: string;
  name: string;
  rollNumber: string;
  class: string;
  gender: Gender;
  qrToken: string;
  active: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  templeId: string;
  managerId: string;
  date: string;
  markedAt: string;
}

export interface Session {
  role: UserRole;
  userId: string;
  name: string;
}

export interface QrPayload {
  v: 1;
  sid: string;
  tok: string;
}

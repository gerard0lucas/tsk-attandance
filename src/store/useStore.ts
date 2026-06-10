import { create } from "zustand";
import type {
  AttendanceRecord,
  Branch,
  BranchUser,
  LoginResult,
  Manager,
  Session,
  Student,
} from "../types";
import { branchAccessError } from "../lib/branchAccess";
import { todayKey } from "../lib/dates";
import { isSupabaseConfigured } from "../lib/supabase";
import * as db from "../lib/db";

interface AppState {
  ready: boolean;
  dataLoading: boolean;
  actionError: string | null;

  branches: Branch[];
  managers: Manager[];
  users: BranchUser[];
  students: Student[];
  attendance: AttendanceRecord[];
  session: Session | null;

  setReady: (ready: boolean) => void;
  setSession: (session: Session | null) => void;
  loadAllData: () => Promise<void>;
  clearActionError: () => void;

  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;

  addBranch: (data: Omit<Branch, "id" | "createdAt">) => Promise<Branch>;
  updateBranch: (id: string, data: Partial<Omit<Branch, "id" | "createdAt">>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  addManager: (data: {
    name: string;
    email: string;
    password: string;
    branchId: string;
    phone?: string;
    address?: string;
    photo?: string;
  }) => Promise<Manager>;
  updateManager: (
    id: string,
    data: Partial<{
      name: string;
      email: string;
      branchId: string;
      phone: string;
      address: string;
      photo: string;
    }>,
  ) => Promise<{ branchAssigned: boolean }>;
  deleteManager: (id: string) => Promise<void>;

  addBranchUser: (data: {
    name: string;
    email: string;
    password: string;
    branchId: string;
    phone?: string;
    address?: string;
    photo?: string;
  }) => Promise<BranchUser>;
  updateBranchUser: (
    id: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      address: string;
      photo: string;
    }>,
  ) => Promise<void>;
  deleteBranchUser: (id: string) => Promise<void>;

  addStudent: (data: {
    branchId: string;
    name: string;
    rollNumber: string;
    class: string;
    gender: Student["gender"];
    schoolName?: string;
    phone?: string;
    photo?: string;
  }) => Promise<Student>;
  updateStudent: (
    id: string,
    data: Partial<
      Pick<
        Student,
        | "name"
        | "rollNumber"
        | "class"
        | "gender"
        | "schoolName"
        | "phone"
        | "active"
        | "branchId"
        | "photo"
      >
    >,
  ) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;

  markAttendance: (studentId: string, markedById: string) => Promise<{
    ok: boolean;
    message: string;
    record?: AttendanceRecord;
  }>;
  markAttendanceForDate: (
    studentId: string,
    date: string,
    markedById: string,
  ) => Promise<{ ok: boolean; message: string }>;
  deleteAttendance: (id: string) => Promise<void>;

  getBranch: (id: string) => Branch | undefined;
  getManager: (id: string) => Manager | undefined;
  getBranchUser: (id: string) => BranchUser | undefined;
  getMarkedByName: (id: string) => string;
  getStudent: (id: string) => Student | undefined;
  getStudentsByBranch: (branchId: string) => Student[];
  getAttendanceForDate: (branchId: string, date: string) => AttendanceRecord[];
  isPresentToday: (studentId: string) => boolean;
  isPresentOnDate: (studentId: string, date: string) => boolean;
}

function requireSupabase(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file.",
    );
  }
}

function getActionErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Something went wrong.";
}

async function runAction<T>(fn: () => Promise<T>): Promise<T> {
  requireSupabase();
  try {
    const result = await fn();
    useStore.setState({ actionError: null });
    return result;
  } catch (e) {
    useStore.setState({ actionError: getActionErrorMessage(e) });
    throw e;
  }
}

export const useStore = create<AppState>()((set, get) => ({
  ready: false,
  dataLoading: false,
  actionError: null,

  branches: [],
  managers: [],
  users: [],
  students: [],
  attendance: [],
  session: null,

  setReady: (ready) => set({ ready }),
  setSession: (session) => set({ session }),
  clearActionError: () => set({ actionError: null }),

  loadAllData: async () => {
    requireSupabase();
    set({ dataLoading: true });
    try {
      const data = await db.fetchAllData();
      set({
        ...data,
        dataLoading: false,
        actionError: null,
      });
    } catch (e) {
      set({
        dataLoading: false,
        actionError: e instanceof Error ? e.message : "Failed to load data.",
      });
      throw e;
    } finally {
      set((s) => (s.dataLoading ? { dataLoading: false } : {}));
    }
  },

  login: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        message: "Supabase is not configured. Add your project keys to .env.",
      };
    }
    try {
      const result = await db.signIn(email, password);
      if (!result.ok) return result;

      let session = await db.fetchSessionProfile();
      if (!session) {
        await new Promise((r) => setTimeout(r, 400));
        session = await db.fetchSessionProfile();
      }
      if (!session) {
        await db.signOut();
        return {
          ok: false,
          message:
            "Signed in but no profile found. In Supabase, add a row in profiles with your user id and role (admin, manager, or user).",
        };
      }

      set({ session });
      void get().loadAllData().catch(() => undefined);
      return { ok: true, role: session.role };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Sign in failed.",
      };
    }
  },

  logout: async () => {
    await db.signOut();
    set({
      session: null,
      branches: [],
      managers: [],
      users: [],
      students: [],
      attendance: [],
    });
  },

  addBranch: (data) =>
    runAction(async () => {
      const branch = await db.insertBranch(data);
      set((s) => ({ branches: [...s.branches, branch] }));
      return branch;
    }),

  updateBranch: (id, data) =>
    runAction(async () => {
      await db.patchBranch(id, data);
      set((s) => ({
        branches: s.branches.map((b) => (b.id === id ? { ...b, ...data } : b)),
      }));
    }),

  deleteBranch: (id) =>
    runAction(async () => {
      await db.removeBranch(id);
      set((s) => ({
        branches: s.branches.filter((b) => b.id !== id),
        students: s.students.filter((st) => st.branchId !== id),
        attendance: s.attendance.filter((a) => a.branchId !== id),
      }));
    }),

  addManager: (data) =>
    runAction(async () => {
      const manager = await db.createManagerAccount(data);
      const adminSession = await db.fetchAdminSessionAfterManagerCreate();
      set((s) => ({
        managers: [...s.managers, manager],
        session: adminSession ?? s.session,
      }));
      return manager;
    }),

  updateManager: (id, data) =>
    runAction(async () => {
      const result = await db.patchManager(id, data);
      set((s) => ({
        managers: s.managers.map((m) =>
          m.id === id
            ? {
                ...m,
                ...data,
                branchId: result.branchAssigned ? (data.branchId ?? m.branchId) : m.branchId,
              }
            : m,
        ),
      }));
      return result;
    }),

  deleteManager: (id) =>
    runAction(async () => {
      await db.removeManager(id);
      set((s) => ({ managers: s.managers.filter((m) => m.id !== id) }));
    }),

  addBranchUser: (data) =>
    runAction(async () => {
      const user = await db.createBranchUserAccount(data);
      set((s) => ({ users: [...s.users, user] }));
      return user;
    }),

  updateBranchUser: (id, data) =>
    runAction(async () => {
      await db.patchBranchUser(id, data);
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
      }));
    }),

  deleteBranchUser: (id) =>
    runAction(async () => {
      await db.removeBranchUser(id);
      set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
    }),

  addStudent: (data) =>
    runAction(async () => {
      const session = get().session;
      const branchErr = branchAccessError(session, data.branchId);
      if (branchErr) throw new Error(branchErr);

      const student = await db.insertStudent(data);
      set((s) => ({ students: [...s.students, student] }));
      return student;
    }),

  updateStudent: (id, data) =>
    runAction(async () => {
      const session = get().session;
      const existing = get().students.find((s) => s.id === id);
      if (!existing) throw new Error("Student not found.");

      const targetBranch = data.branchId ?? existing.branchId;
      const branchErr = branchAccessError(session, targetBranch);
      if (branchErr) throw new Error(branchErr);

      const student = await db.patchStudent(id, data);
      set((s) => ({
        students: s.students.map((st) => (st.id === id ? student : st)),
      }));
      return student;
    }),

  deleteStudent: (id) =>
    runAction(async () => {
      const session = get().session;
      const student = get().students.find((s) => s.id === id);
      if (!student) throw new Error("Student not found.");

      const branchErr = branchAccessError(session, student.branchId);
      if (branchErr) throw new Error(branchErr);

      await db.removeStudent(id);
      set((s) => ({
        students: s.students.filter((st) => st.id !== id),
        attendance: s.attendance.filter((a) => a.studentId !== id),
      }));
    }),

  markAttendance: (studentId, markedById) =>
    runAction(async () => {
      const session = get().session;
      const student = get().students.find((s) => s.id === studentId);
      if (!student) return { ok: false, message: "Student not found." };
      if (!student.active) return { ok: false, message: "Student account is inactive." };

      const branchErr = branchAccessError(session, student.branchId);
      if (branchErr) return { ok: false, message: branchErr };

      const date = todayKey();
      const existing = get().attendance.find(
        (a) => a.studentId === studentId && a.date === date,
      );
      if (existing) {
        return { ok: false, message: "Already marked present today." };
      }

      try {
        const record = await db.insertAttendance({
          studentId,
          branchId: student.branchId,
          markedById,
          date,
        });
        set((s) => ({ attendance: [...s.attendance, record] }));
        return { ok: true, message: `${student.name} marked present.`, record };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not mark attendance.";
        if (msg.includes("duplicate") || msg.includes("unique")) {
          return { ok: false, message: "Already marked present today." };
        }
        throw e;
      }
    }),

  markAttendanceForDate: (studentId, date, markedById) =>
    runAction(async () => {
      const session = get().session;
      const student = get().students.find((s) => s.id === studentId);
      if (!student) return { ok: false, message: "Student not found." };
      if (!student.active) return { ok: false, message: "Student is inactive." };

      const branchErr = branchAccessError(session, student.branchId);
      if (branchErr) return { ok: false, message: branchErr };

      const record = await db.markAttendanceForDate({
        studentId,
        branchId: student.branchId,
        markedById,
        date,
      });
      set((s) => ({
        attendance: [
          ...s.attendance.filter((a) => !(a.studentId === studentId && a.date === date)),
          record,
        ],
      }));
      return { ok: true, message: `${student.name} marked for ${date}.` };
    }),

  deleteAttendance: (id) =>
    runAction(async () => {
      const session = get().session;
      const record = get().attendance.find((a) => a.id === id);
      if (!record) throw new Error("Attendance record not found.");

      const branchErr = branchAccessError(session, record.branchId);
      if (branchErr) throw new Error(branchErr);

      await db.removeAttendance(id);
      set((s) => ({
        attendance: s.attendance.filter((a) => a.id !== id),
      }));
    }),

  getBranch: (id) => get().branches.find((b) => b.id === id),
  getManager: (id) => get().managers.find((m) => m.id === id),
  getBranchUser: (id) => get().users.find((u) => u.id === id),
  getMarkedByName: (id) => {
    const m = get().getManager(id);
    if (m) return m.name;
    const u = get().getBranchUser(id);
    if (u) return u.name;
    return "—";
  },
  getStudent: (id) => get().students.find((s) => s.id === id),
  getStudentsByBranch: (branchId) => get().students.filter((s) => s.branchId === branchId),
  getAttendanceForDate: (branchId, date) =>
    get().attendance.filter((a) => a.branchId === branchId && a.date === date),
  isPresentToday: (studentId) => {
    const date = todayKey();
    return get().attendance.some((a) => a.studentId === studentId && a.date === date);
  },
  isPresentOnDate: (studentId, date) =>
    get().attendance.some((a) => a.studentId === studentId && a.date === date),
}));

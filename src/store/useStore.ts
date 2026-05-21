import { create } from "zustand";
import type {
  AttendanceRecord,
  Branch,
  LoginResult,
  Manager,
  Session,
  Student,
} from "../types";
import { todayKey } from "../lib/dates";
import { isSupabaseConfigured } from "../lib/supabase";
import * as db from "../lib/db";

interface AppState {
  ready: boolean;
  dataLoading: boolean;
  actionError: string | null;

  branches: Branch[];
  managers: Manager[];
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

  addManager: (data: { name: string; email: string; password: string }) => Promise<Manager>;
  updateManager: (
    id: string,
    data: Partial<{ name: string; email: string }>,
  ) => Promise<void>;
  deleteManager: (id: string) => Promise<void>;

  addStudent: (data: {
    branchId: string;
    name: string;
    rollNumber: string;
    class: string;
    gender: Student["gender"];
    photo?: string;
  }) => Promise<Student>;
  updateStudent: (
    id: string,
    data: Partial<
      Pick<Student, "name" | "rollNumber" | "class" | "gender" | "active" | "branchId" | "photo">
    >,
  ) => Promise<Student>;
  regenerateQr: (id: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;

  markAttendance: (studentId: string, managerId: string) => Promise<{
    ok: boolean;
    message: string;
    record?: AttendanceRecord;
  }>;

  getBranch: (id: string) => Branch | undefined;
  getManager: (id: string) => Manager | undefined;
  getStudent: (id: string) => Student | undefined;
  getStudentsByBranch: (branchId: string) => Student[];
  getAttendanceForDate: (branchId: string, date: string) => AttendanceRecord[];
  isPresentToday: (studentId: string) => boolean;
}

function requireSupabase(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file.",
    );
  }
}

async function runAction<T>(fn: () => Promise<T>): Promise<T> {
  requireSupabase();
  try {
    const result = await fn();
    useStore.setState({ actionError: null });
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    useStore.setState({ actionError: message });
    throw e;
  }
}

export const useStore = create<AppState>()((set, get) => ({
  ready: false,
  dataLoading: false,
  actionError: null,

  branches: [],
  managers: [],
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

      const session = await db.fetchSessionProfile();
      if (!session) {
        await db.signOut();
        return { ok: false, message: "No profile found for this account. Contact an admin." };
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
      await db.patchManager(id, data);
      set((s) => ({
        managers: s.managers.map((m) => (m.id === id ? { ...m, ...data } : m)),
      }));
    }),

  deleteManager: (id) =>
    runAction(async () => {
      await db.removeManager(id);
      set((s) => ({ managers: s.managers.filter((m) => m.id !== id) }));
    }),

  addStudent: (data) =>
    runAction(async () => {
      const student = await db.insertStudent(data);
      set((s) => ({ students: [...s.students, student] }));
      return student;
    }),

  updateStudent: (id, data) =>
    runAction(async () => {
      const student = await db.patchStudent(id, data);
      set((s) => ({
        students: s.students.map((st) => (st.id === id ? student : st)),
      }));
      return student;
    }),

  regenerateQr: (id) =>
    runAction(async () => {
      const student = await db.regenerateStudentQr(id);
      set((s) => ({
        students: s.students.map((st) => (st.id === id ? student : st)),
      }));
    }),

  deleteStudent: (id) =>
    runAction(async () => {
      await db.removeStudent(id);
      set((s) => ({
        students: s.students.filter((st) => st.id !== id),
        attendance: s.attendance.filter((a) => a.studentId !== id),
      }));
    }),

  markAttendance: (studentId, managerId) =>
    runAction(async () => {
      const student = get().students.find((s) => s.id === studentId);
      if (!student) return { ok: false, message: "Student not found." };
      if (!student.active) return { ok: false, message: "Student account is inactive." };

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
          managerId,
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

  getBranch: (id) => get().branches.find((b) => b.id === id),
  getManager: (id) => get().managers.find((m) => m.id === id),
  getStudent: (id) => get().students.find((s) => s.id === id),
  getStudentsByBranch: (branchId) => get().students.filter((s) => s.branchId === branchId),
  getAttendanceForDate: (branchId, date) =>
    get().attendance.filter((a) => a.branchId === branchId && a.date === date),
  isPresentToday: (studentId) => {
    const date = todayKey();
    return get().attendance.some((a) => a.studentId === studentId && a.date === date);
  },
}));

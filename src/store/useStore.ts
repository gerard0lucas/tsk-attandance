import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AttendanceRecord,
  LoginResult,
  Manager,
  Session,
  Student,
  Temple,
} from "../types";
import { generateQrToken } from "../lib/qr";
import { todayKey } from "../lib/dates";
import { DEMO_ADMIN, DEFAULT_MANAGER_PASSWORD, normalizeEmail } from "../lib/auth";
import { normalizeStudentFields } from "../lib/student";

const seedTemples: Temple[] = [
  {
    id: "temple-1",
    name: "North Valley Temple",
    location: "Portland, OR",
    createdAt: "2025-01-10T10:00:00Z",
  },
  {
    id: "temple-2",
    name: "Riverside Temple",
    location: "Sacramento, CA",
    createdAt: "2025-02-15T10:00:00Z",
  },
];

const seedManagers: Manager[] = [
  {
    id: "mgr-1",
    name: "Priya Sharma",
    email: "priya@tsk.org",
    password: DEFAULT_MANAGER_PASSWORD,
    createdAt: "2025-01-12T10:00:00Z",
  },
  {
    id: "mgr-2",
    name: "James Chen",
    email: "james@tsk.org",
    password: DEFAULT_MANAGER_PASSWORD,
    createdAt: "2025-02-16T10:00:00Z",
  },
];

const seedStudents: Student[] = [
  {
    id: "stu-1",
    templeId: "temple-1",
    name: "Ananya Patel",
    rollNumber: "NV-001",
    class: "10-A",
    gender: "female",
    qrToken: "a1b2c3d4e5f67890",
    active: true,
    createdAt: "2025-01-20T10:00:00Z",
  },
  {
    id: "stu-2",
    templeId: "temple-1",
    name: "Rohan Mehta",
    rollNumber: "NV-002",
    class: "10-A",
    gender: "male",
    qrToken: "b2c3d4e5f6789012",
    active: true,
    createdAt: "2025-01-21T10:00:00Z",
  },
  {
    id: "stu-3",
    templeId: "temple-2",
    name: "Sofia Garcia",
    rollNumber: "RV-001",
    class: "9-B",
    gender: "female",
    qrToken: "c3d4e5f678901234",
    active: true,
    createdAt: "2025-02-20T10:00:00Z",
  },
];

interface AppState {
  temples: Temple[];
  managers: Manager[];
  students: Student[];
  attendance: AttendanceRecord[];
  session: Session | null;

  login: (email: string, password: string) => LoginResult;
  logout: () => void;

  addTemple: (data: Omit<Temple, "id" | "createdAt">) => Temple;
  updateTemple: (id: string, data: Partial<Omit<Temple, "id" | "createdAt">>) => void;
  deleteTemple: (id: string) => void;

  addManager: (data: Omit<Manager, "id" | "createdAt">) => Manager;
  updateManager: (
    id: string,
    data: Partial<Omit<Manager, "id" | "createdAt">>,
  ) => void;
  deleteManager: (id: string) => void;

  addStudent: (data: {
    templeId: string;
    name: string;
    rollNumber: string;
    class: string;
    gender: Student["gender"];
  }) => Student;
  updateStudent: (
    id: string,
    data: Partial<
      Pick<Student, "name" | "rollNumber" | "class" | "gender" | "active" | "templeId">
    >,
  ) => void;
  regenerateQr: (id: string) => void;
  deleteStudent: (id: string) => void;

  markAttendance: (studentId: string, managerId: string) => {
    ok: boolean;
    message: string;
    record?: AttendanceRecord;
  };

  getTemple: (id: string) => Temple | undefined;
  getManager: (id: string) => Manager | undefined;
  getStudent: (id: string) => Student | undefined;
  getStudentsByTemple: (templeId: string) => Student[];
  getAttendanceForDate: (templeId: string, date: string) => AttendanceRecord[];
  isPresentToday: (studentId: string) => boolean;
}

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function managerPassword(manager: Manager): string {
  return manager.password ?? DEFAULT_MANAGER_PASSWORD;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      temples: seedTemples,
      managers: seedManagers,
      students: seedStudents,
      attendance: [],
      session: null,

      login: (email, password) => {
        const normalized = normalizeEmail(email);
        const pwd = password.trim();

        if (normalized === DEMO_ADMIN.email && pwd === DEMO_ADMIN.password) {
          set({
            session: {
              role: "admin",
              userId: DEMO_ADMIN.id,
              name: DEMO_ADMIN.name,
            },
          });
          return { ok: true, role: "admin" };
        }

        const manager = get().managers.find(
          (m) => normalizeEmail(m.email) === normalized,
        );
        if (manager && managerPassword(manager) === pwd) {
          set({
            session: {
              role: "manager",
              userId: manager.id,
              name: manager.name,
            },
          });
          return { ok: true, role: "manager" };
        }

        return { ok: false, message: "Invalid email or password." };
      },

      logout: () => set({ session: null }),

      addTemple: (data) => {
        const temple: Temple = {
          id: uid("temple"),
          ...data,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ temples: [...s.temples, temple] }));
        return temple;
      },

      updateTemple: (id, data) =>
        set((s) => ({
          temples: s.temples.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),

      deleteTemple: (id) =>
        set((s) => ({
          temples: s.temples.filter((t) => t.id !== id),
          students: s.students.filter((st) => st.templeId !== id),
          attendance: s.attendance.filter((a) => a.templeId !== id),
        })),

      addManager: (data) => {
        const manager: Manager = {
          id: uid("mgr"),
          ...data,
          password: data.password || DEFAULT_MANAGER_PASSWORD,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ managers: [...s.managers, manager] }));
        return manager;
      },

      updateManager: (id, data) =>
        set((s) => ({
          managers: s.managers.map((m) => (m.id === id ? { ...m, ...data } : m)),
        })),

      deleteManager: (id) => set((s) => ({ managers: s.managers.filter((m) => m.id !== id) })),

      addStudent: (data) => {
        const student: Student = {
          id: uid("stu"),
          ...data,
          qrToken: generateQrToken(),
          active: true,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ students: [...s.students, student] }));
        return student;
      },

      updateStudent: (id, data) =>
        set((s) => ({
          students: s.students.map((st) => (st.id === id ? { ...st, ...data } : st)),
        })),

      regenerateQr: (id) =>
        set((s) => ({
          students: s.students.map((st) =>
            st.id === id ? { ...st, qrToken: generateQrToken() } : st,
          ),
        })),

      deleteStudent: (id) =>
        set((s) => ({
          students: s.students.filter((st) => st.id !== id),
          attendance: s.attendance.filter((a) => a.studentId !== id),
        })),

      markAttendance: (studentId, managerId) => {
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

        const record: AttendanceRecord = {
          id: uid("att"),
          studentId,
          templeId: student.templeId,
          managerId,
          date,
          markedAt: new Date().toISOString(),
        };
        set((s) => ({ attendance: [...s.attendance, record] }));
        return { ok: true, message: `${student.name} marked present.`, record };
      },

      getTemple: (id) => get().temples.find((t) => t.id === id),
      getManager: (id) => get().managers.find((m) => m.id === id),
      getStudent: (id) => get().students.find((s) => s.id === id),
      getStudentsByTemple: (templeId) =>
        get().students.filter((s) => s.templeId === templeId),
      getAttendanceForDate: (templeId, date) =>
        get().attendance.filter((a) => a.templeId === templeId && a.date === date),
      isPresentToday: (studentId) => {
        const date = todayKey();
        return get().attendance.some((a) => a.studentId === studentId && a.date === date);
      },
    }),
    {
      name: "tsk-attendance-store",
      partialize: (s) => ({
        temples: s.temples,
        managers: s.managers,
        students: s.students,
        attendance: s.attendance,
        session: s.session,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AppState> | undefined;
        if (!saved) return current;

        const managers = (saved.managers ?? current.managers).map((m) => {
          const { templeId: _removed, ...rest } = m as Manager & { templeId?: string };
          return {
            ...rest,
            password: rest.password ?? DEFAULT_MANAGER_PASSWORD,
          };
        });

        return {
          ...current,
          temples: saved.temples ?? current.temples,
          managers,
          students: (saved.students ?? current.students).map((s) =>
            normalizeStudentFields(s as Student),
          ),
          attendance: saved.attendance ?? current.attendance,
          session: saved.session ?? null,
        };
      },
    },
  ),
);

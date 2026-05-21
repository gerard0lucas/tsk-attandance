import { supabase } from "../supabase";
import { generateQrToken } from "../qr";
import { normalizeEmail } from "../auth";
import type { AttendanceRecord, Branch, Manager, Session, Student, UserRole } from "../../types";
import {
  toAttendance,
  toBranch,
  toManager,
  toStudent,
  type AttendanceRow,
  type BranchRow,
  type ProfileRow,
  type StudentRow,
} from "./mappers";
import { isDataUrl, removeStudentPhoto, uploadStudentPhoto } from "../storage";
import { pauseAuthSync, resumeAuthSync } from "../authSync";

export async function fetchSessionProfile(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, created_at")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  const row = data as ProfileRow;
  if (row.role !== "admin" && row.role !== "manager") return null;

  return {
    role: row.role as UserRole,
    userId: row.id,
    name: row.name,
  };
}

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: password.trim(),
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchAllData(): Promise<{
  branches: Branch[];
  managers: Manager[];
  students: Student[];
  attendance: AttendanceRecord[];
}> {
  const [branchesRes, managersRes, studentsRes, attendanceRes] = await Promise.all([
    supabase.from("branches").select("*").order("created_at"),
    supabase.from("profiles").select("*").eq("role", "manager").order("created_at"),
    supabase.from("students").select("*").order("created_at"),
    supabase.from("attendance").select("*").order("marked_at"),
  ]);

  if (branchesRes.error) throw branchesRes.error;
  if (managersRes.error) throw managersRes.error;
  if (studentsRes.error) throw studentsRes.error;
  if (attendanceRes.error) throw attendanceRes.error;

  return {
    branches: (branchesRes.data as BranchRow[]).map(toBranch),
    managers: (managersRes.data as ProfileRow[]).map(toManager),
    students: (studentsRes.data as StudentRow[]).map(toStudent),
    attendance: (attendanceRes.data as AttendanceRow[]).map(toAttendance),
  };
}

export async function insertBranch(data: { name: string; location: string }): Promise<Branch> {
  const { data: row, error } = await supabase
    .from("branches")
    .insert({ name: data.name, location: data.location })
    .select()
    .single();
  if (error) throw error;
  return toBranch(row as BranchRow);
}

export async function patchBranch(
  id: string,
  data: Partial<{ name: string; location: string }>,
): Promise<void> {
  const { error } = await supabase.from("branches").update(data).eq("id", id);
  if (error) throw error;
}

export async function removeBranch(id: string): Promise<void> {
  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) throw error;
}

function isRateLimitError(message: string): boolean {
  return /rate limit|too many requests/i.test(message);
}

async function fetchManagerProfileById(userId: string): Promise<Manager> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError) throw profileError;
  return toManager(profile as ProfileRow);
}

/** Creates manager via Auth signUp. Restores admin session so the admin is not signed in as the new manager. */
export async function createManagerAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Manager> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const password = input.password;

  const {
    data: { session: adminSession },
  } = await supabase.auth.getSession();

  pauseAuthSync();
  try {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: "manager" },
      },
    });

    if (error) {
      if (isRateLimitError(error.message)) {
        throw new Error(
          "Too many sign-up attempts. Wait about an hour, or add the user in Supabase → Authentication → Users (Auto Confirm on), then set role to manager in the profiles table.",
        );
      }
      throw error;
    }
    if (!signUpData.user) throw new Error("Could not create manager account.");

    const manager = await fetchManagerProfileById(signUpData.user.id);

    if (adminSession) {
      const { error: restoreError } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
      if (restoreError) throw restoreError;
    }

    return manager;
  } finally {
    resumeAuthSync();
  }
}

/** Call after createManagerAccount to sync Zustand session back to the logged-in admin. */
export async function fetchAdminSessionAfterManagerCreate(): Promise<Session | null> {
  return fetchSessionProfile();
}

export async function patchManager(
  id: string,
  data: Partial<{ name: string; email: string }>,
): Promise<void> {
  const { error } = await supabase.from("profiles").update(data).eq("id", id);
  if (error) throw error;
}

export async function removeManager(id: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

async function resolvePhoto(
  studentId: string,
  photo: string | undefined,
): Promise<string | null | undefined> {
  if (photo === undefined) return undefined;
  if (!photo) {
    await removeStudentPhoto(studentId).catch(() => undefined);
    return null;
  }
  if (isDataUrl(photo)) {
    return uploadStudentPhoto(studentId, photo);
  }
  return photo;
}

export async function insertStudent(data: {
  branchId: string;
  name: string;
  rollNumber: string;
  class: string;
  gender: Student["gender"];
  photo?: string;
}): Promise<Student> {
  const qrToken = generateQrToken();
  const { data: row, error } = await supabase
    .from("students")
    .insert({
      branch_id: data.branchId,
      name: data.name,
      roll_number: data.rollNumber,
      class: data.class,
      gender: data.gender,
      qr_token: qrToken,
      active: true,
    })
    .select()
    .single();

  if (error) throw error;
  const student = toStudent(row as StudentRow);

  if (data.photo) {
    const photoUrl = await resolvePhoto(student.id, data.photo);
    if (photoUrl) {
      const { data: updated, error: upErr } = await supabase
        .from("students")
        .update({ photo_url: photoUrl })
        .eq("id", student.id)
        .select()
        .single();
      if (upErr) throw upErr;
      return toStudent(updated as StudentRow);
    }
  }

  return student;
}

export async function patchStudent(
  id: string,
  data: Partial<{
    branchId: string;
    name: string;
    rollNumber: string;
    class: string;
    gender: Student["gender"];
    active: boolean;
    photo?: string;
  }>,
): Promise<Student> {
  const payload: Record<string, unknown> = {};
  if (data.branchId !== undefined) payload.branch_id = data.branchId;
  if (data.name !== undefined) payload.name = data.name;
  if (data.rollNumber !== undefined) payload.roll_number = data.rollNumber;
  if (data.class !== undefined) payload.class = data.class;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.active !== undefined) payload.active = data.active;

  if (data.photo !== undefined) {
    payload.photo_url = await resolvePhoto(id, data.photo);
  }

  const { data: row, error } = await supabase
    .from("students")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toStudent(row as StudentRow);
}

export async function regenerateStudentQr(id: string): Promise<Student> {
  const qrToken = generateQrToken();
  const { data: row, error } = await supabase
    .from("students")
    .update({ qr_token: qrToken })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toStudent(row as StudentRow);
}

export async function removeStudent(id: string): Promise<void> {
  await removeStudentPhoto(id).catch(() => undefined);
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw error;
}

export async function insertAttendance(data: {
  studentId: string;
  branchId: string;
  managerId: string;
  date: string;
}): Promise<AttendanceRecord> {
  const { data: row, error } = await supabase
    .from("attendance")
    .insert({
      student_id: data.studentId,
      branch_id: data.branchId,
      manager_id: data.managerId,
      date: data.date,
    })
    .select()
    .single();
  if (error) throw error;
  return toAttendance(row as AttendanceRow);
}

import { supabase } from "../supabase";
import { generateQrToken } from "../qr";
import { normalizeEmail } from "../auth";
import type {
  AttendanceRecord,
  Branch,
  BranchUser,
  Manager,
  Session,
  Student,
} from "../../types";
import type { BranchInput } from "../branch";
import { fetchSessionProfile } from "../session";
import { normalizeStudentName } from "../student";
import { sanitizeRollNumber } from "../validation";
import {
  toAttendance,
  toBranch,
  toBranchUser,
  toManager,
  toStudent,
  branchToRow,
  type AttendanceRow,
  type BranchRow,
  type ProfileRow,
  type StudentRow,
} from "./mappers";
import { isDataUrl, removeStudentPhoto, uploadStudentPhoto, uploadProfilePhoto, removeProfilePhoto } from "../storage";
import { pauseAuthSync, resumeAuthSync } from "../authSync";
import { getDbErrorMessage, isMissingBranchIdColumn } from "./errors";

export { fetchSessionProfile } from "../session";

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
  users: BranchUser[];
  students: Student[];
  attendance: AttendanceRecord[];
}> {
  const [branchesRes, managersRes, usersRes, studentsRes, attendanceRes] = await Promise.all([
    supabase.from("branches").select("*").order("created_at"),
    supabase.from("profiles").select("*").eq("role", "manager").order("created_at"),
    supabase.from("profiles").select("*").eq("role", "user").order("created_at"),
    supabase.from("students").select("*").order("created_at"),
    supabase.from("attendance").select("*").order("marked_at"),
  ]);

  if (branchesRes.error) throw branchesRes.error;
  if (managersRes.error) throw managersRes.error;
  if (usersRes.error) throw usersRes.error;
  if (studentsRes.error) throw studentsRes.error;
  if (attendanceRes.error) throw attendanceRes.error;

  return {
    branches: (branchesRes.data as BranchRow[]).map(toBranch),
    managers: (managersRes.data as ProfileRow[]).map(toManager),
    users: (usersRes.data as ProfileRow[]).map(toBranchUser),
    students: (studentsRes.data as StudentRow[]).map(toStudent),
    attendance: (attendanceRes.data as AttendanceRow[]).map(toAttendance),
  };
}

export async function insertBranch(data: BranchInput): Promise<Branch> {
  const { data: row, error } = await supabase
    .from("branches")
    .insert(branchToRow(data))
    .select()
    .single();
  if (error) throw error;
  return toBranch(row as BranchRow);
}

export async function patchBranch(id: string, data: Partial<BranchInput>): Promise<void> {
  const { error } = await supabase.from("branches").update(branchToRow(data)).eq("id", id);
  if (error) throw error;
}

export async function removeBranch(id: string): Promise<void> {
  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) throw error;
}

function isRateLimitError(message: string): boolean {
  return /rate limit|too many requests/i.test(message);
}

async function fetchProfileById(userId: string): Promise<ProfileRow> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return profile as ProfileRow;
}

async function createStaffAccount(input: {
  name: string;
  email: string;
  password: string;
  role: "manager" | "user";
  branchId: string;
}): Promise<ProfileRow> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const password = input.password;

  const {
    data: { session: callerSession },
  } = await supabase.auth.getSession();

  pauseAuthSync();
  try {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: input.role,
          branch_id: input.branchId,
        },
      },
    });

    if (error) {
      if (isRateLimitError(error.message)) {
        throw new Error(
          "Too many sign-up attempts. Wait about an hour, or add the user in Supabase Dashboard.",
        );
      }
      throw error;
    }
    if (!signUpData.user) throw new Error("Could not create account.");

    const profile = await fetchProfileById(signUpData.user.id);

    if (callerSession) {
      const { error: restoreError } = await supabase.auth.setSession({
        access_token: callerSession.access_token,
        refresh_token: callerSession.refresh_token,
      });
      if (restoreError) throw restoreError;

      if (input.role === "user" && profile.branch_id !== input.branchId) {
        await supabase
          .from("profiles")
          .update({ branch_id: input.branchId, role: "user" })
          .eq("id", signUpData.user.id);
        return fetchProfileById(signUpData.user.id);
      }
    }

    return profile;
  } finally {
    resumeAuthSync();
  }
}

async function resolveProfilePhoto(
  profileId: string,
  photo: string | undefined,
): Promise<string | null | undefined> {
  if (photo === undefined) return undefined;
  if (!photo) {
    await removeProfilePhoto(profileId).catch(() => undefined);
    return null;
  }
  if (isDataUrl(photo)) {
    return uploadProfilePhoto(profileId, photo);
  }
  return photo;
}

async function applyProfileExtraFields(
  profileId: string,
  data: { phone?: string; address?: string; photo?: string },
): Promise<ProfileRow> {
  const payload: Record<string, unknown> = {};
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.address !== undefined) payload.address = data.address;
  if (data.photo !== undefined) {
    payload.photo_url = await resolveProfilePhoto(profileId, data.photo);
  }
  if (Object.keys(payload).length === 0) return fetchProfileById(profileId);

  const { data: row, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profileId)
    .select()
    .single();
  if (error) throw error;
  return row as ProfileRow;
}

export async function createManagerAccount(input: {
  name: string;
  email: string;
  password: string;
  branchId: string;
  phone?: string;
  address?: string;
  photo?: string;
}): Promise<Manager> {
  const profile = await createStaffAccount({ ...input, role: "manager" });
  let updated = profile;

  if (!profile.branch_id && input.branchId) {
    const { error } = await supabase
      .from("profiles")
      .update({ branch_id: input.branchId })
      .eq("id", profile.id);
    if (!error) updated = { ...profile, branch_id: input.branchId };
    else if (!isMissingBranchIdColumn(getDbErrorMessage(error))) throw error;
  }

  updated = await applyProfileExtraFields(profile.id, {
    phone: input.phone ?? "",
    address: input.address ?? "",
    photo: input.photo,
  });

  return toManager(updated);
}

export async function createBranchUserAccount(input: {
  name: string;
  email: string;
  password: string;
  branchId: string;
  phone?: string;
  address?: string;
  photo?: string;
}): Promise<BranchUser> {
  const profile = await createStaffAccount({ ...input, role: "user" });
  let updated = profile;

  if (!profile.branch_id && input.branchId) {
    const { error } = await supabase
      .from("profiles")
      .update({ branch_id: input.branchId, role: "user" })
      .eq("id", profile.id);
    if (!error) updated = { ...profile, branch_id: input.branchId, role: "user" };
    else if (!isMissingBranchIdColumn(getDbErrorMessage(error))) throw error;
  } else if (profile.branch_id) {
    updated = profile;
  } else {
    updated = { ...profile, branch_id: input.branchId };
  }

  updated = await applyProfileExtraFields(profile.id, {
    phone: input.phone ?? "",
    address: input.address ?? "",
    photo: input.photo,
  });

  return toBranchUser(updated);
}

export async function fetchAdminSessionAfterManagerCreate(): Promise<Session | null> {
  return fetchSessionProfile();
}

export type PatchManagerResult = { branchAssigned: boolean };

export async function patchManager(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    branchId: string;
    phone: string;
    address: string;
    photo: string;
  }>,
): Promise<PatchManagerResult> {
  const base: Record<string, unknown> = {};
  if (data.name !== undefined) base.name = data.name;
  if (data.email !== undefined) base.email = data.email;
  if (data.phone !== undefined) base.phone = data.phone;
  if (data.address !== undefined) base.address = data.address;

  const wantsBranch = Boolean(data.branchId);

  if (wantsBranch) {
    const { error } = await supabase
      .from("profiles")
      .update({ ...base, branch_id: data.branchId })
      .eq("id", id);
    if (!error) {
      if (data.photo !== undefined) await applyProfileExtraFields(id, { photo: data.photo });
      return { branchAssigned: true };
    }
    if (!isMissingBranchIdColumn(getDbErrorMessage(error))) throw error;
  }

  if (Object.keys(base).length > 0) {
    const { error } = await supabase.from("profiles").update(base).eq("id", id);
    if (error) throw error;
  }

  if (data.photo !== undefined) {
    await applyProfileExtraFields(id, { photo: data.photo });
  }

  return { branchAssigned: !wantsBranch };
}

export async function patchBranchUser(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    photo: string;
  }>,
): Promise<void> {
  const base: Record<string, unknown> = {};
  if (data.name !== undefined) base.name = data.name;
  if (data.email !== undefined) base.email = data.email;
  if (data.phone !== undefined) base.phone = data.phone;
  if (data.address !== undefined) base.address = data.address;

  if (Object.keys(base).length > 0) {
    const { error } = await supabase.from("profiles").update(base).eq("id", id);
    if (error) throw error;
  }

  if (data.photo !== undefined) {
    await applyProfileExtraFields(id, { photo: data.photo });
  }
}

export async function removeManager(id: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

export async function removeBranchUser(id: string): Promise<void> {
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
  medium?: Student["medium"];
  schoolName?: string;
  phone?: string;
  photo?: string;
}): Promise<Student> {
  const qrToken = generateQrToken();
  const rollNumber = sanitizeRollNumber(data.rollNumber);
  const { data: row, error } = await supabase
    .from("students")
    .insert({
      branch_id: data.branchId,
      name: normalizeStudentName(data.name),
      roll_number: rollNumber,
      class: data.class,
      gender: data.gender,
      medium: data.medium ?? "english",
      school_name: data.schoolName ?? "",
      phone: data.phone ?? "",
      qr_token: qrToken,
      active: true,
    })
    .select()
    .single();

  if (error) throw new Error(getDbErrorMessage(error));
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
    medium: Student["medium"];
    schoolName: string;
    phone: string;
    active: boolean;
    photo?: string;
  }>,
): Promise<Student> {
  const payload: Record<string, unknown> = {};
  if (data.branchId !== undefined) payload.branch_id = data.branchId;
  if (data.name !== undefined) payload.name = normalizeStudentName(data.name);
  if (data.rollNumber !== undefined) payload.roll_number = sanitizeRollNumber(data.rollNumber);
  if (data.class !== undefined) payload.class = data.class;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.medium !== undefined) payload.medium = data.medium;
  if (data.schoolName !== undefined) payload.school_name = data.schoolName;
  if (data.phone !== undefined) payload.phone = data.phone;
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

  if (error) throw new Error(getDbErrorMessage(error));
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
  markedById: string;
  date: string;
}): Promise<AttendanceRecord> {
  const { data: row, error } = await supabase
    .from("attendance")
    .insert({
      student_id: data.studentId,
      branch_id: data.branchId,
      manager_id: data.markedById,
      date: data.date,
    })
    .select()
    .single();
  if (error) throw error;
  return toAttendance(row as AttendanceRow);
}

export async function removeAttendance(id: string): Promise<void> {
  const { error } = await supabase.from("attendance").delete().eq("id", id);
  if (error) throw error;
}

export async function markAttendanceForDate(data: {
  studentId: string;
  branchId: string;
  markedById: string;
  date: string;
}): Promise<AttendanceRecord> {
  await supabase
    .from("attendance")
    .delete()
    .eq("student_id", data.studentId)
    .eq("date", data.date);
  return insertAttendance(data);
}

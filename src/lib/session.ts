import { supabase } from "./supabase";
import type { Session, UserRole } from "../types";
import type { ProfileRow } from "./db/mappers";

const VALID_ROLES: UserRole[] = ["admin", "manager", "user"];

function toSession(row: ProfileRow): Session | null {
  if (!VALID_ROLES.includes(row.role as UserRole)) return null;
  if (row.active === false) return null;
  return {
    role: row.role as UserRole,
    userId: row.id,
    name: row.name,
    branchId: row.branch_id ?? undefined,
    photo: row.photo_url ?? undefined,
  };
}

async function fetchProfileRow(userId: string): Promise<ProfileRow | null> {
  const withBranch = await supabase
    .from("profiles")
    .select("id, email, name, role, branch_id, photo_url, active, created_at")
    .eq("id", userId)
    .single();

  if (!withBranch.error && withBranch.data) {
    return withBranch.data as ProfileRow;
  }

  const message = withBranch.error?.message ?? "";
  if (/active/i.test(message)) {
    const withoutActive = await supabase
      .from("profiles")
      .select("id, email, name, role, branch_id, photo_url, created_at")
      .eq("id", userId)
      .single();
    if (!withoutActive.error && withoutActive.data) {
      return { ...(withoutActive.data as ProfileRow), active: true };
    }
  }

  if (message.includes("branch_id")) {
    const basic = await supabase
      .from("profiles")
      .select("id, email, name, role, photo_url, created_at")
      .eq("id", userId)
      .single();
    if (!basic.error && basic.data) {
      return { ...(basic.data as ProfileRow), branch_id: null, active: true };
    }
  }

  return null;
}

/** Load app session from Supabase Auth + profiles table */
export async function fetchSessionProfile(): Promise<Session | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    if (/refresh token/i.test(sessionError.message)) {
      await supabase.auth.signOut();
    }
    return null;
  }

  if (!session?.user) return null;

  const user = session.user;

  const data = await fetchProfileRow(user.id);
  if (data) {
    if (data.active === false) return null;
    const profile = toSession(data);
    if (profile) return profile;
  }

  const metaRole = user.user_metadata?.role;
  if (VALID_ROLES.includes(metaRole as UserRole)) {
    return {
      role: metaRole as UserRole,
      userId: user.id,
      name: String(user.user_metadata?.name ?? user.email ?? "User"),
      branchId: user.user_metadata?.branch_id ?? undefined,
    };
  }

  return null;
}

/** True when the signed-in auth user has profiles.active = false. */
export async function isCurrentProfileInactive(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return false;
  const row = await fetchProfileRow(session.user.id);
  return row?.active === false;
}

export async function hasAuthUser(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return Boolean(session?.user);
}

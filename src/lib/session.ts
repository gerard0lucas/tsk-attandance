import { supabase } from "./supabase";
import type { Session, UserRole } from "../types";
import type { ProfileRow } from "./db/mappers";

const VALID_ROLES: UserRole[] = ["admin", "manager", "user"];

function toSession(row: ProfileRow): Session | null {
  if (!VALID_ROLES.includes(row.role as UserRole)) return null;
  return {
    role: row.role as UserRole,
    userId: row.id,
    name: row.name,
    branchId: row.branch_id ?? undefined,
  };
}

async function fetchProfileRow(userId: string): Promise<ProfileRow | null> {
  const withBranch = await supabase
    .from("profiles")
    .select("id, email, name, role, branch_id, created_at")
    .eq("id", userId)
    .single();

  if (!withBranch.error && withBranch.data) {
    return withBranch.data as ProfileRow;
  }

  if (withBranch.error?.message?.includes("branch_id")) {
    const basic = await supabase
      .from("profiles")
      .select("id, email, name, role, created_at")
      .eq("id", userId)
      .single();
    if (!basic.error && basic.data) {
      return { ...(basic.data as ProfileRow), branch_id: null };
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

export async function hasAuthUser(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return Boolean(session?.user);
}

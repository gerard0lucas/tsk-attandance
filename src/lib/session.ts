import { supabase } from "./supabase";
import type { Session, UserRole } from "../types";
import type { ProfileRow } from "./db/mappers";

/** Load app session from Supabase Auth + profiles table */
export async function fetchSessionProfile(): Promise<Session | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) return null;

  const user = session.user;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, created_at")
    .eq("id", user.id)
    .single();

  if (!error && data) {
    const row = data as ProfileRow;
    if (row.role === "admin" || row.role === "manager") {
      return {
        role: row.role as UserRole,
        userId: row.id,
        name: row.name,
      };
    }
  }

  const metaRole = user.user_metadata?.role;
  if (metaRole === "admin" || metaRole === "manager") {
    return {
      role: metaRole as UserRole,
      userId: user.id,
      name: String(user.user_metadata?.name ?? user.email ?? "User"),
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

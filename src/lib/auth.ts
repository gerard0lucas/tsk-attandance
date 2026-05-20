/** Demo auth — replace with Supabase signIn when backend is ready */

export const DEMO_ADMIN = {
  id: "admin-1",
  email: "admin@tsk.org",
  name: "System Administrator",
  password: "admin123",
} as const;

export const DEFAULT_MANAGER_PASSWORD = "manager123";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

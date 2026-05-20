import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { DEMO_ADMIN, DEFAULT_MANAGER_PASSWORD } from "../lib/auth";
import type { UserRole } from "../types";

const dashboardPath: Record<UserRole, string> = {
  admin: "/admin",
  manager: "/manager",
};

export function LoginPage() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter email and password.");
      setLoading(false);
      return;
    }

    const result = login(trimmedEmail, trimmedPassword);
    setLoading(false);

    if (result.ok) {
      navigate(dashboardPath[result.role], { replace: true });
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-page px-4 py-8">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-cerulean">TSK Attendance</h1>
          <p className="mt-2 text-mist">Sign in with your account</p>
        </div>

        <div className="rounded border border-morning bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-cerulean">Login</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@tsk.org"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />

            {error && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 space-y-2 border-t border-morning pt-4 text-xs text-mist">
            <p className="font-medium text-cerulean">Demo accounts (tap to fill)</p>
            <button
              type="button"
              onClick={() => {
                setEmail(DEMO_ADMIN.email);
                setPassword(DEMO_ADMIN.password);
                setError("");
              }}
              className="w-full rounded border border-mist/40 bg-morning/40 px-3 py-2.5 text-left text-cerulean hover:bg-morning/70"
            >
              Admin — {DEMO_ADMIN.email} / {DEMO_ADMIN.password}
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("priya@tsk.org");
                setPassword(DEFAULT_MANAGER_PASSWORD);
                setError("");
              }}
              className="w-full rounded border border-mist/40 bg-morning/40 px-3 py-2.5 text-left text-cerulean hover:bg-morning/70"
            >
              Manager — priya@tsk.org / {DEFAULT_MANAGER_PASSWORD}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

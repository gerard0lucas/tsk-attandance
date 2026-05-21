import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminBranches } from "./pages/admin/AdminBranches";
import { AdminManagers } from "./pages/admin/AdminManagers";
import { AdminStudents } from "./pages/admin/AdminStudents";
import { ReportsPage } from "./pages/ReportsPage";
import { ManagerDashboard } from "./pages/manager/ManagerDashboard";
import { ManagerScan } from "./pages/manager/ManagerScan";
import { ManagerStudents } from "./pages/manager/ManagerStudents";
import { StudentQrPage } from "./pages/StudentQrPage";
import { useStore } from "./store/useStore";
import { useAppInit } from "./hooks/useAppInit";
import { useStoreHydrated } from "./hooks/useStoreHydrated";
import { isSupabaseConfigured } from "./lib/supabase";
import type { UserRole } from "./types";

function isValidRole(role: unknown): role is UserRole {
  return role === "admin" || role === "manager";
}

function AuthEntry() {
  const hydrated = useStoreHydrated();
  const session = useStore((s) => s.session);
  const logout = useStore((s) => s.logout);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page">
        <p className="text-mist">Loading…</p>
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page p-6">
        <div className="max-w-md rounded border border-morning bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-cerulean">Supabase not configured</h1>
          <p className="mt-2 text-sm text-mist">
            Copy <code className="text-cerulean">.env.example</code> to <code className="text-cerulean">.env</code> and
            add your project URL and anon key. Run <code className="text-cerulean">supabase/schema.sql</code> in the
            Supabase SQL editor, then create an admin user.
          </p>
        </div>
      </div>
    );
  }

  if (session && !isValidRole(session.role)) {
    void logout();
    return <LoginPage />;
  }

  if (session?.role === "admin") return <Navigate to="/admin" replace />;
  if (session?.role === "manager") return <Navigate to="/manager" replace />;

  return <LoginPage />;
}

export default function App() {
  useAppInit();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthEntry />} />
        <Route path="/login" element={<Navigate to="/" replace />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <DashboardLayout role="admin" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="branches" element={<AdminBranches />} />
          <Route path="managers" element={<AdminManagers />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="students/:studentId/qr" element={<StudentQrPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route
          path="/manager"
          element={
            <ProtectedRoute role="manager">
              <DashboardLayout role="manager" />
            </ProtectedRoute>
          }
        >
          <Route index element={<ManagerDashboard />} />
          <Route path="scan" element={<ManagerScan />} />
          <Route path="students" element={<ManagerStudents />} />
          <Route path="students/:studentId/qr" element={<StudentQrPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useStore } from "../../store/useStore";
import type { UserRole } from "../../types";
import { Button } from "../ui/Button";

const adminNav = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/temples", label: "Temples" },
  { to: "/admin/managers", label: "Managers" },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/reports", label: "Reports" },
];

const managerNav = [
  { to: "/manager", label: "Home", end: true },
  { to: "/manager/scan", label: "Scan" },
  { to: "/manager/students", label: "Students" },
  { to: "/manager/reports", label: "Reports" },
];

function NavItems({
  items,
  onNavigate,
  className,
}: {
  items: typeof adminNav;
  onNavigate?: () => void;
  className: string;
}) {
  return (
    <>
      {items.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `${className} ${isActive ? "bg-white/15 font-medium text-honey" : ""}`
          }
        >
          {label}
        </NavLink>
      ))}
    </>
  );
}

export function DashboardLayout({ role }: { role: UserRole }) {
  const session = useStore((s) => s.session);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = role === "admin" ? adminNav : managerNav;
  const subtitle = role === "admin" ? "Admin" : (session?.name ?? "Manager");

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const signOut = () => {
    logout();
    navigate("/");
  };

  const sideLinkClass =
    "flex items-center rounded px-3 py-2.5 text-sm text-morning hover:bg-white/10 min-h-[44px]";

  const bottomLinkClass =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs text-morning min-h-[56px]";

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-mist/30 bg-cerulean px-4 py-3 text-white pt-safe lg:hidden">
        <div className="min-w-0 pr-2">
          <p className="truncate font-semibold tracking-wide">TSK Attendance</p>
          <p className="truncate text-xs text-morning">{subtitle}</p>
        </div>
        <button
          type="button"
          aria-label="Open menu"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-white/10 hover:bg-white/20"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-cerulean/50 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,280px)] flex-col bg-cerulean text-white shadow-xl lg:hidden">
            <div className="flex items-center justify-between border-b border-mist/30 px-4 py-4">
              <div>
                <p className="font-semibold">Menu</p>
                <p className="text-xs text-morning">{session?.name}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded bg-white/10 hover:bg-white/20"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              <NavItems
                items={nav}
                onNavigate={() => setMenuOpen(false)}
                className={sideLinkClass}
              />
            </nav>
            <div className="border-t border-mist/30 p-4 pb-safe">
              <Button
                className="w-full !border-cerulean !bg-white !text-cerulean hover:!bg-morning min-h-[44px]"
                onClick={signOut}
              >
                Sign out
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-52 shrink-0 flex-col bg-cerulean text-white lg:flex">
        <div className="border-b border-mist/30 px-4 py-4">
          <p className="font-semibold tracking-wide">TSK Attendance</p>
          <p className="mt-1 text-xs text-morning">{subtitle}</p>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          <NavItems items={nav} className={sideLinkClass} />
        </nav>
        <div className="border-t border-mist/30 p-4">
          <p className="truncate text-sm text-morning">{session?.name}</p>
          <Button
            size="sm"
            className="mt-2 w-full !border-cerulean !bg-white !text-cerulean hover:!bg-morning min-h-[44px]"
            onClick={signOut}
          >
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-mist/30 bg-cerulean lg:hidden pb-safe">
        {nav.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${bottomLinkClass} ${isActive ? "bg-black/20 font-medium text-honey" : ""}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 overflow-x-hidden bg-page p-4 pb-24 lg:p-6 lg:pb-6">
        <div className="mx-auto w-full max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

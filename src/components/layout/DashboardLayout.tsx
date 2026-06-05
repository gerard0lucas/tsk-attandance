import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ClipboardList,
  Home,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  ScanLine,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import type { UserRole } from "../../types";
import { Button } from "../ui/Button";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  icon: LucideIcon;
};

const adminNav: NavItem[] = [
  { to: "/admin", label: "Overview", end: true, icon: LayoutDashboard },
  { to: "/admin/branches", label: "Branches", icon: Building2 },
  { to: "/admin/managers", label: "Managers", icon: UserCog },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/scan", label: "Scan", icon: ScanLine },
  { to: "/admin/attendance", label: "Attendance", icon: ClipboardList },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const managerNav: NavItem[] = [
  { to: "/manager", label: "Home", end: true, icon: Home },
  { to: "/manager/scan", label: "Scan", icon: ScanLine },
  { to: "/manager/students", label: "Students", icon: Users },
  { to: "/manager/users", label: "Users", icon: UserCog },
  { to: "/manager/attendance", label: "Attendance", icon: ClipboardList },
  { to: "/manager/reports", label: "Reports", icon: BarChart3 },
];

const userNav: NavItem[] = [
  { to: "/user", label: "Home", end: true, icon: Home },
  { to: "/user/scan", label: "Scan", icon: ScanLine },
  { to: "/user/students", label: "Students", icon: Users },
  { to: "/user/attendance", label: "Attendance", icon: ClipboardList },
  { to: "/user/reports", label: "Reports", icon: BarChart3 },
];

const MOBILE_PRIMARY_COUNT = 4;

function NavItems({
  items,
  onNavigate,
  className,
  showIcons,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  className: string;
  showIcons?: boolean;
}) {
  return (
    <>
      {items.map(({ to, label, end, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `${className} ${isActive ? "bg-white/15 font-medium text-honey" : ""}`
          }
        >
          {showIcons && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );
}

export function DashboardLayout({ role }: { role: UserRole }) {
  const session = useStore((s) => s.session);
  const dataLoading = useStore((s) => s.dataLoading);
  const actionError = useStore((s) => s.actionError);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav =
    role === "admin" ? adminNav : role === "manager" ? managerNav : userNav;
  const subtitle =
    role === "admin"
      ? "Admin"
      : role === "manager"
        ? (session?.name ?? "Manager")
        : (session?.name ?? "User");

  const mobilePrimary = nav.slice(0, MOBILE_PRIMARY_COUNT);
  const showMore = nav.length > MOBILE_PRIMARY_COUNT;

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
    void logout().then(() => navigate("/"));
  };

  const sideLinkClass =
    "flex items-center gap-3 rounded px-3 py-2.5 text-sm text-morning hover:bg-white/10 min-h-[44px]";

  const bottomLinkClass =
    "touch-target flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[10px] leading-tight text-morning min-h-[52px] max-[380px]:text-[9px] sm:text-[11px]";

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-mist/30 bg-cerulean px-3 py-2.5 text-white pt-safe sm:px-4 sm:py-3 lg:hidden">
        <div className="min-w-0 pr-2">
          <p className="truncate text-sm font-semibold tracking-wide sm:text-base">
            TSK Attendance
          </p>
          <p className="truncate text-[11px] text-morning sm:text-xs">{subtitle}</p>
        </div>
        <button
          type="button"
          aria-label="Open menu"
          className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded bg-white/10 hover:bg-white/20"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-cerulean/50 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,300px)] flex-col bg-cerulean text-white shadow-xl lg:hidden">
            <div className="flex items-center justify-between border-b border-mist/30 px-4 py-4 pt-safe">
              <div className="min-w-0">
                <p className="font-semibold">Menu</p>
                <p className="truncate text-xs text-morning">{session?.name}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white/10 hover:bg-white/20"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-3">
              <NavItems
                items={nav}
                onNavigate={() => setMenuOpen(false)}
                className={sideLinkClass}
                showIcons
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

      <aside className="hidden w-52 shrink-0 flex-col bg-cerulean text-white lg:flex">
        <div className="border-b border-mist/30 px-4 py-4">
          <p className="font-semibold tracking-wide">TSK Attendance</p>
          <p className="mt-1 text-xs text-morning">{subtitle}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          <NavItems items={nav} className={sideLinkClass} showIcons />
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

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-mist/30 bg-cerulean px-safe lg:hidden pb-safe"
        aria-label="Main navigation"
      >
        {mobilePrimary.map(({ to, label, end, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${bottomLinkClass} ${isActive ? "bg-black/20 font-medium text-honey" : ""}`
            }
          >
            <Icon className="h-5 w-5 shrink-0 max-[380px]:h-4 max-[380px]:w-4" aria-hidden />
            <span className="max-w-full truncate text-center">{label}</span>
          </NavLink>
        ))}
        {showMore && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`${bottomLinkClass} ${menuOpen ? "bg-black/20 text-honey" : ""}`}
            aria-label="More menu"
          >
            <MoreHorizontal className="h-5 w-5 shrink-0 max-[380px]:h-4 max-[380px]:w-4" />
            <span>More</span>
          </button>
        )}
      </nav>

      <main className="flex-1 overflow-x-hidden bg-page px-3 py-3 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] pt-1 sm:px-4 sm:py-4 sm:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:p-6 lg:pb-6">
        <div className="mx-auto w-full max-w-4xl min-w-0">
          {dataLoading && (
            <p className="mb-3 rounded border border-morning bg-white px-3 py-2 text-sm text-mist sm:mb-4">
              Syncing data…
            </p>
          )}
          {actionError && !dataLoading && (
            <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mb-4">
              {actionError}
            </p>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

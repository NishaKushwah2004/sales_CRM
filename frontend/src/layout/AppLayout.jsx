import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";
import { displayName, roleLabel } from "../lib/format";
import {
  IconAlert,
  IconBell,
  IconBuilding,
  IconClose,
  IconDashboard,
  IconDeals,
  IconLogout,
  IconMenu,
  IconTasks,
  IconUser,
} from "../components/icons";

function pageMeta(pathname, hash) {
  if (hash === "#past-due" && (pathname === "/" || pathname === "/dashboard")) {
    return {
      title: "Past Due",
      description: "Open deals that have passed their expected close date.",
    };
  }
  if (pathname === "/" || pathname === "/dashboard") {
    return {
      title: "Dashboard",
      description: "A server-calculated view of your accessible pipeline.",
    };
  }
  if (pathname === "/companies") {
    return {
      title: "Companies",
      description: "Active companies you are authorized to access.",
    };
  }
  if (pathname.startsWith("/companies/")) {
    return {
      title: "Company",
      description: "Company information, archive status, and associated deals.",
    };
  }
  if (pathname === "/deals") {
    return {
      title: "Deals",
      description: "Search and manage your accessible deals. Managers can see every deal.",
    };
  }
  if (pathname.startsWith("/deals/")) {
    return {
      title: "Deal",
      description: "Lifecycle, collaborators, tasks, notes, and history.",
    };
  }
  if (pathname === "/account") {
    return {
      title: "Profile",
      description: "Your account, role, and session.",
    };
  }
  return { title: "Sales CRM", description: "" };
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .get("/deals/alerts/past-due")
      .then((response) => {
        if (!active) return;
        setAlertCount(
          response.data.data.count ?? response.data.data.alerts.length,
        );
      })
      .catch(() => {
        if (active) setAlertCount(0);
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const meta = useMemo(
    () => pageMeta(location.pathname, location.hash),
    [location.pathname, location.hash],
  );

  const dashboardActive =
    location.pathname === "/" || location.pathname === "/dashboard";
  const pastDueActive = dashboardActive && location.hash === "#past-due";
  const onDealDetail = /^\/deals\/.+/.test(location.pathname);
  const tasksTo = onDealDetail ? `${location.pathname}#tasks` : "/deals#tasks";
  const tasksActive = location.hash === "#tasks";
  const dealsActive =
    (location.pathname === "/deals" || onDealDetail) && !tasksActive;

  const nav = (
    <>
      <NavLink
        to="/dashboard"
        className={() =>
          `nav-link ${dashboardActive && !pastDueActive ? "nav-link-active" : ""}`
        }
      >
        <IconDashboard />
        Dashboard
      </NavLink>
      <NavLink
        to="/companies"
        className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
      >
        <IconBuilding />
        Companies
      </NavLink>
      <NavLink
        to="/deals"
        className={() => `nav-link ${dealsActive && location.hash !== "#tasks" ? "nav-link-active" : ""}`}
      >
        <IconDeals />
        Deals
      </NavLink>
      <Link to={tasksTo} className={`nav-link ${tasksActive ? "nav-link-active" : ""}`}>
        <IconTasks />
        Tasks
      </Link>
      <Link
        to="/dashboard#past-due"
        className={`nav-link ${pastDueActive ? "nav-link-active" : ""}`}
      >
        <IconAlert />
        <span className="flex-1">Past Due</span>
        {alertCount > 0 && (
          <span className="badge badge-amber" aria-label={`${alertCount} past-due deals`}>
            {alertCount}
          </span>
        )}
      </Link>
    </>
  );

  const profileBlock = (
    <div className="border-t border-slate-200 pt-3">
      <NavLink
        to="/account"
        className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
      >
        <IconUser />
        <span className="min-w-0">
          <span className="block truncate">{displayName(user?.email)}</span>
          <span className="block text-xs font-normal text-slate-500">
            {roleLabel(user?.role)}
          </span>
        </span>
      </NavLink>
      <button className="nav-link mt-1 w-full" type="button" onClick={handleLogout}>
        <IconLogout />
        Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          aria-label="Close navigation"
          type="button"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white px-3 py-4 sidebar-enter lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              SC
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Sales CRM
              </span>
              <span className="block text-xs text-slate-500">Pipeline workspace</span>
            </span>
          </Link>
          <button
            className="btn btn-secondary px-2 py-1 lg:hidden"
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
          {nav}
        </nav>
        {profileBlock}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="btn btn-secondary px-2 py-1 lg:hidden"
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <IconMenu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-slate-900">
                  {meta.title}
                </h1>
                {meta.description && (
                  <p className="hidden truncate text-sm text-slate-500 sm:block">
                    {meta.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard#past-due"
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Past-due alerts"
              >
                <IconBell className="h-4 w-4" />
                {alertCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {alertCount}
                  </span>
                )}
              </Link>
              <Link
                to="/account"
                className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 no-underline hover:bg-slate-50 sm:flex"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                  {displayName(user?.email).slice(0, 1)}
                </span>
                <span className="pr-1 text-sm font-medium text-slate-700">
                  {displayName(user?.email)}
                </span>
              </Link>
            </div>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

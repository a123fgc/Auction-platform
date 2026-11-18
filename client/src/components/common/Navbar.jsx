import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Gavel } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-blue-50 text-blue-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-blue-700"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
            <Gavel size={25} strokeWidth={2.2} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Auction<span className="text-indigo-600">Hub</span>
          </span>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <NavLink to="/browse" className={navLinkClass}>
            Browse Auctions
          </NavLink>

          {/* Buyer only */}
          {user?.role === "buyer" && (
            <NavLink to="/my-bids" className={navLinkClass}>
              My Bids
            </NavLink>
          )}

          {/* Seller only */}
          {user?.role === "seller" && (
            <NavLink to="/seller/auctions" className={navLinkClass}>
              My Auctions
            </NavLink>
          )}

          {/* Admin Navigation */}
          {user?.role === "admin" && (
            <div className="flex flex-wrap items-center gap-1 rounded-xl  p-1">
              <NavLink to="/admin" end className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/users" className={navLinkClass}>
                Users
              </NavLink>
              <NavLink to="/admin/auctions" className={navLinkClass}>
                Auctions
              </NavLink>
            </div>
          )}
          {/* Settings — sirf logged-in users ke liye */}
          {/* {user && (
            <NavLink to="/settings" className={navLinkClass}>
              Settings
            </NavLink>
          )} */}

          {/* Authenticated User */}
          {user ? (
            <div className="ml-auto flex flex-wrap items-center gap-3 border-l border-slate-200 pl-3 sm:ml-2">
              {/* Avatar + Name (clickable → /settings) */}
              <Link
                to="/settings"
                className="flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-slate-100"
                aria-label="Open settings"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-100"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold uppercase text-blue-700">
                    {user.full_name?.charAt(0) || "U"}
                  </div>
                )}

                <div className="hidden sm:block">
                  <p className="max-w-36 truncate text-sm font-semibold text-slate-800">
                    {user.full_name}
                  </p>
                  <p className="text-xs capitalize text-slate-500">
                    {user.role}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-100 hover:text-blue-700"
                  }`
                }
              >
                Login
              </NavLink>

              <NavLink
                to="/signup"
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Get Started
              </NavLink>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

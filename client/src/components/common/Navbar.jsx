import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-brand-600">
          🔨 AuctionHub
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <NavLink to="/browse" className="hover:text-brand-600">
            Browse
          </NavLink>

          {(user?.role === 'buyer' || user?.role === 'admin') && (
            <NavLink to="/my-bids" className="hover:text-brand-600">
              My Bids
            </NavLink>
          )}
          {(user?.role === 'seller' || user?.role === 'admin') && (
            <NavLink to="/seller/auctions" className="hover:text-brand-600">
              My Auctions
            </NavLink>
          )}

          {user?.role === 'admin' && (
            <div className="flex items-center gap-2 rounded bg-slate-100 px-2 py-1 text-xs">
              <NavLink to="/admin" end className="hover:text-brand-600">
                Dashboard
              </NavLink>
              <span className="text-slate-300">|</span>
              <NavLink to="/admin/users" className="hover:text-brand-600">
                Users
              </NavLink>
              <span className="text-slate-300">|</span>
              <NavLink to="/admin/auctions" className="hover:text-brand-600">
                Auctions
              </NavLink>
            </div>
          )}

          {user ? (
            <>
              <span className="text-slate-500">Hi, {user.full_name}</span>
              <button
                onClick={handleLogout}
                className="rounded bg-slate-100 px-3 py-1 hover:bg-slate-200"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="hover:text-brand-600">
                Login
              </NavLink>
              <NavLink
                to="/signup"
                className="rounded bg-brand-600 px-3 py-1 text-white hover:bg-brand-700"
              >
                Sign up
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
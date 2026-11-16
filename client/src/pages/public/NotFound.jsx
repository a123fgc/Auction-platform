import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mt-20 text-center">
      <h1 className="text-4xl font-bold text-slate-800">404</h1>
      <p className="mt-2 text-slate-600">Page not found.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded bg-brand-600 px-4 py-2 text-white"
      >
        Go home
      </Link>
    </div>
  );
}
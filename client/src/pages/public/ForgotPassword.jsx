import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../../api/auth.api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-12 w-full max-w-md rounded-xl bg-white p-8 shadow">
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Forgot password?</h1>
      <p className="mb-6 text-sm text-slate-600">
        Enter your registered email and we'll send you a reset link.
      </p>

      {sent ? (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
          <p className="font-medium">Check your email</p>
          <p className="mt-1">
            If <strong>{email}</strong> is registered, a reset link has been sent.
            The link expires in 15 minutes.
          </p>
          <p className="mt-3 text-xs text-green-700">
            Didn't receive it? Check spam folder or{' '}
            <button
              onClick={() => setSent(false)}
              className="font-semibold underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-700 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        Remember your password?{' '}
        <Link to="/login" className="font-medium text-blue-700">
          Back to login
        </Link>
      </p>
    </div>
  );
}
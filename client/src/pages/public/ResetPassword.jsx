import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  resetPasswordApi,
  verifyResetTokenApi,
} from '../../api/auth.api';
import PasswordInput from '../../components/common/PasswordInput';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [status, setStatus] = useState('checking'); // checking | valid | invalid | success
  const [reason, setReason] = useState('');
  const [form, setForm] = useState({ new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setReason('Missing token');
      return;
    }
    verifyResetTokenApi(token)
      .then(() => setStatus('valid'))
      .catch((err) => {
        setStatus('invalid');
        setReason(err.message || 'Invalid or expired link');
      });
  }, [token]);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.new_password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.new_password.length < 6) {
      setError('Password must be at least 12 characters');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordApi(token, form.new_password);
      setStatus('success');
      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-12 w-full max-w-md rounded-xl bg-white p-8 shadow">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Reset password</h1>

      {status === 'checking' && (
        <p className="text-sm text-slate-600">Verifying link...</p>
      )}

      {status === 'invalid' && (
        <div className="space-y-4">
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">
            {reason || 'This link is invalid or has expired.'}
          </div>
          <p className="text-sm text-slate-600">
            Request a new link from the{' '}
            <Link to="/forgot-password" className="font-medium text-blue-700">
              Forgot password
            </Link>{' '}
            page.
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="rounded bg-green-50 p-3 text-sm text-green-800">
            ✅ Your password has been reset. Redirecting to login...
          </div>
          <Link
            to="/login"
            className="inline-block rounded bg-blue-700 px-4 py-2 text-white"
          >
            Go to login now
          </Link>
        </div>
      )}

      {status === 'valid' && (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">New password</label>
            <PasswordInput
              name="new_password"
              value={form.new_password}
              onChange={onChange}
              minLength={12}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Confirm password
            </label>
            <PasswordInput
              name="confirm"
              value={form.confirm}
              onChange={onChange}
              minLength={12}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-700 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link to="/login" className="font-medium text-blue-700">
          Back to login
        </Link>
      </p>
    </div>
  );
}
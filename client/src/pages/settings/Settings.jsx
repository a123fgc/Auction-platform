import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfileApi, changePasswordApi } from '../../api/profile.api';
import Toast from '../../components/common/Toast';

export default function Settings() {
  const { user, refresh } = useAuth();

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    location: user?.location || '',
    website: user?.website || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState(null);

  const [pwd, setPwd] = useState({ current_password: '', new_password: '' });
  const [changingPwd, setChangingPwd] = useState(false);

  const showToast = (msg, tone = 'success') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const onAvatarPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const onProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfileApi(form, avatarFile ? [avatarFile] : []);
      await refresh(); // updates AuthContext user (so Navbar avatar changes)
      showToast('Profile updated');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    setChangingPwd(true);
    try {
      await changePasswordApi(pwd.current_password, pwd.new_password);
      setPwd({ current_password: '', new_password: '' });
      showToast('Password changed');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {toast && <Toast message={toast.msg} tone={toast.tone} />}

      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile section */}
      <form
        onSubmit={onProfileSubmit}
        className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <h2 className="text-lg font-semibold">Profile</h2>

        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100">
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <label className="cursor-pointer rounded border px-3 py-1 text-sm">
              Change photo
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarPick}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-xs text-slate-500">JPG, PNG or WEBP. Max 5MB.</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Full name</label>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Bio</label>
          <textarea
            rows={4}
            maxLength={500}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Tell others a bit about yourself..."
          />
          <p className="mt-1 text-xs text-slate-500">{form.bio.length}/500</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Website</label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="https://example.com"
          />
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="rounded bg-brand-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {savingProfile ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      {/* Password section */}
      <form
        onSubmit={onPasswordSubmit}
        className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <h2 className="text-lg font-semibold">Change password</h2>

        <div>
          <label className="mb-1 block text-sm font-medium">Current password</label>
          <input
            type="password"
            required
            value={pwd.current_password}
            onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">New password</label>
          <input
            type="password"
            required
            minLength={6}
            value={pwd.new_password}
            onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={changingPwd}
          className="rounded bg-brand-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {changingPwd ? 'Updating...' : 'Change password'}
        </button>
      </form>
    </div>
  );
}
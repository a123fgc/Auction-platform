import { useEffect, useMemo, useState } from 'react';
import { listCategoriesApi } from '../../api/auction.api';

function toLocalInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AuctionForm({
  initial,
  onSubmit,
  submitLabel = 'Save',
}) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    starting_price: initial?.starting_price ?? '',
    min_increment: initial?.min_increment ?? 1,
    category_id: initial?.category_id || '',
    ends_at: toLocalInput(initial?.ends_at || new Date(Date.now() + 86400000)),
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listCategoriesApi().then(setCategories).catch(() => {});
  }, []);

  const previewFiles = useMemo(
    () => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [files]
  );

  useEffect(() => {
    return () => {
      previewFiles.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previewFiles]);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onFiles = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length > 3) {
      setError('Max 3 images');
      return;
    }
    setFiles(list);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(
        {
          ...form,
          category_id: form.category_id || null,
          ends_at: new Date(form.ends_at).toISOString(),
        },
        files
      );
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          name="title"
          required
          minLength={3}
          value={form.title}
          onChange={onChange}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          name="description"
          required
          minLength={10}
          rows={5}
          value={form.description}
          onChange={onChange}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Starting price
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="starting_price"
            required
            value={form.starting_price}
            onChange={onChange}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Min increment
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            name="min_increment"
            required
            value={form.min_increment}
            onChange={onChange}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select
            name="category_id"
            value={form.category_id}
            onChange={onChange}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ends at</label>
          <input
            type="datetime-local"
            name="ends_at"
            required
            value={form.ends_at}
            onChange={onChange}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Images (max 3)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
          className="block w-full text-sm"
        />
        {previewFiles.length > 0 && (
          <div className="mt-2 flex gap-2">
            {previewFiles.map((p) => (
              <img
                key={p.url}
                src={p.url}
                alt=""
                className="h-16 w-16 rounded object-cover"
              />
            ))}
          </div>
        )}
        {!files.length && initial?.images?.length > 0 && (
          <div className="mt-2 flex gap-2">
            {initial.images.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                className="h-16 w-16 rounded object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
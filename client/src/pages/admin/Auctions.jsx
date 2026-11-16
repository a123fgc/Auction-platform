import { useEffect, useState } from 'react';
import {
  listAdminAuctionsApi,
  closeAuctionApi,
  removeAuctionApi,
} from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import Toast from '../../components/common/Toast';
import Countdown from '../../components/auction/Countdown';
import { formatPrice, formatDate } from '../../utils/format';
import useDebounce from '../../hooks/useDebounce';

const LIMIT = 20;

export default function Auctions() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    listAdminAuctionsApi({
      page,
      limit: LIMIT,
      search: debounced || undefined,
      status: status || undefined,
    })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, status]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status]);

  const showToast = (msg, tone = 'success') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };

  const onClose = async (a) => {
    if (!window.confirm(`Force-close "${a.title}" now?`)) return;
    try {
      await closeAuctionApi(a.id);
      showToast(`Closed "${a.title}"`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const onRemove = async (a) => {
    if (
      !window.confirm(
        `Permanently DELETE "${a.title}" and all its bids? This cannot be undone.`
      )
    )
      return;
    try {
      await removeAuctionApi(a.id);
      showToast(`Removed "${a.title}"`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} tone={toast.tone} />}
      <h1 className="mb-4 text-2xl font-bold">Auctions</h1>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : data.data.length === 0 ? (
        <p className="py-12 text-center text-slate-500">No auctions found.</p>
      ) : (
        <div className="space-y-3">
          {data.data.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-semibold">{a.title}</div>
                <div className="text-sm text-slate-500">
                  {a.users?.full_name} · {formatPrice(a.current_price)} ·{' '}
                  <span className="uppercase">{a.status}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Created {formatDate(a.created_at)} ·{' '}
                  <Countdown endsAt={a.ends_at} />
                </div>
              </div>
              <div className="flex gap-2">
                {a.status === 'active' && (
                  <button
                    onClick={() => onClose(a)}
                    className="rounded bg-amber-50 px-3 py-1 text-sm text-amber-700"
                  >
                    Force close
                  </button>
                )}
                <button
                  onClick={() => onRemove(a)}
                  className="rounded bg-red-50 px-3 py-1 text-sm text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        total={data.total}
        limit={LIMIT}
        onPageChange={setPage}
      />
    </div>
  );
}
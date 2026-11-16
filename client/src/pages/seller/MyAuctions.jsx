
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { myAuctionsApi, cancelAuctionApi } from '../../api/seller.api';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import Countdown from '../../components/auction/Countdown';
import { formatPrice } from '../../utils/format';

const LIMIT = 12;

export default function MyAuctions() {
  const [data, setData] = useState({ data: [], total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    myAuctionsApi({ page, limit: LIMIT, status })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, status]);

  const onCancel = async (id) => {
    if (!window.confirm('Cancel this auction?')) return;

    try {
      await cancelAuctionApi(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Auctions</h1>

        <Link
          to="/seller/auctions/new"
          className="rounded bg-brand-600 px-4 py-2 text-white"
        >
          + New auction
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {['active', 'ended', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded px-3 py-1 text-sm ${
              status === s
                ? 'bg-brand-600 text-white'
                : 'bg-white ring-1 ring-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : data.data.length === 0 ? (
        <p className="py-12 text-center text-slate-500">
          No auctions yet.
        </p>
      ) : (
        <div className="space-y-3">
          {data.data.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {a.images?.[0] ? (
                  <img
                    src={a.images[0]}
                    alt=""
                    className="h-16 w-16 rounded object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded bg-slate-100" />
                )}

                <div>
                  <Link
                    to={`/auctions/${a.id}`}
                    className="font-semibold hover:text-brand-600"
                  >
                    {a.title}
                  </Link>

                  <div className="text-sm text-slate-500">
                    {formatPrice(a.current_price)} ·{' '}
                    {a.status === 'active' ? (
                      <Countdown endsAt={a.ends_at} />
                    ) : (
                      a.status
                    )}
                  </div>

                  {/* Ended auction winner information */}
                  {a.status === 'ended' && (
                    <div className="text-xs text-slate-500">
                      {a.winner_id
                        ? 'Sold — winner notified'
                        : 'Ended without bids'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {a.status === 'active' && (
                  <>
                    <Link
                      to={`/seller/auctions/${a.id}/edit`}
                      className="rounded border px-3 py-1 text-sm"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => onCancel(a.id)}
                      className="rounded bg-red-50 px-3 py-1 text-sm text-red-700"
                    >
                      Cancel
                    </button>
                  </>
                )}
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

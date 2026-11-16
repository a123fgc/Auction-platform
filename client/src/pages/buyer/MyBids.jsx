import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { myBidsApi } from '../../api/bid.api';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import Countdown from '../../components/auction/Countdown';
import { formatPrice } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

const LIMIT = 20;

export default function MyBids() {
  const { user } = useAuth();
  const [data, setData] = useState({ data: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    myBidsApi({ page, limit: LIMIT })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold">My Bids</h1>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : data.data.length === 0 ? (
        <p className="py-12 text-center text-slate-500">No bids yet.</p>
      ) : (
        <div className="space-y-3">
          {data.data.map((b) => {
            const a = b.auctions;
            const isWinner =
              a?.status === 'ended' && a?.winner_id === user?.id;
            const isHighest =
              a?.status === 'active' &&
              Number(a.current_price) === Number(b.amount);
            return (
              <div
                key={b.id}
                className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  {a?.images?.[0] ? (
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
                      to={`/auctions/${a?.id}`}
                      className="font-semibold hover:text-brand-600"
                    >
                      {a?.title || 'Auction'}
                    </Link>
                    <div className="text-sm text-slate-500">
                      Your bid: {formatPrice(b.amount)} · Current:{' '}
                      {formatPrice(a?.current_price)}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  {a?.status === 'active' ? (
                    <>
                      <Countdown endsAt={a.ends_at} />
                      {isHighest ? (
                        <div className="mt-1 text-xs font-medium text-green-600">
                          You're highest
                        </div>
                      ) : (
                        <div className="mt-1 text-xs font-medium text-amber-600">
                          Outbid
                        </div>
                      )}
                    </>
                  ) : isWinner ? (
                    <div className="text-xs font-medium text-green-600">
                      🏆 You won!
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      {a?.status?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
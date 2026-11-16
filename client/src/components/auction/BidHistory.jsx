import { useEffect, useState } from 'react';
import { listAuctionBidsApi } from '../../api/bid.api';
import { formatPrice, formatDate } from '../../utils/format';
import Loader from '../common/Loader';

export default function BidHistory({ auctionId, refreshKey = 0 }) {
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAuctionBidsApi(auctionId, { page: 1, limit: 20 })
      .then((res) => !cancelled && setData(res))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [auctionId, refreshKey]);

  if (loading) return <Loader label="Loading bids..." />;
  if (!data.data.length)
    return <p className="py-4 text-sm text-slate-500">No bids yet.</p>;

  return (
    <ul className="divide-y divide-slate-100">
      {data.data.map((b, i) => (
        <li key={b.id} className="flex items-center justify-between py-2 text-sm">
          <div>
            <span className="font-medium">
              {b.users?.full_name || 'Anonymous'}
            </span>
            {i === 0 && (
              <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                Highest
              </span>
            )}
            <div className="text-xs text-slate-500">{formatDate(b.created_at)}</div>
          </div>
          <span className="font-semibold text-brand-600">
            {formatPrice(b.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
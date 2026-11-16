import { useEffect, useState } from 'react';
import { getStatsApi } from '../../api/admin.api';
import StatCard from '../../components/admin/StatCard';
import Loader from '../../components/common/Loader';
import { formatPrice, formatDate } from '../../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStatsApi()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="text-red-700">{error}</div>;
  if (!data) return <Loader />;

  const { overview, recentAuctions, recentBids } = data;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={overview.totalUsers} />
        <StatCard
          label="Suspended"
          value={overview.suspendedUsers}
          accent="red"
        />
        <StatCard label="Total auctions" value={overview.totalAuctions} />
        <StatCard
          label="Active auctions"
          value={overview.activeAuctions}
          accent="green"
        />
        <StatCard label="Ended auctions" value={overview.endedAuctions} />
        <StatCard label="Total bids" value={overview.totalBids} accent="amber" />
        <StatCard
          label="Total revenue"
          value={formatPrice(overview.totalRevenue)}
          accent="green"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 font-semibold">Recent auctions</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {recentAuctions.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-slate-500">
                    {a.users?.full_name} · {formatDate(a.created_at)}
                  </div>
                </div>
                <span className="text-xs uppercase text-slate-500">
                  {a.status}
                </span>
              </li>
            ))}
            {!recentAuctions.length && (
              <li className="py-2 text-slate-500">No auctions yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 font-semibold">Recent bids</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {recentBids.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">
                    {b.users?.full_name} → {b.auctions?.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(b.created_at)}
                  </div>
                </div>
                <span className="font-semibold text-brand-600">
                  {formatPrice(b.amount)}
                </span>
              </li>
            ))}
            {!recentBids.length && (
              <li className="py-2 text-slate-500">No bids yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
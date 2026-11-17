import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';

export default function BidForm({
  auction,
  onBid,
  isEnded,
  isSeller,
  liveCurrentPrice,
}) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPrice = liveCurrentPrice ?? Number(auction.current_price);
  const minBid = useMemo(
    () => currentPrice + Number(auction.min_increment),
    [currentPrice, auction.min_increment]
  );

  if (!user) {
    return (
      <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
        <a href="/login" className="font-medium text-brand-600">
          Login
        </a>{' '}
        to place a bid.
      </div>
    );
  }
  if (isSeller) {
    return (
      <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
        You cannot bid on your own auction.
      </div>
    );
  }
  if (user.role !== 'buyer' ) {
    return (
      <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
        Only buyers can bid.
      </div>
    );
  }
  if (isEnded) {
    return (
      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        Auction has ended.
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onBid(Number(amount));
      setAmount('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickBid = () => {
    setAmount(String(minBid.toFixed(2)));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && (
        <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}
      <div className="text-sm text-slate-600">
        Minimum next bid:{' '}
        <span className="font-semibold text-slate-800">
          {formatPrice(minBid)}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min={minBid}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`${minBid.toFixed(2)} or more`}
          className="flex-1 rounded border border-slate-300 px-3 py-2"
          required
        />
        <button
          type="button"
          onClick={quickBid}
          className="rounded border px-3 py-2 text-sm"
        >
          Min
        </button>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-brand-600 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? 'Placing bid...' : 'Place bid'}
      </button>
    </form>
  );
}
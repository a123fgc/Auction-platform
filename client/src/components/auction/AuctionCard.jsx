import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/format';
import Countdown from './Countdown';

export default function AuctionCard({ auction }) {
  const cover = auction.images?.[0];

  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
    >
      <div className="aspect-video overflow-hidden bg-slate-100">
        {cover ? (
          <img
            src={cover}
            alt={auction.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-semibold text-slate-800">
          {auction.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {auction.categories?.name || 'Uncategorized'}
        </p>
        <div className="mt-auto pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-brand-600">
              {formatPrice(auction.current_price)}
            </span>
            <Countdown endsAt={auction.ends_at} />
          </div>
        </div>
      </div>
    </Link>
  );
}
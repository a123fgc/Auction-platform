import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAuctionApi } from '../../api/auction.api';
import { placeBidApi } from '../../api/bid.api';
import ImageGallery from '../../components/auction/ImageGallery';
import Countdown from '../../components/auction/Countdown';
import BidForm from '../../components/auction/BidForm';
import BidHistory from '../../components/auction/BidHistory';
import Loader from '../../components/common/Loader';
import { formatPrice, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import useAuctionSocket from '../../hooks/useAuctionSocket';

export default function AuctionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [livePrice, setLivePrice] = useState(null);
  const [refreshBids, setRefreshBids] = useState(0);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(Date.now());
  const toastTimer = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAuctionApi(id)
      .then((a) => !cancelled && setAuction(a))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useAuctionSocket(id, {
    onNewBid: (payload) => {
      setLivePrice(payload.currentPrice);
      setAuction((a) =>
        a
          ? {
              ...a,
              current_price: payload.currentPrice,
              ends_at: payload.endsAt,
            }
          : a
      );
      setRefreshBids((n) => n + 1);
      if (payload.bid.bidderId === user?.id) {
        showToast('Your bid is now the highest!');
      } else {
        showToast('New bid placed');
      }
    },

    onAuctionUpdate: (payload) => {
      setLivePrice(payload.currentPrice);
      setAuction((a) =>
        a
          ? {
              ...a,
              current_price: payload.currentPrice,
              ends_at: payload.endsAt,
            }
          : a
      );
    },

    // ▼▼▼ THIS IS THE BLOCK YOU ASKED ABOUT ▼▼▼
    onAuctionEnded: (payload) => {
      setAuction((a) =>
        a
          ? {
              ...a,
              status: 'ended',
              winner_id: payload.winnerId,
              current_price: payload.finalPrice,
            }
          : a
      );
      setLivePrice(payload.finalPrice);
      setRefreshBids((n) => n + 1);
      if (payload.winnerId === user?.id) {
        showToast('🏆 You won this auction!');
      } else if (!payload.winnerId) {
        showToast('Auction ended without a winner');
      } else {
        showToast('Auction ended');
      }
    },
    // ▲▲▲ END OF THE BLOCK ▲▲▲
  });

  if (loading) return <Loader />;
  if (error)
    return (
      <div className="rounded bg-red-50 p-4 text-red-700">
        {error} — <Link to="/browse">back to browse</Link>
      </div>
    );
  if (!auction) return null;

  const isSeller = auction.seller_id === user?.id;
  const isEnded =
    auction.status !== 'active' ||
    new Date(auction.ends_at).getTime() <= now;

  const handleBid = async (amount) => {
    await placeBidApi(id, amount);
    setLivePrice(amount);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded bg-slate-800 px-4 py-2 text-sm text-white shadow">
          {toast}
        </div>
      )}

      <ImageGallery images={auction.images} />

      <div>
        <h1 className="text-2xl font-bold">{auction.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {auction.categories?.name || 'Uncategorized'} · by{' '}
          {auction.users?.full_name || 'seller'}
        </p>

        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Current bid</div>
          <div className="text-3xl font-bold text-brand-600">
            {formatPrice(livePrice ?? auction.current_price)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Starting: {formatPrice(auction.starting_price)} · Increment:{' '}
            {formatPrice(auction.min_increment)}
          </div>
          <div className="mt-3">
            <Countdown endsAt={auction.ends_at} className="text-base" />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Ends {formatDate(auction.ends_at)}
          </div>

          {/* Result banner (shown after auction ends) */}
          {isEnded && (
            <div
              className={`mt-4 rounded-lg p-3 text-sm ${
                auction.winner_id === user?.id
                  ? 'bg-green-50 text-green-800'
                  : auction.winner_id
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-yellow-50 text-yellow-800'
              }`}
            >
              {auction.winner_id
                ? auction.winner_id === user?.id
                  ? '🏆 You won this auction! The seller will contact you.'
                  : 'This auction has ended. Winner has been notified.'
                : 'This auction ended without any bids.'}
            </div>
          )}

          <div className="mt-4">
            <BidForm
              auction={auction}
              onBid={handleBid}
              isEnded={isEnded}
              isSeller={isSeller}
              liveCurrentPrice={livePrice ?? auction.current_price}
            />
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 font-semibold">Description</h2>
          <p className="whitespace-pre-line text-slate-700">
            {auction.description}
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 font-semibold">Bid history</h2>
          <BidHistory auctionId={id} refreshKey={refreshBids} />
        </div>
      </div>
    </div>
  );
}
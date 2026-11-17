import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, X, AlertTriangle } from "lucide-react";

import { myBidsApi ,deleteBidApi } from "../../api/bid.api";
import Loader from "../../components/common/Loader";
import Pagination from "../../components/common/Pagination";
import Countdown from "../../components/auction/Countdown";
import { formatPrice } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
// import { myBidsApi,  } from "../../api/bid.api";

const LIMIT = 20;

export default function MyBids() {
  const { user } = useAuth();

  const [data, setData] = useState({ data: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedBid, setSelectedBid] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    myBidsApi({ page, limit: LIMIT })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  // Open delete confirmation
  const handleDeleteClick = (bid) => {
  setSelectedBid(bid);
  setShowDeleteModal(true);
};

  const handleDelete = async () => {
    if (!selectedBid) return;

    try {
      setDeleting(true);
      setError("");

      await deleteBidApi(selectedBid.id);

      // Remove deleted bid from the current frontend list
      setData((prev) => ({
        ...prev,
        data: prev.data.filter((bid) => bid.id !== selectedBid.id),
        total: Math.max(0, prev.total - 1),
      }));

      setShowDeleteModal(false);
      setSelectedBid(null);

      // Move to previous page if current page becomes empty
      if (data.data.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to delete bid.",
      );
    } finally {
      setDeleting(false);
    }
  };

  // Edit bid - navigate to auction page
  const handleEdit = (bid) => {
    window.location.href = `/auctions/${bid.auctions?.id}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Bids
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track and manage your auction bidding activity.
          </p>
        </div>

        <div className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
          Total Bids: <span className="text-slate-900">{data.total}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={17} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <Loader />
      ) : data.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Pencil size={24} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-800">No bids yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Your auction bidding activity will appear here.
          </p>
          <Link
            to="/browse"
            className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Browse Auctions
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data.data.map((b) => {
            const a = b.auctions;

            const isWinner = a?.status === "ended" && a?.winner_id === user?.id;

            const isHighest =
              a?.status === "active" &&
              Number(a.current_price) === Number(b.amount);

            return (
              <div
                key={b.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Auction Details */}
                  <div className="flex min-w-0 items-center gap-4">
                    {a?.images?.[0] ? (
                      <img
                        src={a.images[0]}
                        alt={a?.title || "Auction"}
                        className="h-20 w-20 shrink-0 rounded-lg border border-slate-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                        No Image
                      </div>
                    )}

                    <div className="min-w-0">
                      <Link
                        to={`/auctions/${a?.id}`}
                        className="block truncate font-semibold text-slate-900 transition hover:text-brand-600"
                      >
                        {a?.title || "Auction"}
                      </Link>

                      <div className="mt-2 space-y-1 text-sm text-slate-500">
                        <p>
                          Your Bid:{" "}
                          <span className="font-semibold text-slate-800">
                            {formatPrice(b.amount)}
                          </span>
                        </p>

                        <p>
                          Current Price:{" "}
                          <span className="font-semibold text-slate-800">
                            {formatPrice(a?.current_price)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex flex-col gap-3 sm:items-end">
                    <div className="text-sm sm:text-right">
                      {a?.status === "active" ? (
                        <>
                          <Countdown endsAt={a.ends_at} />

                          {isHighest ? (
                            <div className="mt-1 font-medium text-green-600">
                              You're highest
                            </div>
                          ) : (
                            <div className="mt-1 font-medium text-amber-600">
                              Outbid
                            </div>
                          )}
                        </>
                      ) : isWinner ? (
                        <div className="font-semibold text-green-600">
                          🏆 You won!
                        </div>
                      ) : (
                        <div className="font-medium text-slate-500">
                          {a?.status?.toUpperCase() || "UNKNOWN"}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(b)}
                        disabled={a?.status !== "active"}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(b)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6">
        <Pagination
          page={page}
          total={data.total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 size={22} className="text-red-600" />
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Delete this bid?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete your bid on{" "}
              <span className="font-semibold text-slate-800">
                {selectedBid.auctions?.title || "this auction"}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

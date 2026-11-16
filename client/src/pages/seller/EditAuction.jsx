import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuctionForm from '../../components/auction/AuctionForm';
import { getAuctionApi } from '../../api/auction.api';
import { updateAuctionApi } from '../../api/seller.api';
import Loader from '../../components/common/Loader';

export default function EditAuction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAuctionApi(id)
      .then(setAuction)
      .catch((err) => setError(err.message));
  }, [id]);

  const handleSubmit = async (payload, files) => {
    await updateAuctionApi(id, payload, files);
    navigate(`/auctions/${id}`);
  };

  if (error) return <div className="text-red-700">{error}</div>;
  if (!auction) return <Loader />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Edit Auction</h1>
      <AuctionForm
        initial={auction}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />
    </div>
  );
}
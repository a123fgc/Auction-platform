import { useNavigate } from 'react-router-dom';
import AuctionForm from '../../components/auction/AuctionForm';
import { createAuctionApi } from '../../api/seller.api';

export default function CreateAuction() {
  const navigate = useNavigate();

  const handleSubmit = async (payload, files) => {
    const auction = await createAuctionApi(payload, files);
    navigate(`/auctions/${auction.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create Auction</h1>
      <AuctionForm onSubmit={handleSubmit} submitLabel="Create auction" />
    </div>
  );
}
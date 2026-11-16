import { useEffect, useState } from 'react';
import { listAuctionsApi, listCategoriesApi } from '../../api/auction.api';
import AuctionCard from '../../components/auction/AuctionCard';
import AuctionFilters from '../../components/auction/AuctionFilters';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import useDebounce from '../../hooks/useDebounce';

const LIMIT = 12;

export default function Browse() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('ending_soon');
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listCategoriesApi().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    listAuctionsApi({
      page,
      limit: LIMIT,
      search: debouncedSearch || undefined,
      category: category || undefined,
      sort,
    })
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
  }, [debouncedSearch, category, sort, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, sort]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Browse Auctions</h1>
      <AuctionFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        sort={sort}
        onSortChange={setSort}
      />

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : data.data.length === 0 ? (
        <p className="py-12 text-center text-slate-500">No auctions found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.data.map((a) => (
            <AuctionCard key={a.id} auction={a} />
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
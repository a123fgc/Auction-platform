export default function AuctionFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  sort,
  onSortChange,
}) {
  return (
    <div className="mb-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-3">
      <input
        type="text"
        placeholder="Search auctions..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
      />
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
      >
        <option value="ending_soon">Ending soon</option>
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low → high</option>
        <option value="price_desc">Price: high → low</option>
      </select>
    </div>
  );
}
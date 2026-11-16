export default function StatCard({ label, value, accent = 'brand' }) {
  const accents = {
    brand: 'text-brand-600',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    slate: 'text-slate-700',
  };
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${accents[accent]}`}>{value}</div>
    </div>
  );
}
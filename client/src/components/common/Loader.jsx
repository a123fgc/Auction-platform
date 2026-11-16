export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      <span className="ml-3 text-slate-600">{label}</span>
    </div>
  );
}
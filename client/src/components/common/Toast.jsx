export default function Toast({ message, tone = 'info' }) {
  if (!message) return null;
  const tones = {
    info: 'bg-slate-800 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
  };
  return (
    <div
      className={`fixed right-4 top-4 z-50 rounded px-4 py-2 text-sm shadow ${tones[tone]}`}
    >
      {message}
    </div>
  );
}
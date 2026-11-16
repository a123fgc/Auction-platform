export function formatPrice(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString();
}

export function timeLeft(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return { expired: true, label: 'Ended', ms: 0 };
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label =
    d > 0
      ? `${d}d ${h}h`
      : h > 0
      ? `${h}h ${m}m`
      : m > 0
      ? `${m}m ${sec}s`
      : `${sec}s`;
  return { expired: false, label, ms };
}
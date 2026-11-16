import useCountdown from '../../hooks/useCountdown';

export default function Countdown({ endsAt, className = '' }) {
  const { label, expired } = useCountdown(endsAt);
  return (
    <span
      className={`font-mono text-sm ${
        expired ? 'text-red-600' : 'text-slate-600'
      } ${className}`}
    >
      {expired ? 'Ended' : `Ends in ${label}`}
    </span>
  );
}
import { useEffect, useState } from 'react';
import { timeLeft } from '../utils/format';

export default function useCountdown(endsAt) {
  const [state, setState] = useState(() => timeLeft(endsAt));

  useEffect(() => {
    setState(timeLeft(endsAt));
    const id = setInterval(() => {
      const next = timeLeft(endsAt);
      setState(next);
      if (next.expired) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return state;
}
import { useState, useEffect } from 'react';

/** Returns current time in ms; updates every 60s. Use for derived date/time to avoid Date.now() during render. */
export function useNowMs(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  return now;
}

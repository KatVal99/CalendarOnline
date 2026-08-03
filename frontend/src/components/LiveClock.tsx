import { useEffect, useState } from 'react';

export default function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('it-IT'));

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('it-IT')), 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="live-clock">{time}</span>;
}


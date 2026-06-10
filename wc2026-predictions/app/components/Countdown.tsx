'use client';

import { useEffect, useState } from 'react';

function format(ms: number): string {
  if (ms <= 0) return '';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;

  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${mins.toString().padStart(2, '0')}`;
  return `${mins} min`;
}

/** Shows "Coup d'envoi dans …" until kickoff, then nothing. */
export default function Countdown({ kickoffAt }: { kickoffAt: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;

  const remaining = new Date(kickoffAt).getTime() - now;
  if (remaining <= 0) return null;

  return (
    <span className="countdown" title="Temps avant le coup d'envoi">
      Coup d’envoi dans {format(remaining)}
    </span>
  );
}

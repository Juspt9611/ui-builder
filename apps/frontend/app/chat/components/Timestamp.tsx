'use client';

import { useEffect, useState } from 'react';

interface TimestampProps {
  iso: string;
}

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function Timestamp({ iso }: TimestampProps) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    setLabel(formatter.format(new Date(iso)));
  }, [iso]);

  return (
    <span suppressHydrationWarning className="text-[11px] text-zinc-400 dark:text-zinc-500">
      {label}
    </span>
  );
}

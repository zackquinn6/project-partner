import React from 'react';
import { useDatabaseHealth } from '@/hooks/useDatabaseHealth';

export const OutageBanner: React.FC = () => {
  const { isUnreachable } = useDatabaseHealth();

  if (!isUnreachable) {
    return null;
  }

  return (
    <>
      <div
        role="alert"
        className="fixed top-0 left-0 right-0 z-[260] w-full border-b border-destructive/40 bg-destructive px-4 py-2 text-center text-sm font-semibold text-destructive-foreground"
      >
        Outage Reported
      </div>
      <div className="h-9 shrink-0" aria-hidden />
    </>
  );
};

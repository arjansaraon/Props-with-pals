'use client';

import { ReactNode } from 'react';
import { Toaster } from './components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

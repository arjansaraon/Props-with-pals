'use client';

import { ReactNode } from 'react';
import { ToastProvider } from './components/toast';

export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

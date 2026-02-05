'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PoolError({ error, reset }: ErrorProps) {
  const params = useParams();
  const code = params?.code as string;

  useEffect(() => {
    console.error('Pool error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Failed to load pool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            We couldn&apos;t load the pool{code ? ` "${code}"` : ''}. The pool may not exist or there was a connection issue.
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button variant="outline" asChild className="w-full">
              <a href="/">
                <Home className="h-4 w-4 mr-2" />
                Go to home
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

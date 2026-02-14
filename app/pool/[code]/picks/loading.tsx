import { Skeleton } from '@/app/components/ui/skeleton';
import { Card, CardContent } from '@/app/components/ui/card';

export default function PicksLoading() {
  return (
    <div className="min-h-screen p-4">
      <main className="max-w-2xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>

        {/* Progress Skeleton */}
        <Card className="shadow-md mb-6">
          <CardContent className="py-4">
            <div className="flex justify-between items-center mb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>

        {/* Props List Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-md">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

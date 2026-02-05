import { redirect } from 'next/navigation';

/**
 * Legacy joined confirmation page - now redirects to picks.
 * Kept for backwards compatibility with bookmarked URLs.
 */
export default async function JoinedPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/pool/${code}/picks`);
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import ErrorScreen, { actionClass } from '@/components/ErrorScreen';

// Catches anything that throws while rendering a route. The root layout (fonts,
// theme) is still standing, so the live scene can run behind it.
export default function RouteError({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen title="Lost the trail." message="Something broke while loading this page.">
      {/* retry() refreshes the router and re-fetches the segment; reset() would
          only re-render the same failed result. */}
      <button type="button" onClick={() => retry()} className={actionClass}>
        Try again
      </button>
      <Link href="/" className={actionClass}>
        Back to the mountains
      </Link>
    </ErrorScreen>
  );
}

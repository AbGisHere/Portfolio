'use client';

import { useEffect } from 'react';
import ErrorScreen, { actionClass } from '@/components/ErrorScreen';
import { fontVariables } from './fonts';
import './globals.css';

// Last resort: the root layout itself failed, so this replaces it and brings
// its own <html>, fonts and styles. The engine stays off — it may be what
// broke — and the scene falls back to the recipes' skies as plain CSS.
export default function GlobalError({ error }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={fontVariables}>
      <body>
        <ErrorScreen
          live={false}
          title="Lost the trail."
          message="Something broke while loading the site."
        >
          {/* A full reload: the app shell is what failed, so re-rendering or
              refetching inside it can't recover. */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={actionClass}
          >
            Try again
          </button>
          {/* Likewise a full navigation, not a client-side one. */}
          <a href="/" className={actionClass}>
            Back to the mountains
          </a>
        </ErrorScreen>
      </body>
    </html>
  );
}

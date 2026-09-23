import Link from 'next/link';
import ErrorScreen, { actionClass } from '@/components/ErrorScreen';

// Next adds noindex to not-found responses itself.
export const metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <ErrorScreen title="Off the map." message="Nothing lives at this address.">
      <Link href="/" className={actionClass}>
        Back to the mountains
      </Link>
    </ErrorScreen>
  );
}

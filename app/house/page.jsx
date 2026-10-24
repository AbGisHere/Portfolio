import { notFound } from 'next/navigation';
import HouseExplorer from '@/components/HouseExplorer';

// (0.4.2) A dev-only route for looking round the house up close: a free
// camera inside and out (components/HouseExplorer.jsx). Not built for
// production, so it's never served, crawled or in the sitemap.
export const metadata = {
  title: 'House (dev)',
  description: 'A free camera round the house, for development only.',
  robots: { index: false, follow: false },
};

export default function House() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <HouseExplorer />;
}

'use client';

import SmoothScroll from '@/components/SmoothScroll';
import Hero from '@/components/Hero';
import Work from '@/components/Work';
import Proof from '@/components/Proof';
import Contact from '@/components/Contact';

export default function Home() {
  return (
    <SmoothScroll>
      <main>
        <Hero />
        <Work />
        <Proof />
        <Contact />
      </main>
    </SmoothScroll>
  );
}

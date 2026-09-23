'use client';

import ParticleField from './ParticleField';
import LiquidMesh from './LiquidMesh';
import SplitText from './SplitText';

export default function Hero() {
  return (
    <section className="hero section" id="top">
      <ParticleField />
      <LiquidMesh />

      <div className="hero-content">
        <span className="kicker">Abhinav Gupta / Software Engineer</span>
        <h1 className="hero-title">
          <SplitText as="span" trigger="load">
            I build interfaces
          </SplitText>
          <br />
          <SplitText as="span" trigger="load" delay={0.15}>
            that feel alive.
          </SplitText>
        </h1>
        <p className="hero-sub">
          Scroll to see how — every section on this page is real, running code, not a template.
        </p>
      </div>

      <div className="scroll-cue" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}

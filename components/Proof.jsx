'use client';

import SplitText from './SplitText';
import Reveal from './Reveal';

export default function Proof() {
  return (
    <section className="proof section" id="proof">
      <span className="kicker">Proof</span>
      <h2 className="section-title">
        <SplitText as="span">The longer record.</SplitText>
      </h2>
      <p className="proof-copy">
        Resume and dev log content is not wired up yet on this rebuild — the links below are
        placeholders until the real pages exist.
      </p>
      <Reveal className="proof-links">
        <a className="proof-link" href="#" aria-disabled="true">
          <span>Resume</span>
          <span className="proof-link-note">not yet linked</span>
        </a>
        <a className="proof-link" href="#" aria-disabled="true">
          <span>DevLog</span>
          <span className="proof-link-note">not yet linked</span>
        </a>
      </Reveal>
    </section>
  );
}

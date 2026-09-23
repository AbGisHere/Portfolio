'use client';

import SplitText from './SplitText';
import MagneticCard from './MagneticCard';
import Reveal from './Reveal';

// Placeholder — replace with real projects. Titles/descriptions below are
// intentionally generic so nothing here reads as a real claim.
const PROJECTS = [
  {
    index: '01',
    title: 'Project One',
    blurb: 'Replace with a real project title and one-line description.',
    stack: 'Stack / role',
  },
  {
    index: '02',
    title: 'Project Two',
    blurb: 'Replace with a real project title and one-line description.',
    stack: 'Stack / role',
  },
  {
    index: '03',
    title: 'Project Three',
    blurb: 'Replace with a real project title and one-line description.',
    stack: 'Stack / role',
  },
];

export default function Work() {
  return (
    <section className="work section" id="work">
      <span className="kicker">Work</span>
      <h2 className="section-title">
        <SplitText as="span">Selected builds.</SplitText>
      </h2>

      <Reveal className="work-grid">
        {PROJECTS.map((p) => (
          <MagneticCard key={p.index} className="work-card">
            <span className="work-card-index">{p.index}</span>
            <h3 className="work-card-title">{p.title}</h3>
            <p className="work-card-blurb">{p.blurb}</p>
            <span className="work-card-stack">{p.stack}</span>
          </MagneticCard>
        ))}
      </Reveal>
    </section>
  );
}

import Stage from '@/components/Stage';
import DescentTrack from '@/components/scroll/DescentTrack';
import { SITE } from './site';

// Server component: the heading and intro ship as real HTML, so the page has
// content before any script runs. They're visually hidden until the hero
// layer gives them a place in the scene. The scene itself is in the root
// layout (app/layout.jsx), so it persists across routes. The track gives the
// page its scroll length: scrolling through it draws the camera back.
export default function Home() {
  return (
    <Stage>
      <div className="visually-hidden">
        <h1>{SITE.name}</h1>
        <p>{SITE.description}</p>
      </div>
      <DescentTrack name="about" />
    </Stage>
  );
}

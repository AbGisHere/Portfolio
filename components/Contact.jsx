'use client';

import SplitText from './SplitText';

export default function Contact() {
  return (
    <section className="contact section" id="contact">
      <span className="kicker">Next</span>
      <h2 className="section-title">
        <SplitText as="span">Let&rsquo;s talk.</SplitText>
      </h2>
      <p className="contact-copy">Real contact details go here — placeholder until confirmed.</p>
      <a className="contact-cta" href="mailto:placeholder@example.com">
        placeholder@example.com
      </a>
      <footer className="contact-footer">© {new Date().getFullYear()} Abhinav Gupta</footer>
    </section>
  );
}

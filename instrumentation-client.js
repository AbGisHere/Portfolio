// Runs before the app (Next's client instrumentation). Polyfills for the
// older Safari the site supports (iOS 13 on, package.json "browserslist"):
// Next compiles the syntax down, but built-ins it doesn't bring are added
// here, only where missing.

// Array/String/typed-array .at(): Safari 15.4.
for (const C of [Array, String, Object.getPrototypeOf(Int8Array)]) {
  if (!C.prototype.at) {
    Object.defineProperty(C.prototype, 'at', {
      value(i) {
        const n = Math.trunc(i) || 0;
        const k = n < 0 ? this.length + n : n;
        return k < 0 || k >= this.length ? undefined : this[k];
      },
      writable: true,
      configurable: true,
    });
  }
}

// Object.hasOwn: Safari 15.4.
if (!Object.hasOwn) {
  Object.defineProperty(Object, 'hasOwn', {
    value: (o, k) => Object.prototype.hasOwnProperty.call(o, k),
    writable: true,
    configurable: true,
  });
}

// MediaQueryList add/removeEventListener('change'): Safari 14. Its
// prototype is taken from a real match: iOS 13 has no MediaQueryList global.
const mql = typeof window !== 'undefined' && window.matchMedia && Object.getPrototypeOf(window.matchMedia(''));
if (mql && !mql.addEventListener) {
  mql.addEventListener = function (type, fn) {
    if (type === 'change') this.addListener(fn);
  };
  mql.removeEventListener = function (type, fn) {
    if (type === 'change') this.removeListener(fn);
  };
}

// ResizeObserver: Safari 13.1. Where it's missing (iOS 13.0–13.3), a stand-in
// that reports each observed element once, then again on every window resize:
// enough for what the site watches (the page and its scroll tracks).
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    constructor(cb) {
      this.cb = cb;
      this.els = new Set();
      this.fire = () => {
        if (!this.els.size) return;
        this.cb([...this.els].map(target => ({ target, contentRect: target.getBoundingClientRect() })), this);
      };
    }
    observe(el) {
      if (!this.els.size) window.addEventListener('resize', this.fire);
      this.els.add(el);
      requestAnimationFrame(this.fire);
    }
    unobserve(el) {
      this.els.delete(el);
      if (!this.els.size) window.removeEventListener('resize', this.fire);
    }
    disconnect() {
      this.els.clear();
      window.removeEventListener('resize', this.fire);
    }
  };
}

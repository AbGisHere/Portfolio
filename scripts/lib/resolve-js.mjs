// Lets `node` import the components' plain ES modules as the bundler does:
// relative imports without an extension resolve to `.js`, and those files
// load as ES modules (package.json has no "type"). For the unit tests:
// `node --import ./scripts/lib/resolve-js.mjs --test …`.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(spec, ctx, next) {
    try {
      return next(spec, ctx);
    } catch (err) {
      if (err?.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(spec) && !/\.[cm]?jsx?$/.test(spec)) {
        return next(`${spec}.js`, ctx);
      }
      throw err;
    }
  },
  load(url, ctx, next) {
    return next(url, /\/components\/.*\.js$/.test(url) ? { ...ctx, format: 'module' } : ctx);
  },
});

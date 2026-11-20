/**
 * (0.5.16) Where the site chooses how a device gets to the picture (download
 * or compute), never what's drawn. One profile, read once; one function per
 * choice. Today every device gets the same answers but the connection's:
 * the device tiers (ROADMAP.md, "Device tiers", before 1.0.0) plug in here,
 * by GPU class, memory and cores, without touching the callers.
 */
let profile = null;

export function deviceProfile() {
  if (profile) return profile;
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const c = nav.connection;
  profile = {
    // A metered or slow link: downloads cost more than computing.
    slowLink: !!(c && (c.saveData || (c.effectiveType && c.effectiveType !== '4g'))),
    touch: typeof matchMedia !== 'undefined' && matchMedia('(hover: none) and (pointer: coarse)').matches,
    // (For the tiers; unused today.)
    memory: nav.deviceMemory ?? null,
    cores: nav.hardwareConcurrency ?? null,
    gpu: null,
  };
  return profile;
}

/** (0.5.16, H1) The house's lightmap: the shipped bake, or baked here. */
export function wantsShippedLightmap() {
  return !deviceProfile().slowLink;
}

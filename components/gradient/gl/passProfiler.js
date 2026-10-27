/** Opt-in diagnostics only. GPU results are polled on later frames, never waited on. */
export function createPassProfiler(gl, { capacity = 4096, maxPending = 8, sampleEvery = 17, gpu = true, now = () => performance.now() } = {}) {
  const ext = gpu ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null;
  const samples = [];
  let pending = [];
  let active = false;
  let frame = 0;
  let dropped = 0;
  let discarded = 0;
  let measurements = 0;
  const record = sample => {
    if (samples.length === capacity) samples.shift();
    samples.push(sample);
  };
  const clearPending = () => {
    for (const { query } of pending) gl.deleteQuery(query);
    pending = [];
  };
  return {
    frame(state) {
      frame++;
      if (ext && gl.getParameter(ext.GPU_DISJOINT_EXT)) {
        discarded += pending.length;
        clearPending();
      } else {
        pending = pending.filter(({ query, sample }) => {
          if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return true;
          sample.gpuMs = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
          gl.deleteQuery(query);
          return false;
        });
      }
      record({ frame, name: 'frame', ...state });
    },
    measure(name, fn) {
      // Nested measurements retain CPU timings without overlapping TIME_ELAPSED queries.
      const selected = measurements++ % sampleEvery === 0;
      const query = ext && selected && !active && pending.length < maxPending ? gl.createQuery() : null;
      if (ext && selected && !query) dropped++;
      const sample = { frame, name, cpuMs: 0, gpuMs: null };
      const start = now();
      if (query) { gl.beginQuery(ext.TIME_ELAPSED_EXT, query); active = true; }
      try { return fn(); }
      finally {
        if (query) {
          gl.endQuery(ext.TIME_ELAPSED_EXT);
          active = false;
          pending.push({ query, sample });
        }
        sample.cpuMs = now() - start;
        record(sample);
      }
    },
    snapshot() { return { gpuAvailable: !!ext, sampleEvery, pending: pending.length, dropped, discarded, samples: samples.map(s => ({ ...s })) }; },
    dispose() { clearPending(); },
  };
}

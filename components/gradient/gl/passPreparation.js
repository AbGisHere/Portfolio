/** Shader ownership and idle preparation, independent of scene detail. */
const releaseShaders = (gl, handle) => {
  for (const key of ['vs', 'fs']) {
    if (!handle[key]) continue;
    if (handle.prog) gl.detachShader(handle.prog, handle[key]);
    gl.deleteShader(handle[key]);
    handle[key] = null;
  }
};

export function disposePassProgram(gl, handle) {
  if (!handle || handle.disposed) return;
  releaseShaders(gl, handle);
  if (handle.prog) gl.deleteProgram(handle.prog);
  handle.prog = null;
  handle.disposed = true;
}

export function startPassProgram(gl, name, vs, fs) {
  const handle = { name, prog: null, vs: null, fs: null, ready: false, failed: false };
  try {
    handle.prog = gl.createProgram();
    if (!handle.prog) throw new Error('program allocation failed');
    for (const [key, type, source] of [['vs', gl.VERTEX_SHADER, vs], ['fs', gl.FRAGMENT_SHADER, fs]]) {
      handle[key] = gl.createShader(type);
      if (!handle[key]) throw new Error(`${key} allocation failed`);
      gl.shaderSource(handle[key], source);
      gl.compileShader(handle[key]);
      gl.attachShader(handle.prog, handle[key]);
    }
    gl.bindAttribLocation(handle.prog, 0, 'aPos');
    gl.linkProgram(handle.prog);
  } catch (err) {
    console.warn(`[atmosphere] the ${name} pass failed to start:`, err.message || 'no log');
    handle.failed = true;
    disposePassProgram(gl, handle);
  }
  return handle;
}

// Idle preparation polls; a pass required for the current picture waits for
// linking instead of temporarily omitting objects or effects from that picture.
export function pollPassProgram(gl, ext, handle, wait = false) {
  if (!handle || handle.failed || handle.disposed || !handle.prog) return null;
  if (handle.ready) return handle.prog;
  if (ext && !wait && !gl.getProgramParameter(handle.prog, ext.COMPLETION_STATUS_KHR)) return null;
  if (!gl.getProgramParameter(handle.prog, gl.LINK_STATUS)) {
    const logs = [gl.getProgramInfoLog(handle.prog),
      handle.vs && gl.getShaderInfoLog(handle.vs), handle.fs && gl.getShaderInfoLog(handle.fs)];
    console.warn(`[atmosphere] the ${handle.name} pass failed to link:`, ...logs.filter(Boolean));
    handle.failed = true;
    disposePassProgram(gl, handle);
    return null;
  }
  releaseShaders(gl, handle);
  handle.ready = true;
  return handle.prog;
}

// Polls unready handles non-blocking via COMPLETION_STATUS_KHR and returns
// the count of programs still compiling on background threads.
export function countInFlight(gl, ext, handles) {
  let count = 0;
  for (const h of handles) {
    if (!h.ready && !h.failed && !h.disposed) pollPassProgram(gl, ext, h, false);
    if (!h.ready && !h.failed && !h.disposed) count++;
  }
  return count;
}

/** Round-robin retries with 100ms backoff on pending compiles. */
export function createPreparationQueue({
  schedule,
  cancel,
  restore,
  onReady,
  canRun = () => true,
  backoff = (cb, ms) => setTimeout(cb, ms),
  clearBackoff = id => clearTimeout(id),
  backoffDelay = 100,
}) {
  const tasks = [];
  let scheduled = null;
  let backoffTimer = null;
  let disposed = false;
  const enqueue = () => {
    if (!disposed && scheduled === null && backoffTimer === null && tasks.length) {
      scheduled = schedule(run);
    }
  };
  const run = deadline => {
    scheduled = null;
    if (disposed || !canRun()) return;
    if (deadline && !deadline.didTimeout && typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() < 4) {
      return enqueue();
    }
    const task = tasks.shift();
    if (!task) return;
    let result;
    try {
      result = task();
    } catch (err) {
      console.warn('[atmosphere] preparation step failed:', err?.message || err);
      result = 'failed';
    } finally {
      restore();
    }
    if (result === 'pending') {
      tasks.push(task);
      if (!disposed && backoffTimer === null) {
        let fired = false;
        const timer = backoff(() => {
          fired = true;
          backoffTimer = null;
          enqueue();
        }, backoffDelay);
        if (!fired) backoffTimer = timer ?? true;
      }
      return;
    }
    if (result === 'done' || result === true) onReady();
    enqueue();
  };
  return {
    add(steps) {
      if (disposed) return;
      tasks.push(...steps);
      enqueue();
    },
    addFirst(steps) {
      if (disposed) return;
      tasks.unshift(...steps);
      enqueue();
    },
    resume: enqueue,
    dispose() {
      disposed = true;
      if (scheduled !== null) cancel(scheduled);
      if (backoffTimer !== null && backoffTimer !== true) clearBackoff(backoffTimer);
      scheduled = null;
      backoffTimer = null;
      tasks.length = 0;
    },
  };
}

/** A GPU milestone, polled with a zero timeout; never blocks the render loop. */
export function createGpuCompletion(gl) {
  let fence = null, key = null, state = 'idle';
  const reset = () => {
    if (fence) gl.deleteSync(fence);
    fence = null; key = null; state = 'idle';
  };
  return {
    get pending() { return state === 'pending'; },
    poll(nextKey) {
      if (gl.isContextLost()) { reset(); return 'failed'; }
      if (key !== nextKey) reset();
      if (state === 'idle') {
        key = nextKey;
        fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!fence) return (state = 'failed');
        gl.flush();
        state = 'pending';
        return state;
      }
      if (state !== 'pending') return state;
      const status = gl.clientWaitSync(fence, 0, 0);
      if (status === gl.TIMEOUT_EXPIRED) return 'pending';
      gl.deleteSync(fence); fence = null;
      return (state = status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED ? 'ready' : 'failed');
    },
    reset,
  };
}
